/**
 * Chat Service — live in-quiz chat/dispute system
 *
 * Two modes:
 *   - 'socratic'   → Socratic guide during active questions (never reveals answers)
 *   - 'evaluation'  → Post-answer feedback/dispute chat
 */

import { PROMPTS } from '../prompts'
import { PROMPT_TEMPERATURES } from '../config'
import * as schemas from '../validators'
import type { LLMProviderCore } from '../providers/types'
import type { UserPersona, ChatMessage } from '../types'
import { ContextWindowManager } from '../context-manager'

export type ChatMode = 'socratic' | 'evaluation'

export class ChatService {
    constructor(private provider: LLMProviderCore) {}

    async chat(
        message: string,
        context?: {
            question: string
            correctAnswer: string
            userAnswer: string
            concept: string
            explanation: string
        },
        userPersona?: Partial<UserPersona> | null,
        history?: ChatMessage[],
        mode: ChatMode = 'evaluation'
    ): Promise<{ message: string; action: 'none' | 'adjust_score' | 'provide_hint'; sentiment: 'positive' | 'neutral' | 'negative' }> {
        this.provider.initialize()

        const formattedHistory = ContextWindowManager.formatConversationalContext(history)

        const promptTemplate = mode === 'socratic'
            ? PROMPTS.socraticGuide.template
            : PROMPTS.chatResponse.template

        const prompt = promptTemplate({
            message, context, userPersona, formattedHistory
        })

        return this.provider.generateWithRetry<{
            message: string
            action: 'none' | 'adjust_score' | 'provide_hint'
            sentiment: 'positive' | 'neutral' | 'negative'
        }>(
            prompt, schemas.RawChatResponseSchema as any,
            'chat', 5, PROMPT_TEMPERATURES.chatResponse
        )
    }
}
