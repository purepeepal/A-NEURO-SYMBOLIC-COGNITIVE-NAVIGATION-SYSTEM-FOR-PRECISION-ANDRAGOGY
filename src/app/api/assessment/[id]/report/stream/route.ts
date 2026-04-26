/**
 * SSE Report Streaming Endpoint
 * 
 * Symposium 3.5 Directive: Stream report sections progressively via SSE.
 * Section-level streaming (not character-level) — each section reveals as 
 * a complete unit with fade-in animation on the client.
 * 
 * Sections delivered in order:
 * 1. stats (instant — computed locally, no LLM)
 * 2. conceptPerformance (instant — from DB)
 * 3. investigativeReport (LLM — may take 3-5s)
 * 4. calibration (computed locally)
 * 5. actionPlan (LLM — 2-3s)
 * 6. knowledgeTree (computed locally)
 */
import { NextRequest } from 'next/server'
import {
    fetchBaseStats,
    fetchCalibration,
    fetchConfidenceCalibration,
    performInvestigativeAnalysis,
    generateActionPlanChunk,
    buildKnowledgeTree
} from '@/lib/assessment/report'
import { createLogger } from '@/lib/logger'

export const runtime = 'edge' // Symposium Directive: Edge Runtime

// UUID v4 pattern for param validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Helper: Encode an SSE event
function encodeSSE(section: string, data: unknown): Uint8Array {
    const event = `event: section\ndata: ${JSON.stringify({ section, data })}\n\n`
    return new TextEncoder().encode(event)
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: assessmentId } = await params

    // Validate UUID format to prevent injection
    if (!UUID_RE.test(assessmentId)) {
        return new Response(JSON.stringify({ error: 'Invalid assessment ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        })
    }

    const logger = createLogger({ requestId: 'api-report-stream' })
    let controllerClosed = false

    // Safe enqueue: guard against writing to a closed/errored controller
    function safeEnqueue(controller: ReadableStreamDefaultController, section: string, data: unknown) {
        if (controllerClosed) return
        try {
            controller.enqueue(encodeSSE(section, data))
        } catch {
            controllerClosed = true
        }
    }

    function safeClose(controller: ReadableStreamDefaultController) {
        if (controllerClosed) return
        controllerClosed = true
        try { controller.close() } catch { /* already closed */ }
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // 1. Core stats and concepts (Instant DB query)
                const { assessment, responses, concepts, gaps, totalTimeSeconds } = await fetchBaseStats(assessmentId)

                safeEnqueue(controller, 'stats', {
                    assessmentId: assessment.id,
                    topic: assessment.topic,
                    completedAt: new Date(assessment.completed_at || new Date()),
                    totalQuestions: assessment.total_questions,
                    correctCount: assessment.correct_count,
                    accuracy: assessment.total_questions > 0 ? (assessment.correct_count / assessment.total_questions) * 100 : 0,
                    averageDifficulty: assessment.current_difficulty,
                    timeTakenSeconds: Math.round(totalTimeSeconds),
                    knowledgeGaps: gaps,
                    totalGaps: gaps.length,
                    criticalGaps: gaps.filter(g => g.gap_severity === 'critical').length,
                    moderateGaps: gaps.filter(g => g.gap_severity === 'moderate').length,
                    minorGaps: gaps.filter(g => g.gap_severity === 'minor').length,
                })

                const conceptArray = Array.from(concepts.values())
                safeEnqueue(controller, 'conceptPerformance', conceptArray)

                // 2. Calibration — run both computations in parallel (both depend only on step 1 outputs)
                const [{ calibrationData, calibrationInsight }, confidenceCalibration] = await Promise.all([
                    fetchCalibration(assessmentId, concepts),
                    fetchConfidenceCalibration(responses),
                ])

                if (calibrationData.length > 0) {
                    safeEnqueue(controller, 'calibration', {
                        data: calibrationData,
                        insight: calibrationInsight,
                    })
                }

                if (confidenceCalibration) {
                    safeEnqueue(controller, 'confidenceCalibration', confidenceCalibration)
                }

                // 3. Fire heavy concurrent tasks (LLMs + complex DB lookups)
                const analysisPromise = performInvestigativeAnalysis(assessmentId, assessment, responses)
                const actionPlanPromise = generateActionPlanChunk(assessmentId, assessment, responses, gaps, calibrationData)
                const treePromise = buildKnowledgeTree(assessment, concepts)

                // 3.a Knowledge Tree
                const tree = await treePromise
                if (tree) safeEnqueue(controller, 'knowledgeTree', tree)

                // 3.b Investigative Analysis
                const investigativeReport = await analysisPromise
                if (investigativeReport) safeEnqueue(controller, 'investigativeReport', investigativeReport)

                // 3.c Action Plan
                const actionPlan = await actionPlanPromise
                if (actionPlan) safeEnqueue(controller, 'actionPlan', actionPlan)

                // 4. Recommendations
                const recommendations = investigativeReport
                    ? investigativeReport.strategicRecommendations.map((r: any) => `[${r.priority.toUpperCase()}] ${r.recommendation}`)
                    : generateFallbackRecommendations(gaps)
                safeEnqueue(controller, 'recommendations', recommendations)

                // Done
                safeEnqueue(controller, 'complete', { success: true })

            } catch (error) {
                logger.error('[SSE:Report] Stream error:', error instanceof Error ? error : undefined)
                safeEnqueue(controller, 'error', {
                    message: error instanceof Error ? error.message : 'Report generation failed',
                })
            } finally {
                safeClose(controller)
            }
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            // Disable Nginx buffering
            'X-Accel-Buffering': 'no',
        },
    })
}

function generateFallbackRecommendations(gaps: any[]): string[] {
    if (gaps.length === 0) return ["Ready for advanced topics! Great job."]
    const critical = gaps.filter(g => g.gap_severity === 'critical')

    if (critical.length > 0) {
        return [`Focus immediately on: ${critical.map(g => g.concept).join(', ')}. These are blocking your progress.`]
    }
    return [`Review these concepts: ${gaps.map(g => g.concept).join(', ')} to improve mastery.`]
}
