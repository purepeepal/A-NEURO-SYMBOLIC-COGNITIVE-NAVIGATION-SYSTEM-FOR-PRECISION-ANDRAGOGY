import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function GET(req: NextRequest) {
    const logger = createLogger({ requestId: 'api-assessments' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const { data: assessments, error } = await supabase
            .from('assessments')
            .select('id, topic, status, total_questions, correct_count, current_difficulty, started_at, completed_at')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })

        if (error) {
            logger.error('Failed to fetch assessments:', error instanceof Error ? error : undefined)
            return errorResponse('ASSESSMENTS_FETCH_FAILED', 'Failed to fetch assessments', 500)
        }

        const enriched = (assessments || []).map(a => ({
            id: a.id,
            topic: a.topic,
            status: a.status,
            totalQuestions: a.total_questions,
            accuracy: a.total_questions > 0
                ? Math.round((a.correct_count / a.total_questions) * 100)
                : 0,
            currentDifficulty: a.current_difficulty,
            startedAt: a.started_at,
            completedAt: a.completed_at,
            duration: a.completed_at && a.started_at
                ? Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000)
                : null,
        }))

        return NextResponse.json({ assessments: enriched })
    } catch (error) {
        logger.error('Assessments list error:', error instanceof Error ? error : undefined)
        return errorResponse('ASSESSMENTS_FETCH_FAILED', 'Internal Server Error', 500)
    }
}
