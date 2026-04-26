import { NextRequest, NextResponse } from 'next/server'
import { assessmentFlow, consumePrefetchedQuestion } from '@/lib/assessment/flow'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { NextQuestionSchema } from '@/lib/api-schemas'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const logger = createLogger({ requestId: 'api-next' })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return errorResponse('MISSING_USER', 'Unauthorized', 401)
    }

    const rl = checkRateLimit(user.id, 'llm-heavy')
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

    try {
        const body = await request.json()
        const parsed = NextQuestionSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const { assessmentId } = parsed.data

        // Check for unanswered questions (session recovery)
        const { data: pending } = await supabase
            .from('responses')
            .select('*')
            .eq('assessment_id', assessmentId)
            .is('user_answer', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (pending) {
            // Return existing unanswered question instead of generating new one
            return NextResponse.json({
                question: {
                    id: pending.id,
                    concept: pending.concept,
                    difficulty: pending.difficulty,
                    questionType: pending.question_type,
                    questionText: pending.question_text,
                    options: pending.options,
                    correctAnswer: pending.correct_answer,
                    explanation: pending.explanation || '',
                    prerequisites: pending.prerequisites || [],
                    objective: pending.objective || '',
                    competencyLevel: pending.competency_level || 'understand',
                    deductionSpace: pending.deduction_space || { expectedErrors: [] },
                },
                recovered: true,
            })
        }

        // Check for a prefetched question first (generated during evaluate)
        const prefetched = consumePrefetchedQuestion(assessmentId)
        if (prefetched) {
            logger.info(`Serving prefetched question for assessment ${assessmentId}`)
            return NextResponse.json(prefetched)
        }

        const result = await assessmentFlow.generateNextQuestion(assessmentId)
        return NextResponse.json(result)
    } catch (error: any) {
        logger.error("Next Question Error:", error instanceof Error ? error : undefined)
        return errorResponse('QUESTION_GENERATION_FAILED', error.message || 'Failed to get next question', 500, error.toString())
    }
}
