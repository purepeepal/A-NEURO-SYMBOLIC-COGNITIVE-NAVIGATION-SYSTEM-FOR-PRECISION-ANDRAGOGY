import { gemini } from '@/lib/llm'
import { questionCache } from '@/lib/llm'
import { v4 as uuidv4 } from 'uuid'
import { ConceptNode, PrerequisiteTree, MicroAnalysisResult, InvestigativeObjective } from '@/lib/llm/types'
import { STRATEGIES, NextQuestionParams } from './strategies'

export type SessionPhase = 'warmup' | 'calibration' | 'investigation'

export function getSessionPhase(questionsAnswered: number): SessionPhase {
    if (questionsAnswered < 2) return 'warmup'
    if (questionsAnswered < 5) return 'calibration'
    return 'investigation'
}

// Types
export interface AssessmentState {
    assessmentId: string
    topic: string
    currentDifficulty: number
    consecutiveCorrect: number
    consecutiveIncorrect: number
    questionsAnswered: number
    // Modular Flow State
    currentObjective?: string
    currentDeductionSpace?: any // Ideally typed DeductionSpace
    // NEW: Investigative context
    currentInvestigativeObjective?: InvestigativeObjective
    lastMicroAnalysis?: MicroAnalysisResult
    history: {
        questionId: string
        concept: string
        isCorrect: boolean
        objective?: string
        deduction?: any

        difficulty: number
        questionText?: string
    }[]
}

/**
 * Core Adaptive Engine Logic
 * Determines the next best question based on current state
 * Now with real-time investigative micro-analysis
 */
export class AssessmentEngine {

    /**
     * Determine the concept and difficulty for the next question
     * Enhanced with investigative micro-analysis for real-time adaptation
     */
    async getNextQuestionParams(state: AssessmentState): Promise<NextQuestionParams> {
        // 1. Fetch prerequisite structure
        const tree = await this.getTree(state.topic)

        // 2. Use cached micro-analysis if available (injected by flow.ts from evaluate),
        //    otherwise perform a fresh LLM call (fallback for direct /next calls)
        let microAnalysis: MicroAnalysisResult | null = state.lastMicroAnalysis ?? null
        const lastQuestion = state.history[state.history.length - 1]

        if (!microAnalysis && lastQuestion && state.questionsAnswered >= 3 && gemini.performMicroAnalysis) {
            try {
                microAnalysis = await gemini.performMicroAnalysis(
                    {
                        question_text: lastQuestion.questionText || '',
                        concept: lastQuestion.concept,
                        difficulty: lastQuestion.difficulty,
                        is_correct: lastQuestion.isCorrect,
                        objective: lastQuestion.objective,
                        deduction_space: state.currentDeductionSpace
                    },
                    state,
                    null // User persona fetched at flow level
                )
                // Store for reference
                state.lastMicroAnalysis = microAnalysis
            } catch (e) {
                console.error('Micro-analysis failed:', e)
                // Continue without micro-analysis
            }
        }

        // 3. Determine current concept
        let currentConceptNode: ConceptNode

        if (!lastQuestion) {
            // Find the simplest concept (Start at 1, or min difficulty)
            currentConceptNode = tree.concepts.sort((a: ConceptNode, b: ConceptNode) => a.difficulty - b.difficulty)[0]
        } else {
            // Identify current concept from history
            const lastConceptName = lastQuestion.concept
            currentConceptNode = tree.concepts.find((c: ConceptNode) => c.name === lastConceptName)
                || tree.concepts[0]

            // CHECK FOR MICRO-ANALYSIS GUIDED PIVOT
            if (microAnalysis?.adaptiveGuidance?.conceptPivot) {
                const pivotConcept = tree.concepts.find(
                    (c: ConceptNode) => c.name === microAnalysis?.adaptiveGuidance?.conceptPivot
                )
                if (pivotConcept) {
                    currentConceptNode = pivotConcept
                }
            } else {
                // BREADTH-FIRST SWEEP: Ensure all concepts are mapped before deep drilling
                const testedConceptNames = new Set(state.history.map(h => h.concept))
                const sortedConcepts = [...tree.concepts].sort((a, b) => a.difficulty - b.difficulty)

                const untestedConcepts = sortedConcepts.filter(c => !testedConceptNames.has(c.name))
                const conceptHistory = state.history.filter(h => h.concept === lastConceptName)

                const isMastered = conceptHistory.length >= 2 &&
                    conceptHistory.slice(-2).every(h => h.isCorrect) &&
                    conceptHistory[conceptHistory.length - 1].difficulty >= 7

                const shouldExplore = untestedConcepts.length > 0 &&
                    (lastQuestion.isCorrect || conceptHistory.length >= 2)

                if (shouldExplore) {
                    // Move to easiest untested concept
                    currentConceptNode = untestedConcepts[0]
                } else if (isMastered || conceptHistory.length >= 3) {
                    // If mastered or struggling too long, move to the next hardest concept
                    const currentIndex = sortedConcepts.findIndex(c => c.name === lastConceptName)
                    if (currentIndex !== -1 && currentIndex < sortedConcepts.length - 1) {
                        currentConceptNode = sortedConcepts[currentIndex + 1]
                    }
                }
            }
        }

        // 4. Select Strategy based on Objective Type and Investigation Mode
        // Use investigative strategy if we detect patterns warranting deeper probing
        let strategyType = currentConceptNode.type || 'conceptual'

        // Escalate to investigative mode under certain conditions
        if (microAnalysis?.anomalyDetected ||
            microAnalysis?.adaptiveGuidance?.urgency === 'probe_deeper' ||
            (state.questionsAnswered >= 8 && state.consecutiveIncorrect >= 2)) {
            strategyType = 'investigative' as any
        }

        const strategy = STRATEGIES[strategyType] || STRATEGIES['conceptual']

        // 5. Delegate to Strategy with micro-analysis context
        const params = await strategy.getNextParams(state, currentConceptNode, tree.concepts, microAnalysis)
        
        // 6. Enforce Session Phase difficulty constraints (Familiarity-First Onboarding)
        const phase = getSessionPhase(state.questionsAnswered)
        if (phase === 'warmup') {
            params.difficulty = Math.min(params.difficulty, 3)
        } else if (phase === 'calibration') {
            params.difficulty = Math.min(params.difficulty, 6)
        }

        return params
    }

