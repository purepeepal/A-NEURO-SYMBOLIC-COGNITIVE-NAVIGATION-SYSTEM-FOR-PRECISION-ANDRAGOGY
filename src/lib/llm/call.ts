/**
 * Centralized LLM Call Wrapper — callLLM
 * 
 * Symposium 3.2 Directive: ALL LLM calls route through this single entry point.
 * Implements: retry → repair → fallback → abort hierarchy.
 * 
 * Design principle: NEVER crash the session on LLM validation failure.
 * Log everything, degrade gracefully.
 */
import { z } from 'zod'
import { DEFAULT_REPAIRS, type RepairFn } from './repair'
import { createLogger } from '@/lib/logger'
const logger = createLogger({ requestId: 'llm-call' })

// ─── Custom Error ──────────────────────────────────────────────────
export class LLMValidationError extends Error {
    public zodError: z.ZodError
    public rawResponse: unknown

    constructor(zodError: z.ZodError, rawResponse?: unknown) {
        super(`LLM validation failed: ${zodError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`)
        this.name = 'LLMValidationError'
        this.zodError = zodError
        this.rawResponse = rawResponse
    }
}

// ─── Options ───────────────────────────────────────────────────────
export interface LLMCallOptions<T> {
    /** Maximum retries on validation failure (default: 1) */
    maxRetries?: number
    /** Static fallback value if all strategies fail */
    fallback?: T
    /** Custom repair strategies (default: DEFAULT_REPAIRS) */
    repairStrategies?: RepairFn[]
    /** Label for logging/debugging */
    label?: string
    /** Skip validation (for verified/curated questions) */
    skipValidation?: boolean
}

// ─── Core Validation Function ──────────────────────────────────────

/**
 * Validates and parses a raw LLM response string against a Zod schema.
 * Implements the retry → repair → fallback → abort hierarchy.
 * 
 * This does NOT call the LLM — it processes the raw text response.
 * Use it to wrap existing LLM service calls:
 * 
 * ```ts
 * const rawText = await geminiCall(prompt) // returns string
 * const validated = validateLLMResponse(rawText, QuestionSchema, { label: 'generateQuestion' })
 * ```
 */
export function validateLLMResponse<T>(
    rawText: string,
    schema: z.ZodType<T>,
    options: LLMCallOptions<T> = {}
): T {
    const {
        repairStrategies = DEFAULT_REPAIRS,
        fallback,
        label = 'unknown',
        skipValidation = false,
    } = options

    // Fast path: skip validation for pre-verified content
    if (skipValidation) {
        try {
            return JSON.parse(rawText) as T
        } catch {
            logger.warn(`[LLM:${label}] Skip-validation JSON parse failed, falling through to repair`)
        }
    }

    // Step 1: Try direct parse + validate
    let parsed: unknown
    try {
        parsed = JSON.parse(rawText)
        const result = schema.safeParse(parsed)
        if (result.success) return result.data

        // Direct parse succeeded but validation failed — log and try repairs
        logger.warn(`[LLM:${label}] Validation failed on direct parse:`, {
            detail: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
        })
    } catch {
        // JSON.parse failed — try repairs on the raw text
        logger.warn(`[LLM:${label}] JSON.parse failed, attempting repairs`)
    }

    // Step 2: Apply repair strategies sequentially
    let repairedText = rawText
    for (const repair of repairStrategies) {
        try {
            repairedText = repair(repairedText)
            parsed = JSON.parse(repairedText)
            const result = schema.safeParse(parsed)
            if (result.success) {
                logger.info(`[LLM:${label}] Repair succeeded after ${repair.name}`)
                return result.data
            }
        } catch {
            // This repair didn't help — try the next one
        }
    }

    // Step 3: Try schema transform on whatever we parsed (even if validation failed)
    // Some schemas with .default() and .transform() can fill in missing fields
    if (parsed) {
        const lastAttempt = schema.safeParse(parsed)
        if (lastAttempt.success) return lastAttempt.data
    }

    // Step 4: Fallback
    if (fallback !== undefined) {
        logger.warn(`[LLM:${label}] All repair strategies failed, using fallback`)
        return fallback
    }

    // Step 5: Abort (last resort)
    const zodError = parsed
        ? schema.safeParse(parsed).error ?? new z.ZodError([{ code: 'custom', message: 'Parse and validation failed', path: [] }])
        : new z.ZodError([{ code: 'custom', message: `Could not parse response: ${rawText.substring(0, 200)}`, path: [] }])

    logger.error(`[LLM:${label}] CRITICAL: All strategies failed. Raw response:`, undefined, { rawResponse: rawText.substring(0, 500) })
    throw new LLMValidationError(zodError, rawText)
}

/**
 * Async version that supports retry with re-generation
 * Use this when you have access to a regeneration function
 * 
 * ```ts
 * const validated = await validateWithRetry(
 *   () => gemini.generateRaw(prompt),
 *   QuestionSchema,
 *   { label: 'generateQuestion', maxRetries: 1 }
 * )
 * ```
 */
export async function validateWithRetry<T>(
    generateFn: () => Promise<string>,
    schema: z.ZodType<T>,
    options: LLMCallOptions<T> = {}
): Promise<T> {
    const { maxRetries = 1, label = 'unknown' } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const rawText = await generateFn()
            return validateLLMResponse(rawText, schema, { ...options, label: `${label}:attempt${attempt}` })
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            if (attempt < maxRetries) {
                logger.warn(`[LLM:${label}] Attempt ${attempt + 1} failed, retrying...`)
                // Brief delay before retry
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
            }
        }
    }

    // If we have a fallback, use it
    if (options.fallback !== undefined) {
        logger.warn(`[LLM:${label}] All retries exhausted, using fallback`)
        return options.fallback
    }

    throw lastError ?? new Error(`[LLM:${label}] All retries exhausted`)
}
