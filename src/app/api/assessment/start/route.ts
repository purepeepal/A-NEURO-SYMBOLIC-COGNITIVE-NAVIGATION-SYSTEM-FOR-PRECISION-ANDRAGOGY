import { NextRequest, NextResponse } from 'next/server'
import { assessmentFlow } from '@/lib/assessment/flow'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { StartAssessmentSchema } from '@/lib/api-schemas'
import { sanitizeTopic } from '@/lib/sanitize'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    const logger = createLogger({ requestId: 'api-start' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const rl = checkRateLimit(user.id, 'standard')
        if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

        const body = await request.json()
        const parsed = StartAssessmentSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const topic = sanitizeTopic(parsed.data.topic)
        if (!topic) {
            return errorResponse('MISSING_FIELDS', 'Topic is required', 400)
        }
        const selfAssessment = parsed.data.selfAssessment

        const result = await assessmentFlow.startAssessment(user.id, topic)

        // Persist self-assessment ratings if provided
        if (selfAssessment && Array.isArray(selfAssessment) && result.assessment) {
            try {
                const rows = selfAssessment.map((sa: { subtopic: string; rating: number }) => ({
                    assessment_id: result.assessment.id,
                    user_id: user.id,
                    subtopic: sa.subtopic,
                    self_rating: sa.rating
                }))
                await supabase.from('self_assessments').insert(rows)
            } catch (e) {
                logger.warn("Failed to persist self-assessment (table may not exist yet):", { detail: e instanceof Error ? e.message : String(e) })
            }
        }

        return NextResponse.json(result)
    } catch (error: any) {
        logger.error("Start Assessment Error:", error instanceof Error ? error : undefined)
        return errorResponse('ASSESSMENT_START_FAILED', 'Failed to start assessment', 500)
    }
}