    public async getTree(topic: string): Promise<PrerequisiteTree> {
        // 1. Try GraphRAG-backed assessment plan first (enriched with prerequisite ordering)
        try {
            const { getGraphRAGService } = await import('@/lib/kg/graphrag-service')
            const svc = getGraphRAGService()
            const plan = svc.getAssessmentPlan(topic)

            if (plan && plan.concepts.length > 0) {
                // Build PrerequisiteTree from GraphRAG assessment plan
                // This gives us topologically-sorted concepts with accurate prerequisites
                const kgTree: PrerequisiteTree = {
                    topic: plan.topic,
                    concepts: plan.concepts.map(c => ({
                        name: c.name,
                        difficulty: c.difficulty,
                        type: 'conceptual' as any,
                        prerequisites: c.prerequisites,
                        description: c.note || `Concept: ${c.name}`,
                    }))
                }
                // Cache the KG-backed tree
                await questionCache.setPrerequisiteTree(topic, kgTree)
                return kgTree
            }
        } catch (e) {
            console.error('[Engine] GraphRAG lookup failed, trying raw KG:', e)
        }

        // 2. Fallback to raw KG lookup (without GraphRAG service)
        try {
            const { getCurriculumGraph } = await import('@/lib/kg')
            const graph = getCurriculumGraph()
            const match = graph.findMatchingNode(topic)

            if (match) {
                const concepts = graph.getConceptsForAssessment(match.id)
                if (concepts.length > 0) {
                    const kgTree: PrerequisiteTree = {
                        topic: match.label,
                        concepts: concepts.map(c => {
                            const prereqs = graph.getPrerequisites(c.id)
                            return {
                                name: c.label,
                                difficulty: this.estimateKGDifficulty(c, graph),
                                type: 'conceptual' as any,
                                prerequisites: prereqs.map(p => p.node.label),
                                description: c.note || `Concept: ${c.label}`,
                            }
                        })
                    }
                    await questionCache.setPrerequisiteTree(topic, kgTree)
                    return kgTree
                }
            }
        } catch (e) {
            console.error('[Engine] Raw KG lookup also failed, falling back to LLM:', e)
        }

        // 3. Fall back to LLM-generated tree (only if topic is referenced in KG context)
        let tree = await questionCache.getPrerequisiteTree(topic)
        if (!tree) {
            tree = await gemini.generatePrerequisiteTree(topic)
            await questionCache.setPrerequisiteTree(topic, tree)

            // Enrich: tag LLM-generated concepts back into the KG
            try {
                const { getGraphRAGService } = await import('@/lib/kg/graphrag-service')
                const svc = getGraphRAGService()
                for (const concept of tree.concepts) {
                    svc.addLLMGeneratedNode(
                        concept.name,
                        'concept',
                        undefined,  // no parent node since LLM-generated
                        undefined,
                        concept.description
                    )
                }
            } catch { /* non-critical */ }
        }
        return tree
    }

