import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const logger = createLogger({ requestId: 'api-responses' })

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const { id: assessmentId } = await params

        if (!UUID_RE.test(assessmentId)) {
            return errorResponse('MISSING_FIELDS', 'Invalid assessment ID', 400)
        }

        // Verify the assessment belongs to this user
        const { data: assessment, error: assessmentError } = await supabase
            .from('assessments')
            .select('id, user_id')
            .eq('id', assessmentId)
            .single()

        if (assessmentError || !assessment) {
            return errorResponse('NOT_FOUND', 'Assessment not found', 404)
        }

        if (assessment.user_id !== user.id) {
            return errorResponse('FORBIDDEN', 'Access denied', 403)
        }

        // Fetch all responses for this assessment, ordered by question number
        const { data: responses, error: responsesError } = await supabase
            .from('responses')
            .select('id, question_number, concept, difficulty, question_text, question_type, options, correct_answer, user_answer, is_correct, time_taken_seconds, error_type, error_explanation, confidence_level, objective')
            .eq('assessment_id', assessmentId)
            .order('question_number', { ascending: true })

        if (responsesError) {
            logger.error('Failed to fetch responses:', responsesError instanceof Error ? responsesError : undefined)
            return errorResponse('FETCH_FAILED', 'Failed to fetch responses', 500)
        }

        return NextResponse.json({ responses: responses || [] })
    } catch (err) {
        logger.error('Responses fetch error:', err instanceof Error ? err : undefined)
        return errorResponse('FETCH_FAILED', 'Internal Server Error', 500)
    }
}
