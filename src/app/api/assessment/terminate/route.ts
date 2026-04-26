import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { TerminateSchema } from '@/lib/api-schemas'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    const logger = createLogger({ requestId: 'api-terminate' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const rl = checkRateLimit(user.id, 'standard')
        if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

        const body = await req.json()
        const parsed = TerminateSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const { assessmentId } = parsed.data

        // Update assessment status to completed
        const { error } = await supabase
            .from('assessments')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                // could add metadata: { termination_reason: 'user_manual' }
            })
            .eq('id', assessmentId)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        logger.error('Termination error:', error instanceof Error ? error : undefined)
        return errorResponse('TERMINATION_FAILED', 'Internal Server Error', 500)
    }
}
