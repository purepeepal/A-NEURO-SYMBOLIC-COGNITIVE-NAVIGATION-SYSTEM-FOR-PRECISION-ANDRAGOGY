/**
 * Institute Provider Core — Custom OpenAI-compatible endpoint initialization
 *
 * Plugs into the STREETS-v3 active load-balancer for evaluation tasks
 */

import OpenAI from 'openai'
import { validateWithRetry } from '../call'
import { z } from 'zod'
import { LLM_CONFIG, TOKEN_BUDGETS } from '../config'
import type { LLMProviderCore } from './types'

export class InstituteProvider implements LLMProviderCore {
    name = 'institute'
    private client: OpenAI
    private isInitialized = false

    constructor() {
        this.client = null!
    }

    initialize() {
        if (this.isInitialized) return

        const apiKey = process.env.INSTITUTE_API_KEY
        const baseURL = process.env.INSTITUTE_BASE_URL

        if (!apiKey || !baseURL) {
            throw new Error('INSTITUTE_API_KEY or INSTITUTE_BASE_URL environment variable is not set')
        }

        // The institute uses an OpenAI-compatible endpoint
        this.client = new OpenAI({
            apiKey,
            baseURL
        })

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
                    model: process.env.INSTITUTE_MODEL || 'llama-3.1-70b',
                    temperature: temperature ?? 0.5,
                    max_tokens: maxTokens,
                    response_format: { type: 'json_object' }
                })

                return completion.choices[0]?.message?.content || '{}'
            },
            schema,
            {
                label: `institute_${requestType}`,
                maxRetries: LLM_CONFIG.retry.maxAttempts
            }
        )
    }
}

export const instituteProvider = new InstituteProvider()
