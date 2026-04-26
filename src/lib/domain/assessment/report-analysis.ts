// @ts-nocheck
// LEGACY: Will be removed after Strangler Fig migration.
/**
 * Report analysis functions ΓÇö investigative analysis, action plans, knowledge tree
 */

import { createClient } from '@/lib/infrastructure/supabase/server'
import { createLogger } from '@/lib/core/logger'
import { investigativeAnalyzer } from '@/lib/assessment/investigative-analyzer'
import { assessmentEngine, AssessmentState } from './engine'
import { MASTERY_CONFIG } from './mastery-config'
import type {
    InvestigativeReport,
    ActionPlan,
} from '@/lib/llm/types'
import type { AssessmentRow, ResponseRow, KnowledgeGapRow } from '@/types/db-rows'
import type { CalibrationResult } from './self-assessment'
import type { KnowledgeTreeNode, KnowledgeTreeEdge, ConceptPerformance } from './report-types'

const logger = createLogger({ requestId: 'report-analysis' })

export async function performInvestigativeAnalysis(assessmentId: string, assessment: AssessmentRow, responses: ResponseRow[]) {
    const supabase = await createClient()
    const { data: userPersonaData } = await supabase
        .from('user_personas')
        .select('*')
        .eq('user_id', assessment.user_id)
        .single()

    let investigativeReport: InvestigativeReport | undefined

    if (responses.length >= 10) {
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
                    isCorrect: r.is_correct ?? false,
                    difficulty: r.difficulty,
                    questionText: r.question_text,
                    objective: r.objective ?? undefined
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
            logger.error("Investigative analysis failed:", e)
        }
    }
    return investigativeReport
}

export async function generateActionPlanChunk(assessmentId: string, assessment: AssessmentRow, responses: ResponseRow[], gaps: Partial<KnowledgeGapRow>[], calibrationData: CalibrationResult[]) {
    const supabase = await createClient()
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
            logger.error("Failed to generate action plan:", e)
        }
    }
    return actionPlan
}

export async function buildKnowledgeTree(assessment: AssessmentRow, concepts: Map<string, ConceptPerformance>) {
    let knowledgeTree: { nodes: KnowledgeTreeNode[], edges: KnowledgeTreeEdge[] } | undefined
    try {
        const tree = await assessmentEngine.getTree(assessment.topic)
        if (tree && tree.concepts) {
            const nodes = tree.concepts.map((c, i) => {
                const perf = concepts.get(c.name)

                let mastery: 'untested' | 'mastered' | 'partial' | 'gap' = 'untested'
                let accuracy = 0

                if (perf && perf.questionsAsked > 0) {
                    accuracy = perf.correctCount / perf.questionsAsked
                    if (accuracy >= MASTERY_CONFIG.MASTERED) mastery = 'mastered'
                    else if (accuracy >= MASTERY_CONFIG.PARTIAL) mastery = 'partial'
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
                    type: 'conceptNode' as const
                }
            })

            const edges: KnowledgeTreeEdge[] = []
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
        logger.error("Failed to generate knowledge tree:", e)
    }
    return knowledgeTree
}
