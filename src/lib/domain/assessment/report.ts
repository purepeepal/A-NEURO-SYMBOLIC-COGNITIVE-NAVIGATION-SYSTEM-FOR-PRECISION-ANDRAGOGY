// @ts-nocheck
// LEGACY: Will be removed after Strangler Fig migration.
import { createClient } from '@/lib/infrastructure/supabase/server'
import { createLogger } from '@/lib/core/logger'
import type { AssessmentRow, ResponseRow, KnowledgeGapRow } from '@/types/db-rows'
import { assessmentEngine } from './engine'
import { MASTERY_CONFIG } from './mastery-config'
import { computeCalibration, computeClusteredCalibration, CalibrationResult, computeConfidenceCalibration, ConfidenceCalibrationSummary } from './self-assessment'
import { computeConfidence } from './uncertainty'

// Re-export types + analysis functions so consumers can keep importing from './report'
export type { AssessmentReport, KnowledgeTreeNode, KnowledgeTreeEdge, ConceptPerformance } from './report-types'
export { performInvestigativeAnalysis, generateActionPlanChunk, buildKnowledgeTree } from './report-analysis'

import type { ConceptPerformance } from './report-types'
import type { AssessmentReport } from './report-types'
import { performInvestigativeAnalysis, generateActionPlanChunk, buildKnowledgeTree } from './report-analysis'

const logger = createLogger({ requestId: 'report' })

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

    // Filter out unevaluated responses for accuracy calculations
    const evaluatedResponses = responses.filter(r => r.is_correct !== null)
    const totalResponses = responses.length
    const evaluatedCount = evaluatedResponses.length

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
        // Only count evaluated responses for correctness metrics
        if (r.is_correct === true) {
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
        logger.error(
            `[REPORT INTEGRITY] Scoring divergence detected for assessment ${assessmentId}: ` +
            `assessment.correct_count=${assessment.correct_count} but sum(responses.is_correct)=${responseLevelCorrectCount}. ` +
            `This indicates responses.is_correct was not persisted ΓÇö check RLS UPDATE policies on the responses table.`
        )
    }

    // 2. Identify Gaps
    const gaps: Partial<KnowledgeGapRow>[] = []

    concepts.forEach(perf => {
        const mastery = (perf.correctCount / perf.questionsAsked) * 100

        if (mastery < MASTERY_CONFIG.PROFICIENT * 100 || perf.errorPatterns.prerequisite_gap > 0) {
            const severity = mastery < MASTERY_CONFIG.DEVELOPING * 100 ? 'critical' : 'moderate'

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

export async function fetchCalibration(assessmentId: string, concepts: Map<string, ConceptPerformance>, topic?: string) {
    const supabase = await createClient()
    let calibrationData: CalibrationResult[] = []
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

        // Try clustered calibration if prerequisite tree is available
        if (topic) {
            try {
                const tree = await assessmentEngine.getTree(topic)
                if (tree && tree.concepts && tree.concepts.length > 0) {
                    calibrationData = computeClusteredCalibration(selfRatings, quizPerformance, tree)
                } else {
                    calibrationData = computeCalibration(selfRatings, quizPerformance)
                }
            } catch {
                calibrationData = computeCalibration(selfRatings, quizPerformance)
            }
        } else {
            calibrationData = computeCalibration(selfRatings, quizPerformance)
        }

        if (calibrationData.length > 0) {
            try {
                const provider = (await import('@/lib/llm')).gemini
                if (provider.generateCalibrationInsight) {
                    calibrationInsight = await provider.generateCalibrationInsight(calibrationData)
                }
            } catch (e) {
                logger.error("Failed to generate calibration insight:", e)
            }
        }
    }

    return { calibrationData, calibrationInsight }
}

// -------------------------------------------------------------------------------------------------
// UNIFIED WRAPPER (Backward Compatibility)
// -------------------------------------------------------------------------------------------------
export async function generateReport(assessmentId: string): Promise<AssessmentReport> {
    const { assessment, responses, concepts, gaps, totalTimeSeconds } = await fetchBaseStats(assessmentId)
    const { calibrationData, calibrationInsight } = await fetchCalibration(assessmentId, concepts, assessment.topic)
    const confidenceCalibration = await fetchConfidenceCalibration(responses)

    // Fire off these heavy tasks in parallel since they don't depend on each other's direct unawaited results
    const [investigativeReport, actionPlan, knowledgeTree] = await Promise.all([
        performInvestigativeAnalysis(assessmentId, assessment, responses),
        generateActionPlanChunk(assessmentId, assessment, responses, gaps, calibrationData),
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
        confidenceCalibration,
        actionPlan,
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
