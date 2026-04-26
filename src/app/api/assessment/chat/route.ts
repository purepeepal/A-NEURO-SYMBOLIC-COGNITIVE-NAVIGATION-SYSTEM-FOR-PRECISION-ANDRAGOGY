import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { llm } from '@/lib/llm'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { ChatSchema } from '@/lib/api-schemas'
import { sanitizeChat } from '@/lib/sanitize'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function POST(req: NextRequest) {
    const logger = createLogger({ requestId: 'api-chat' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const rl = checkRateLimit(user.id, 'chat')
        if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

        const body = await req.json()
        const parsed = ChatSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const { assessmentId, questionId, clientContext, history, mode } = parsed.data
        const message = sanitizeChat(parsed.data.message)

        if (!message) {
            return errorResponse('MISSING_FIELDS', 'Message required', 400)
        }

        // Fetch context + persona in parallel (independent DB queries)
        // IMPORTANT: clientContext from the browser is often partial (and MUST NOT prevent DB hydration).
        const personaPromise = supabase
            .from('user_personas')
            .select('*')
            .eq('user_id', user.id)
            .single()

        const responsePromise = questionId
            ? supabase.from('responses').select('*').eq('id', questionId).single()
            : Promise.resolve({ data: null as any })

        const [{ data: response }, { data: userPersona }] = await Promise.all([responsePromise, personaPromise])

        const client = (clientContext ?? {}) as Record<string, unknown>
        const clientQuestion = typeof client.question === 'string' ? client.question : undefined
        const clientCorrect = typeof client.correctAnswer === 'string' ? client.correctAnswer : undefined
        const clientUserAnswer = typeof client.userAnswer === 'string' ? client.userAnswer : undefined
        const clientConcept = typeof client.concept === 'string' ? client.concept : undefined
        const clientExplanation = typeof client.explanation === 'string' ? client.explanation : undefined

        const dbQuestion = response?.question_text
        const dbCorrect = response?.correct_answer
        const dbUserAnswer = response?.user_answer
        const dbConcept = response?.concept
        const dbExplanation = response?.error_explanation

        const correctAnswer = (typeof dbCorrect === 'string' && dbCorrect.trim().length > 0)
            ? dbCorrect
            : (clientCorrect?.trim().length ? clientCorrect : '[NO REFERENCE ANSWER AVAILABLE]')

        const context: { question: string; correctAnswer: string; userAnswer: string; concept: string; explanation: string } | undefined = (
            (dbQuestion || clientQuestion) && (dbConcept || clientConcept)
        )
            ? {
                question: (dbQuestion || clientQuestion || '').toString(),
                correctAnswer,
                userAnswer: ((dbUserAnswer ?? clientUserAnswer) || 'No answer').toString(),
                concept: (dbConcept || clientConcept || '').toString(),
                explanation: ((dbExplanation ?? clientExplanation) || 'None').toString(),
            }
            : undefined

        if (!context) {
            return errorResponse('MISSING_CONTEXT', 'Missing question context for chat', 400)
        }

        // Use the factory 'llm' which selects provider based on config
        const chatResponse = await llm.chat(
            message,
            context,
            userPersona,
            history?.map((h: { role: string; content: string }) => ({
                role: h.role === 'assistant' ? 'ai' as const : 'user' as const,
                text: h.content
            })),
            mode
        )

        return NextResponse.json(chatResponse)
    } catch (error) {
        logger.error('Chat error:', error instanceof Error ? error : undefined)
        return errorResponse('CHAT_FAILED', 'Internal Server Error', 500)
    }
}
