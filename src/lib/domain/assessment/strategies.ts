// @ts-nocheck
// LEGACY: Intelligence ported into V2 engine.ts. Will be removed after Strangler Fig migration.
import { AssessmentState } from './engine'
import { ConceptNode, ObjectiveType, InvestigativeObjective, MicroAnalysisResult } from '@/lib/llm/types'
import { gemini } from '@/lib/llm'
import { estimateAbility, targetDifficulty, ResponseHistory } from './irt'
import { createLogger } from '@/lib/core/logger'
import { InvestigativeStrategy } from './investigative-strategy'

const logger = createLogger({ requestId: 'strategies' })

/** Compute IRT-based next difficulty from concept history */
function irtDifficulty(state: AssessmentState, concept: string, fallback: number): number {
    const history: ResponseHistory[] = state.history
        .filter(h => h.concept === concept)
        .map(h => ({ isCorrect: h.isCorrect, difficulty: h.difficulty }))

    if (history.length < 2) return fallback

    const estimate = estimateAbility(history)
    return Math.round(Math.max(1, Math.min(10, estimate.difficulty1to10)))
}

export interface NextQuestionParams {
    concept: string
    difficulty: number
    topic: string
    previousConcepts: string[]
    questionType?: 'mcq' | 'short_answer' | 'true_false'
    // NEW: Investigative context
    investigativeObjective?: InvestigativeObjective
    probingGuidance?: string
    distractorStrategy?: string
}

export interface AdaptiveStrategy {
    getNextParams(
        state: AssessmentState,
        currentConcept: ConceptNode,
        treeConcepts: ConceptNode[],
        microAnalysis?: MicroAnalysisResult | null
    ): Promise<NextQuestionParams>
}

/**
 * Strategy for Facts/Recall (High Frequency, Speed)
 * Logic: Spaced Repetition with Investigative Probing
 */
export class RecallStrategy implements AdaptiveStrategy {
    async getNextParams(
        state: AssessmentState,
        currentConcept: ConceptNode,
        treeConcepts: ConceptNode[],
        microAnalysis?: MicroAnalysisResult | null
    ): Promise<NextQuestionParams> {
        const lastInteraction = state.history.filter(h => h.concept === currentConcept.name).pop()

        // If no history, start at base difficulty
        if (!lastInteraction) {
            return {
                concept: currentConcept.name,
                difficulty: Math.max(1, currentConcept.difficulty), // Start simple
                topic: state.topic,
                previousConcepts: [],
                questionType: 'mcq', // Drill is usually MCQ or fast short answer
                probingGuidance: 'Initial recall probe - establish baseline'
            }
        }

        // Use micro-analysis guidance if available
        let nextDifficulty = lastInteraction.difficulty
        let conceptPivot: string | null = null
        let urgency = 'normal'

        if (microAnalysis?.adaptiveGuidance) {
            nextDifficulty = Math.max(1, Math.min(10,
                lastInteraction.difficulty + microAnalysis.adaptiveGuidance.difficultyAdjustment
            ))
            conceptPivot = microAnalysis.adaptiveGuidance.conceptPivot
            urgency = microAnalysis.adaptiveGuidance.urgency
        } else {
            // IRT-based difficulty estimation
            nextDifficulty = irtDifficulty(state, currentConcept.name, lastInteraction.difficulty)
        }

        // If micro-analysis suggests probing a different concept
        if (conceptPivot) {
            const pivotConcept = treeConcepts.find(c => c.name === conceptPivot)
            if (pivotConcept) {
                return {
                    concept: pivotConcept.name,
                    difficulty: irtDifficulty(state, pivotConcept.name, pivotConcept.difficulty),
                    topic: state.topic,
                    previousConcepts: state.history.map(h => h.concept),
                    questionType: 'mcq',
                    probingGuidance: microAnalysis?.suggestedProbe || 'Investigative pivot'
                }
            }
        }

        return {
            concept: currentConcept.name,
            difficulty: nextDifficulty,
            topic: state.topic,
            previousConcepts: state.history.map(h => h.concept),
            questionType: 'mcq',
            probingGuidance: urgency === 'probe_deeper'
                ? 'Deep probing required - test with subtle distractors'
                : urgency === 'accelerate'
                    ? 'Accelerate - challenge with harder variations'
                    : 'Standard recall progression'
        }
    }
}

/**
 * Strategy for Procedural Skills (Medium Frequency, Steps)
 * Logic: Scaffolding / Fading with Error Archaeology
 */
