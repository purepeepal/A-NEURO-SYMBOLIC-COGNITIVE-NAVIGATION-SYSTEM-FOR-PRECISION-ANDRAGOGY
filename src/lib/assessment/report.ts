import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import { investigativeAnalyzer } from './investigative-analyzer'
import { assessmentEngine, AssessmentState } from './engine'
import {
    InvestigativeReport,
    CognitiveBehavioralProfile,
    InvestigativeInsight,
    KnowledgeTopology,
    StrategicRecommendation,
    Predictions,
    ActionPlan,
    EnrichedSessionReport
} from '@/lib/llm/types'
import { computeCalibration, CalibrationResult, computeConfidenceCalibration, ConfidenceCalibrationSummary } from './self-assessment'
import { computeConfidence, ConfidenceIndicator } from './uncertainty'

type AssessmentRow = Database['public']['Tables']['assessments']['Row']
type ResponseRow = Database['public']['Tables']['responses']['Row']
type KnowledgeGapRow = Database['public']['Tables']['knowledge_gaps']['Row']

export interface AssessmentReport {
    assessmentId: string
    topic: string
    completedAt: Date
    totalQuestions: number
    correctCount: number
    accuracy: number
    averageDifficulty: number
    timeTakenSeconds: number
    conceptPerformance: ConceptPerformance[]
    knowledgeGaps: Partial<KnowledgeGapRow>[]
    totalGaps: number
    criticalGaps: number
    moderateGaps: number
    minorGaps: number
    recommendations: string[]
    // NEW: Investigative Analysis
    investigativeReport?: InvestigativeReport
    calibrationData?: CalibrationResult[]
    calibrationInsight?: { headline: string, detail: string }
    actionPlan?: ActionPlan
    enrichedReport?: Omit<EnrichedSessionReport, 'sessionId' | 'topic' | 'questionsAnswered' | 'accuracy' | 'averageDifficulty' | 'difficultyProgression' | 'errorBreakdown' | 'conceptsStruggled' | 'conceptsMastered' | 'synthesizedDeductions' | 'descriptiveAnalysis' | 'immediateActions' | 'nextSessionFocus' | 'longTermPath'>
    knowledgeTree?: {
        nodes: any[],
        edges: any[]
    }
}

export interface ConceptPerformance {
    concept: string
    questionsAsked: number
    correctCount: number
    averageDifficulty: number
    timeTakenSeconds: number
    confidence?: ConfidenceIndicator
    errorPatterns: { conceptual: number; procedural: number; careless: number; prerequisite_gap: number; correct: number }
    lastAttempt: Date
}

// -------------------------------------------------------------------------------------------------
// MODULAR EXPORTS FOR PROGRESSIVE STREAMING
// -------------------------------------------------------------------------------------------------

