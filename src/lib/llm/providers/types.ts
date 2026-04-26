/**
 * Core provider interface ΓÇö shared contract for Gemini & Groq providers
 */

import { z } from 'zod'

export interface LLMProviderCore {
    name: string
    initialize(): void
    generateWithRetry<T>(
        prompt: string,
        schema: z.ZodType<T>,
        requestType: string,
        priority?: number,
        temperature?: number
    ): Promise<T>
}
