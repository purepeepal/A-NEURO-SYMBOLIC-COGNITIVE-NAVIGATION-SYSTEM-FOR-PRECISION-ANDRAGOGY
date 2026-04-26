/**
 * Groq Provider Core ΓÇö Groq SDK initialization, generateWithRetry
 *
 * Extracted from the monolithic groq.ts (263 lines).
 * All domain logic lives in services/ ΓÇö this is pure infrastructure.
 */

import Groq from 'groq-sdk'
import { validateWithRetry } from '../call'
import { z } from 'zod'
import { LLM_CONFIG, TOKEN_BUDGETS } from '../config'
import type { LLMProviderCore } from './types'

export class GroqProvider implements LLMProviderCore {
    name = 'groq'
    private client: Groq
    private isInitialized = false

    constructor() {
        this.client = null!
    }

    initialize() {
        if (this.isInitialized) return

        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable is not set')
        }

        this.client = new Groq({ apiKey })
        this.isInitialized = true
    }

    async generateWithRetry<T>(
        prompt: string,
        schema: z.ZodType<T>,
        requestType: string,
        _priority: number = 5,
        temperature?: number
    ): Promise<T> {
        const maxTokens = TOKEN_BUDGETS[requestType] ?? 2048

        return validateWithRetry(
            async () => {
                const completion = await this.client.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are a helpful JSON-speaking educational assistant. Output ONLY valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    model: LLM_CONFIG.groqModel,
                    temperature: temperature ?? 0.5,
                    max_tokens: maxTokens,
                    response_format: { type: 'json_object' }
                })

                return completion.choices[0]?.message?.content || '{}'
            },
            schema,
            {
                label: `groq_${requestType}`,
                maxRetries: LLM_CONFIG.retry.maxAttempts
            }
        )
    }
}

export const groqProvider = new GroqProvider()
