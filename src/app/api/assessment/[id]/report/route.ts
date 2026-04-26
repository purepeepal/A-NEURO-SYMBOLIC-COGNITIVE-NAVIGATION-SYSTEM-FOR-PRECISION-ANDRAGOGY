import { NextRequest, NextResponse } from 'next/server'
import { generateReport } from '@/lib/assessment/report'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { ReportParamsSchema } from '@/lib/api-schemas'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return errorResponse('MISSING_USER', 'Unauthorized', 401)
    }

    const rl = checkRateLimit(user.id, 'llm-heavy')
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

    const logger = createLogger({ requestId: 'api-report' })
    try {
        const { id } = await params
        const parsed = ReportParamsSchema.safeParse({ id })
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid assessment ID', 400)
        }

        const report = await generateReport(parsed.data.id)
        return NextResponse.json(report)
    } catch (e: any) {
        logger.error("Report generation failed:", e instanceof Error ? e : undefined)
        return errorResponse('REPORT_GENERATION_FAILED', 'Report generation failed', 500)
    }
}
