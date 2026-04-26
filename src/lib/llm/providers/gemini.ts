/**
 * Gemini Provider Core ΓÇö model initialization, generateWithRetry, cost tracking
 *
 * Extracted from the monolithic gemini.ts (601 lines).
 * All domain logic lives in services/ ΓÇö this is pure infrastructure.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { LLM_CONFIG, TOKEN_BUDGETS } from '../config'
import { llmQueue } from '../queue'
import { costTracker } from '../cost-tracker'
import { validateWithRetry } from '../call'
import { z } from 'zod'
import type { LLMProviderCore } from './types'

export class GeminiProvider implements LLMProviderCore {
    name = 'gemini'
    private model: GenerativeModel
    private isInitialized = false
    private currentAssessmentId: string | null = null

    constructor() {
        // Lazy initialization to avoid issues with env vars
        this.model = null!
    }

    /** Set the current assessment ID for cost tracking */
    setAssessmentId(id: string | null) {
        this.currentAssessmentId = id
    }

    initialize() {
        if (this.isInitialized) return

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set')
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        this.model = genAI.getGenerativeModel({
            model: LLM_CONFIG.model,
            generationConfig: LLM_CONFIG.generationConfig,
        })
        this.isInitialized = true
    }

    /**
     * Generate with central schema validation shield and queue
     */
    async generateWithRetry<T>(
        prompt: string,
        schema: z.ZodType<T>,
        requestType: string,
        priority: number = 5,
        temperature?: number
    ): Promise<T> {
        const startTime = Date.now()
        let attemptCount = 0
        let parseSuccess = true
        let inputTokens: number | undefined
        let outputTokens: number | undefined

        return llmQueue.enqueue(async () => {
            try {
                const result = await validateWithRetry(
                    async () => {
                        attemptCount++
                        // Apply per-prompt token budget — avoids wasting tokens on small responses
                        const maxOutputTokens = TOKEN_BUDGETS[requestType] ?? LLM_CONFIG.generationConfig.maxOutputTokens
                        const genConfig = {
                            ...LLM_CONFIG.generationConfig,
                            maxOutputTokens,
                            ...(temperature !== undefined ? { temperature } : {}),
                        }
                        const genResult = await this.model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: genConfig
                        })

                        // Extract token usage from response metadata
                        const usage = genResult.response.usageMetadata
                        if (usage) {
                            inputTokens = usage.promptTokenCount
                            outputTokens = usage.candidatesTokenCount
                        }

                        return genResult.response.text()
                    },
                    schema,
                    {
                        label: `gemini_${requestType}`,
                        maxRetries: LLM_CONFIG.retry.maxAttempts
                    }
                )
                return result
            } catch (error) {
                parseSuccess = false
                throw error
            } finally {
                // Fire-and-forget cost logging
                const durationMs = Date.now() - startTime

                if (this.currentAssessmentId) {
                    costTracker.logCall({
                        assessmentId: this.currentAssessmentId,
                        promptType: requestType,
                        inputTokens: inputTokens || 0,
                        outputTokens: outputTokens || 0,
                        totalTokens: (inputTokens || 0) + (outputTokens || 0),
                        model: LLM_CONFIG.model,
                        durationMs: durationMs,
                        parseSuccess: parseSuccess,
                        attemptCount: attemptCount
                    }).catch(() => {/* swallow */ })
                }
            }
        }, priority)
    }
}

export const geminiProvider = new GeminiProvider()
