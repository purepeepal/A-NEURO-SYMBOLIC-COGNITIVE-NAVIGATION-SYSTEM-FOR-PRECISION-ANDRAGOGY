/**
 * Pre-Generation Manager
 * 
 * Symposium 3.5 Directive: Pre-generate the NEXT question AFTER evaluation returns,
 * while the user reads feedback. When user clicks "Next," the question is ready instantly.
 * 
 * Architecture:
 *   User submits → Evaluate (1-2s) → Show feedback + Fire pre-gen (2-3s parallel)
 *   → User clicks "Next" → Return pre-generated question (instant or near-instant)
 * 
 * Fallback: If pre-gen fails or user clicks "Next" before it completes, 
 * fall back to on-demand generation (current behavior).
 */

interface PreGeneratedQuestion {
    question: unknown          // The pre-generated question object
    params: PreGenParams       // The params used to generate it
    generatedAt: number        // Timestamp for staleness check  
    promise: Promise<unknown>  // The generation promise
    resolved: boolean          // Whether the promise has resolved
}

interface PreGenParams {
    assessmentId: string
    concept: string
    difficulty: number
    topic: string
}

// ─── In-Memory Cache (per-session, server-side) ────────────────────
const preGenCache = new Map<string, PreGeneratedQuestion>()

// TTL: 60 seconds — if user takes longer than 1 min on feedback, pre-gen expires
const PRE_GEN_TTL_MS = 60_000

import { createLogger } from '@/lib/logger'
const logger = createLogger({ requestId: 'pre-generation' })

/**
 * Fire pre-generation for the next question.
 * Called immediately after evaluation succeeds.
 * Does NOT block — returns immediately.
 */
export function startPreGeneration(
    assessmentId: string,
    generateFn: () => Promise<unknown>,
    params: PreGenParams
): void {
    // Clear any existing pre-gen for this assessment
    preGenCache.delete(assessmentId)

    const entry: PreGeneratedQuestion = {
        question: null,
        params,
        generatedAt: Date.now(),
        resolved: false,
        promise: generateFn()
            .then(question => {
                entry.question = question
                entry.resolved = true
                return question
            })
            .catch(error => {
                logger.warn(`[PreGen:${assessmentId}] Pre-generation failed:`, { detail: String(error) })
                // Don't cache failed results — fall through to on-demand
                preGenCache.delete(assessmentId)
                return null
            }),
    }

    preGenCache.set(assessmentId, entry)
}

/**
 * Retrieve pre-generated question if available.
 * Returns the question if ready, or awaits the promise if still generating.
 * Returns null if no pre-gen exists or it failed.
 */
export async function getPreGeneratedQuestion(
    assessmentId: string
): Promise<unknown | null> {
    const entry = preGenCache.get(assessmentId)
    if (!entry) return null

    // Check staleness
    if (Date.now() - entry.generatedAt > PRE_GEN_TTL_MS) {
        preGenCache.delete(assessmentId)
        logger.warn(`[PreGen:${assessmentId}] Pre-gen expired (TTL exceeded)`)
        return null
    }

    // If already resolved, return immediately
    if (entry.resolved) {
        preGenCache.delete(assessmentId) // Consume it
        return entry.question
    }

    // Still generating — await the promise (user clicked "Next" fast)
    try {
        const question = await entry.promise
        preGenCache.delete(assessmentId) // Consume it
        return question
    } catch {
        preGenCache.delete(assessmentId)
        return null
    }
}

/**
 * Check if a pre-generated question is ready (non-blocking).
 * Used to decide whether to show "Next" button vs "Preparing..." state.
 */
export function isPreGenReady(assessmentId: string): boolean {
    const entry = preGenCache.get(assessmentId)
    return entry?.resolved ?? false
}

/**
 * Clean up pre-gen cache for a completed/abandoned session.
 */
export function clearPreGeneration(assessmentId: string): void {
    preGenCache.delete(assessmentId)
}

/**
 * Periodic cleanup of stale entries (call from a timer or on request).
 */
export function cleanupStalePreGens(): void {
    const now = Date.now()
    for (const [id, entry] of preGenCache) {
        if (now - entry.generatedAt > PRE_GEN_TTL_MS) {
            preGenCache.delete(id)
        }
    }
}
