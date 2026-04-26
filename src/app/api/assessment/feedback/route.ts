import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { FeedbackSchema } from '@/lib/api-schemas'
import { sanitizeFeedback } from '@/lib/sanitize'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    const logger = createLogger({ requestId: 'api-feedback' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const rl = checkRateLimit(user.id, 'standard')
        if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

        const body = await req.json()
        const parsed = FeedbackSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const { assessmentId, responseId, feedbackType } = parsed.data
        const comment = sanitizeFeedback(parsed.data.comment)

        const { data, error } = await supabase
            .from('assessment_feedback')
            .insert({
                user_id: user.id,
                assessment_id: assessmentId,
                response_id: responseId || null,
                feedback_type: feedbackType,
                comment,
                status: 'new'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, feedback: data })
    } catch (error) {
        logger.error('Feedback submission error:', error instanceof Error ? error : undefined)
        return errorResponse('FEEDBACK_FAILED', 'Internal Server Error', 500)
    }
}