export async function fetchBaseStats(assessmentId: string) {
    const supabase = await createClient()

    const { data: responses } = await supabase
        .from('responses')
        .select('*')
        .eq('assessment_id', assessmentId)

    const { data: assessment } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single()

    if (!responses || !assessment) throw new Error("Assessment not found")

    // 1. Aggregate Concept Performance
    const concepts = new Map<string, ConceptPerformance>()
    let totalTimeSeconds = 0
    let responseLevelCorrectCount = 0

    responses.forEach((r) => {
        totalTimeSeconds += (r.time_taken_seconds || 0)

        if (!concepts.has(r.concept)) {
            const conceptResponses = responses.filter(resp => resp.concept === r.concept)
            concepts.set(r.concept, {
                concept: r.concept,
                questionsAsked: 0,
                correctCount: 0,
                averageDifficulty: 0,
                timeTakenSeconds: 0,
                confidence: computeConfidence(r.concept, conceptResponses),
                errorPatterns: { conceptual: 0, procedural: 0, careless: 0, prerequisite_gap: 0, correct: 0 },
                lastAttempt: new Date(0)
            })
        }

        const current = concepts.get(r.concept)!

        current.questionsAsked++
        if (r.is_correct) {
            current.correctCount++
            responseLevelCorrectCount++
        }

        const eType = r.error_type || 'conceptual'
        if (eType in current.errorPatterns) {
            current.errorPatterns[eType as keyof typeof current.errorPatterns]++
        }

        current.averageDifficulty = (current.averageDifficulty * (current.questionsAsked - 1) + r.difficulty) / current.questionsAsked
        current.lastAttempt = new Date(r.created_at)

        concepts.set(r.concept, current)
    })

    // INTEGRITY CHECK: Detect divergence between assessment-level and response-level scoring
    // This catches the silent RLS failure pattern where assessments.correct_count updates
    // but responses.is_correct does not (due to missing UPDATE policy on responses table)
    if (responseLevelCorrectCount !== assessment.correct_count && responses.length > 0) {
        console.error(
            `[REPORT INTEGRITY] Scoring divergence detected for assessment ${assessmentId}: ` +
            `assessment.correct_count=${assessment.correct_count} but sum(responses.is_correct)=${responseLevelCorrectCount}. ` +
            `This indicates responses.is_correct was not persisted — check RLS UPDATE policies on the responses table.`
        )
    }

    // 2. Identify Gaps
    const gaps: Partial<KnowledgeGapRow>[] = []

    concepts.forEach(perf => {
        const mastery = (perf.correctCount / perf.questionsAsked) * 100

        if (mastery < 70 || perf.errorPatterns.prerequisite_gap > 0) {
            const severity = mastery < 40 ? 'critical' : 'moderate'

            gaps.push({
                concept: perf.concept,
                mastery_score: mastery,
                gap_severity: severity,
                error_patterns: perf.errorPatterns as any,
                related_prerequisites: [],
            })
        }
    })

    // 3. Persist Gaps to DB
    for (const gap of gaps) {
        await supabase.from('knowledge_gaps').upsert({
            user_id: assessment.user_id,
            assessment_id: assessmentId,
            concept: gap.concept!,
            mastery_score: gap.mastery_score!,
            gap_severity: gap.gap_severity!,
            error_patterns: gap.error_patterns!,
        }, { onConflict: 'user_id, assessment_id, concept' })
    }

    // Update assessment complete status
    if (assessment.status !== 'completed') {
        await supabase
            .from('assessments')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', assessmentId)
    }

    return { assessment, responses, concepts, gaps, totalTimeSeconds }
}

export async function fetchCalibration(assessmentId: string, concepts: Map<string, ConceptPerformance>) {
    const supabase = await createClient()
    let calibrationData: ReturnType<typeof computeCalibration> = []
    let calibrationInsight: { headline: string, detail: string } | undefined

    const { data: selfAssessments } = await supabase
        .from('self_assessments')
        .select('*')
        .eq('assessment_id', assessmentId)

    if (selfAssessments && selfAssessments.length > 0) {
        const selfRatings = selfAssessments.map(sa => ({
            subTopic: sa.subtopic,
            confidence: sa.self_rating
        }))

        const quizPerformance = new Map<string, { correct: number, total: number }>()
        concepts.forEach(perf => {
            quizPerformance.set(perf.concept, { correct: perf.correctCount, total: perf.questionsAsked })
        })

        calibrationData = computeCalibration(selfRatings, quizPerformance)

        if (calibrationData.length > 0) {
            try {
                const provider = (await import('@/lib/llm')).gemini
                if (provider.generateCalibrationInsight) {
                    calibrationInsight = await provider.generateCalibrationInsight(calibrationData)
                }
            } catch (e) {
                console.error("Failed to generate calibration insight:", e)
            }
        }
    }

    return { calibrationData, calibrationInsight }
}