    /**
     * Get GraphRAG context for a concept to inject into question generation prompts.
     * Returns a structured prompt snippet that grounds the LLM in curriculum knowledge.
     */
    public async getQuestionContext(concept: string): Promise<string | null> {
        try {
            const { getGraphRAGService } = await import('@/lib/kg/graphrag-service')
            const svc = getGraphRAGService()
            const ctx = svc.getQuestionContext(concept)
            return ctx?.promptSnippet || null
        } catch {
            return null
        }
    }

    /**
     * Estimate difficulty for a KG concept based on its depth and prerequisite count
     */
    private estimateKGDifficulty(node: any, graph: any): number {
        const ancestors = graph.getAncestors(node.id)
        const prereqs = graph.getPrerequisites(node.id)
        // Base difficulty from depth: deeper = harder
        const depthFactor = Math.min(ancestors.length * 2, 6)
        // More prerequisites = harder
        const prereqFactor = Math.min(prereqs.length, 4)
        return Math.max(1, Math.min(10, depthFactor + prereqFactor))
    }

    /**
     * Determine if the session should end based on performance and confidence
     * Enhanced with investigative intelligence
     */
    async shouldEndSession(state: AssessmentState): Promise<{ end: boolean; reason?: string }> {
        // 1. Minimum Length Check
        if (state.questionsAnswered < 5) {
            return { end: false }
        }

        // 2. Maximum Length Check (Safety cap, though "unlimited", we don't want infinite)
        if (state.questionsAnswered >= 50) {
            return { end: true, reason: "maximum_length_reached" }
        }

        // 3. Micro-analysis suggests investigation complete
        if (state.lastMicroAnalysis) {
            const urgency = state.lastMicroAnalysis.adaptiveGuidance?.urgency
            // If we're consistently in "normal" mode and have good data, we might have enough
            const recentHistory = state.history.slice(-5)
            const isStable = recentHistory.every(h => h.isCorrect) || recentHistory.every(h => !h.isCorrect)

            if (isStable && state.questionsAnswered >= 15) {
                return { end: true, reason: "pattern_stable_sufficient_data" }
            }
        }

        // 4. Frustration/Struggling Check
        if (state.consecutiveIncorrect >= 5) {
            return { end: true, reason: "struggling_persistently" }
        }

        // 5. Mastery Check
        if (state.consecutiveCorrect >= 8 && state.currentDifficulty >= 8) {
            return { end: true, reason: "mastery_demonstrated" }
        }

        // 6. Confidence-based ending (if we have enough investigative data)
        // If the last micro-analysis shows high confidence in our deductions
        if (state.questionsAnswered >= 12 && state.lastMicroAnalysis) {
            const avgConfidenceShift = Math.abs(state.lastMicroAnalysis.confidenceShift)
            // If confidence shifts are small, we've likely learned what we can
            if (avgConfidenceShift <= 2) {
                return { end: true, reason: "investigation_confidence_saturated" }
            }
        }

        return { end: false }
    }

    /**
     * Run Session Analysis
     */
    async analyzeSession(state: AssessmentState) {
        // Only analyze if we have enough history (e.g. 3+ questions)
        if (state.history.length < 3) return null

        return await gemini.analyzeSession(state.topic, state.history.map(h => ({
            question: "Question ID " + h.questionId, // Optimized to save tokens, or pass full text if available
            isCorrect: h.isCorrect,
            concept: h.concept,
            difficulty: h.difficulty
        })))
    }
}

export const assessmentEngine = new AssessmentEngine()