export class ProceduralStrategy implements AdaptiveStrategy {
    async getNextParams(
        state: AssessmentState,
        currentConcept: ConceptNode,
        treeConcepts: ConceptNode[],
        microAnalysis?: MicroAnalysisResult | null
    ): Promise<NextQuestionParams> {
        const lastInteraction = state.history.filter(h => h.concept === currentConcept.name).pop()

        if (!lastInteraction) {
            return {
                concept: currentConcept.name,
                difficulty: Math.max(1, currentConcept.difficulty),
                topic: state.topic,
                previousConcepts: [],
                questionType: 'short_answer',
                probingGuidance: 'Initial procedural assessment - watch for step sequencing'
            }
        }

        let nextDifficulty = lastInteraction.difficulty
        let questionType: 'mcq' | 'short_answer' | 'true_false' = 'short_answer'

        if (microAnalysis?.adaptiveGuidance) {
            nextDifficulty = Math.max(1, Math.min(10,
                lastInteraction.difficulty + microAnalysis.adaptiveGuidance.difficultyAdjustment
            ))
            questionType = microAnalysis.adaptiveGuidance.questionTypeRecommendation

            // If anomaly detected, probe deeper
            if (microAnalysis.anomalyDetected) {
                return {
                    concept: currentConcept.name,
                    difficulty: Math.max(1, nextDifficulty - 1), // Slightly easier to isolate issue
                    topic: state.topic,
                    previousConcepts: state.history.map(h => h.concept),
                    questionType: 'short_answer', // Open-ended to see their process
                    probingGuidance: `ANOMALY DETECTED: ${microAnalysis.anomalyNote}. Design question to expose procedural reasoning.`
                }
            }
        } else {
            // IRT-based difficulty estimation
            nextDifficulty = irtDifficulty(state, currentConcept.name, lastInteraction.difficulty)
        }

        return {
            concept: currentConcept.name,
            difficulty: nextDifficulty,
            topic: state.topic,
            previousConcepts: state.history.map(h => h.concept),
            questionType,
            probingGuidance: lastInteraction.isCorrect
                ? 'Fade scaffolding - remove hints, increase complexity'
                : 'Add scaffolding - provide more structure, simpler sub-problems'
        }
    }
}

/**
 * Strategy for Concepts (Low Frequency, Deep Understanding)
 * Logic: Prerequisite Probing, Socratic Depth, Hypothesis Testing
 */
export class ConceptualStrategy implements AdaptiveStrategy {
    async getNextParams(
        state: AssessmentState,
        currentConcept: ConceptNode,
        treeConcepts: ConceptNode[],
        microAnalysis?: MicroAnalysisResult | null
    ): Promise<NextQuestionParams> {
        const lastInteraction = state.history.filter(h => h.concept === currentConcept.name).pop()

        if (!lastInteraction) {
            return {
                concept: currentConcept.name,
                difficulty: currentConcept.difficulty,
                topic: state.topic,
                previousConcepts: [],
                questionType: 'short_answer',
                probingGuidance: 'Initial conceptual probe - assess mental model structure'
            }
        }

        // INVESTIGATIVE CONCEPTUAL STRATEGY
        // If wrong, we have an opportunity for error archaeology
        if (!lastInteraction.isCorrect && state.consecutiveIncorrect >= 1) {
            // Check micro-analysis for specific guidance
            if (microAnalysis?.adaptiveGuidance.urgency === 'remediate') {
                // Probe prerequisites - find the root cause
                const prereqName = currentConcept.prerequisites[0]
                const prereq = treeConcepts.find(c => c.name === prereqName)
                if (prereq) {
                    return {
                        concept: prereq.name,
                        difficulty: prereq.difficulty,
                        topic: state.topic,
                        previousConcepts: [],
                        questionType: 'mcq', // Quick check on prerequisite
                        probingGuidance: `REMEDIATION: Testing prerequisite "${prereq.name}" to identify root cause of misconception.`
                    }
                }
            }

            // No prereq found or micro-analysis suggests different approach
            // Try a different angle on same concept
            return {
                concept: currentConcept.name,
                difficulty: Math.max(1, lastInteraction.difficulty - 2),
                topic: state.topic,
                previousConcepts: [],
                questionType: 'mcq',
                probingGuidance: 'Alternative angle - present concept from different perspective to diagnose misconception type',
                distractorStrategy: 'Include distractors that reveal specific misconception types'
            }
        }

        // If correct, check if we should probe deeper or move on
        if (lastInteraction.isCorrect) {
            // If they're doing well, try transfer questions
            if (state.consecutiveCorrect >= 2 && lastInteraction.difficulty >= 6) {
                return {
                    concept: currentConcept.name,
                    difficulty: Math.min(10, lastInteraction.difficulty + 2),
                    topic: state.topic,
                    previousConcepts: state.history.map(h => h.concept),
                    questionType: 'short_answer',
                    probingGuidance: 'TRANSFER TEST: Apply concept to novel context to verify deep understanding vs. pattern matching'
                }
            }

            return {
                concept: currentConcept.name,
                difficulty: Math.min(10, lastInteraction.difficulty + 1),
                topic: state.topic,
                previousConcepts: state.history.map(h => h.concept),
                questionType: 'short_answer',
                probingGuidance: 'Deepen complexity - add nuance or edge cases'
            }
        }

        // Default case
        return {
            concept: currentConcept.name,
            difficulty: lastInteraction.difficulty,
            topic: state.topic,
            previousConcepts: state.history.map(h => h.concept),
            questionType: 'short_answer'
        }
    }
}

export const STRATEGIES: Record<ObjectiveType | 'investigative', AdaptiveStrategy> = {
    'recall': new RecallStrategy(),
    'procedural': new ProceduralStrategy(),
    'conceptual': new ConceptualStrategy(),
    'analytical': new InvestigativeStrategy(), // Analytical now uses full investigative
    'investigative': new InvestigativeStrategy()
}