export async function performInvestigativeAnalysis(assessmentId: string, assessment: any, responses: any[]) {
    const supabase = await createClient()

    // ── Cache check: skip expensive 5-call LLM pipeline if we already have results ──
    const { data: cached } = await supabase
        .from('session_analytics')
        .select('executive_summary, narrative_analysis, key_insights, knowledge_topology, strategic_recommendations, predictions, hypotheses_tested, unexpected_findings')
        .eq('session_id', assessmentId)
        .single()

    if (cached?.executive_summary) {
        return {
            executiveSummary: cached.executive_summary,
            narrativeAnalysis: cached.narrative_analysis,
            keyInsights: cached.key_insights,
            knowledgeTopology: cached.knowledge_topology,
            strategicRecommendations: cached.strategic_recommendations,
            predictions: cached.predictions,
            hypothesesTested: cached.hypotheses_tested,
            unexpectedFindings: cached.unexpected_findings,
        } as InvestigativeReport
    }

    const { data: userPersonaData } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', assessment.user_id)
        .single()

    let investigativeReport: InvestigativeReport | undefined

    if (responses.length >= 5) {
        try {
            const state: AssessmentState = {
                assessmentId,
                topic: assessment.topic,
                currentDifficulty: assessment.current_difficulty,
                consecutiveCorrect: assessment.consecutive_correct,
                consecutiveIncorrect: assessment.consecutive_incorrect,
                questionsAnswered: assessment.total_questions,
                history: responses.map(r => ({
                    questionId: r.id,
                    concept: r.concept,
                    isCorrect: r.is_correct || false,
                    difficulty: r.difficulty,
                    questionText: r.question_text,
                    objective: r.objective
                }))
            }

            investigativeReport = await investigativeAnalyzer.generateInvestigativeReport(
                assessmentId,
                state,
                responses,
                userPersonaData,
                assessment.user_id
            )

            if (investigativeReport) {
                await supabase.from('session_analytics').upsert({
                    session_id: assessmentId,
                    user_id: assessment.user_id,
                    topic: assessment.topic,
                    questions_answered: assessment.total_questions,
                    accuracy: Math.round(assessment.correct_count / assessment.total_questions * 100),
                    average_difficulty: assessment.current_difficulty,
                    executive_summary: investigativeReport.executiveSummary,
                    narrative_analysis: investigativeReport.narrativeAnalysis,
                    key_insights: investigativeReport.keyInsights,
                    knowledge_topology: investigativeReport.knowledgeTopology,
                    strategic_recommendations: investigativeReport.strategicRecommendations,
                    predictions: investigativeReport.predictions,
                    hypotheses_tested: investigativeReport.hypothesesTested,
                    unexpected_findings: investigativeReport.unexpectedFindings
                }, { onConflict: 'session_id' })
            }
        } catch (e) {
            console.error("Investigative analysis failed:", e)
        }
    }
    return investigativeReport
}

export async function generateActionPlanChunk(assessmentId: string, assessment: any, responses: any[], gaps: any[], calibrationData: any[]) {
    const supabase = await createClient()

    // ── Cache check: reuse existing action plan if available ──
    const { data: cached } = await supabase
        .from('session_analytics')
        .select('action_plan')
        .eq('session_id', assessmentId)
        .single()

    if (cached?.action_plan) {
        return cached.action_plan as ActionPlan
    }

    let actionPlan: ActionPlan | undefined
    if (responses.length >= 3) {
        try {
            const provider = (await import('@/lib/llm')).gemini
            if (provider.generateActionPlan) {
                actionPlan = await provider.generateActionPlan(
                    assessment.topic,
                    gaps,
                    calibrationData,
                    assessment.total_questions > 0 ? (assessment.correct_count / assessment.total_questions) * 100 : 0
                )

                if (actionPlan) {
                    try {
                        await supabase.from('session_analytics').upsert({
                            session_id: assessmentId,
                            user_id: assessment.user_id,
                            action_plan: actionPlan as any
                        }, { onConflict: 'session_id' })
                    } catch (e) {
                        // Ignore DB save error if column doesn't exist yet
                    }
                }
            }
        } catch (e) {
            console.error("Failed to generate action plan:", e)
        }
    }
    return actionPlan
}

