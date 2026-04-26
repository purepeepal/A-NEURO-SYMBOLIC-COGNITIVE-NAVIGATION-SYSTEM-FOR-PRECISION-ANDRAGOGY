import { NextRequest, NextResponse } from 'next/server'
import { assessmentFlow } from '@/lib/assessment/flow'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { EvaluateAnswerSchema } from '@/lib/api-schemas'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const logger = createLogger({ requestId: 'api-evaluate' })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return errorResponse('MISSING_USER', 'Unauthorized', 401)
    }

    const rl = checkRateLimit(user.id, 'llm-heavy')
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

    try {
        const body = await request.json()
        const parsed = EvaluateAnswerSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const { assessmentId, questionId, fallbackAnswer, fallbackTime, fallbackConfidence } = parsed.data

        const result = await assessmentFlow.evaluateAnswer(
            assessmentId,
            questionId,
            fallbackAnswer,
            fallbackTime,
            fallbackConfidence
        )
        return NextResponse.json(result)
    } catch (error) {
        logger.error("Evaluate Answer Error:", error instanceof Error ? error : undefined)
        return errorResponse('EVALUATION_FAILED', 'Failed to evaluate answer', 500)
    }
}