export async function generateEnrichedReportChunk(assessmentId: string, assessment: any, responses: any[], calibrationData: any[]) {
    const supabase = await createClient()

    // ── Cache check ──
    const { data: cached } = await supabase
        .from('session_analytics')
        .select('enriched_report')
        .eq('session_id', assessmentId)
        .single()

    if (cached?.enriched_report) {
        return cached.enriched_report
    }

    let enrichedReport: any | undefined
    if (responses.length >= 3) {
        try {
            const provider = (await import('@/lib/llm')).gemini
            if (provider.generateEnrichedReport) {
                
                // Get Cognitive profile
                const { data: profileData } = await supabase
                    .from('session_analytics')
                    .select('knowledge_topology')
                    .eq('session_id', assessmentId)
                    .single()
                
                // Get user persona
                const { data: userPersonaData } = await supabase
                    .from('user_personas')
                    .select('*')
                    .eq('user_id', assessment.user_id)
                    .single()

                const state = {
                    assessmentId,
                    topic: assessment.topic,
                    currentDifficulty: assessment.current_difficulty,
                    consecutiveCorrect: assessment.consecutive_correct,
                    consecutiveIncorrect: assessment.consecutive_incorrect,
                    questionsAnswered: assessment.total_questions,
                    history: []
                } as any;

                enrichedReport = await provider.generateEnrichedReport(
                    state,
                    responses,
                    calibrationData,
                    profileData?.knowledge_topology || null,
                    userPersonaData
                )

                if (enrichedReport) {
                    try {
                        // Persist perspective shifts to our new perspectives table
                        if (enrichedReport.perspectiveShifts && enrichedReport.perspectiveShifts.length > 0) {
                            for (const shift of enrichedReport.perspectiveShifts) {
                                await supabase.from('perspective_suggestions').insert({
                                    user_id: assessment.user_id,
                                    assessment_id: assessmentId,
                                    current_domain: shift.currentDomain,
                                    suggested_domain: shift.suggestedDomain,
                                    rationale: shift.rationale,
                                    bridge_concept: shift.bridgeConcept
                                })
                            }
                        }

                        // Save the full enriched report to session_analytics
                        await supabase.from('session_analytics').upsert({
                            session_id: assessmentId,
                            user_id: assessment.user_id,
                            enriched_report: enrichedReport as any
                        }, { onConflict: 'session_id' })
                    } catch (e) {
                        console.error('Failed to save enriched report to DB:', e)
                    }
                }
            }
        } catch (e) {
            console.error("Failed to generate enriched report:", e)
        }
    }
    return enrichedReport
}

export async function buildKnowledgeTree(assessment: any, concepts: Map<string, ConceptPerformance>) {
    let knowledgeTree: { nodes: any[], edges: any[] } | undefined
    try {
        const tree = await assessmentEngine.getTree(assessment.topic)
        if (tree && tree.concepts) {
            const nodes = tree.concepts.map((c, i) => {
                const perf = concepts.get(c.name)

                let mastery = 'untested'
                let accuracy = 0

                if (perf && perf.questionsAsked > 0) {
                    accuracy = perf.correctCount / perf.questionsAsked
                    if (accuracy >= 0.8) mastery = 'mastered'
                    else if (accuracy >= 0.5) mastery = 'partial'
                    else mastery = 'gap'
                }

                return {
                    id: c.name,
                    position: { x: (i % 3) * 250, y: Math.floor(i / 3) * 150 },
                    data: {
                        label: c.name,
                        mastery,
                        questionsAsked: perf?.questionsAsked || 0,
                        accuracy: Math.round(accuracy * 100),
                        difficulty: c.difficulty,
                        confidence: perf?.confidence
                    },
                    type: 'conceptNode'
                }
            })

            const edges: any[] = []
            tree.concepts.forEach(c => {
                if (c.prerequisites) {
                    c.prerequisites.forEach(prereq => {
                        if (nodes.find(n => n.id === prereq)) {
                            edges.push({
                                id: `e-${prereq}-${c.name}`,
                                source: prereq,
                                target: c.name,
                                animated: true,
                                style: { stroke: '#94a3b8', strokeWidth: 2 }
                            })
                        }
                    })
                }
            })

            knowledgeTree = { nodes, edges }
        }
    } catch (e) {
        console.error("Failed to generate knowledge tree:", e)
    }
    return knowledgeTree
}

// -------------------------------------------------------------------------------------------------
// UNIFIED WRAPPER (Backward Compatibility)
// -------------------------------------------------------------------------------------------------
export async function generateReport(assessmentId: string): Promise<AssessmentReport> {
    const { assessment, responses, concepts, gaps, totalTimeSeconds } = await fetchBaseStats(assessmentId)
    const { calibrationData, calibrationInsight } = await fetchCalibration(assessmentId, concepts)

    // Fire off these heavy tasks in parallel since they don't depend on each other's direct unawaited results
    const [investigativeReport, actionPlan, enrichedReport, knowledgeTree] = await Promise.all([
        performInvestigativeAnalysis(assessmentId, assessment, responses),
        generateActionPlanChunk(assessmentId, assessment, responses, gaps, calibrationData),
        generateEnrichedReportChunk(assessmentId, assessment, responses, calibrationData),
        buildKnowledgeTree(assessment, concepts)
    ])

    return {
        assessmentId,
        topic: assessment.topic,
        completedAt: new Date(),
        totalQuestions: assessment.total_questions,
        correctCount: assessment.correct_count,
        accuracy: assessment.total_questions > 0 ? (assessment.correct_count / assessment.total_questions) * 100 : 0,
        averageDifficulty: assessment.current_difficulty,
        timeTakenSeconds: Math.round(totalTimeSeconds),
        conceptPerformance: Array.from(concepts.values()),
        knowledgeGaps: gaps,
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.gap_severity === 'critical').length,
        moderateGaps: gaps.filter(g => g.gap_severity === 'moderate').length,
        minorGaps: gaps.filter(g => g.gap_severity === 'minor').length,
        recommendations: investigativeReport
            ? investigativeReport.strategicRecommendations.map(r => `[${r.priority.toUpperCase()}] ${r.recommendation}`)
            : generateGlobalRecommendations(gaps),
        investigativeReport,
        calibrationData,
        calibrationInsight,
        actionPlan,
        enrichedReport,
        knowledgeTree
    }
}

function generateGlobalRecommendations(gaps: Partial<KnowledgeGapRow>[]): string[] {
    if (gaps.length === 0) return ["Ready for advanced topics! Great job."]
    const critical = gaps.filter(g => g.gap_severity === 'critical')

    if (critical.length > 0) {
        return [`Focus immediately on: ${critical.map(g => g.concept).join(', ')}. These are blocking your progress.`]
    }
    return [`Review these concepts: ${gaps.map(g => g.concept).join(', ')} to improve mastery.`]
}

/**
 * Compute per-question confidence calibration from response data.
 * Compares self-reported confidence (1-3) with actual correctness.
 */
export async function fetchConfidenceCalibration(responses: ResponseRow[]): Promise<ConfidenceCalibrationSummary | undefined> {
    const responsesWithConfidence = responses.filter(r => r.confidence_level != null)
    if (responsesWithConfidence.length === 0) return undefined

    return computeConfidenceCalibration(
        responses.map(r => ({
            concept: r.concept,
            confidence_level: r.confidence_level,
            is_correct: r.is_correct
        }))
    )
}
