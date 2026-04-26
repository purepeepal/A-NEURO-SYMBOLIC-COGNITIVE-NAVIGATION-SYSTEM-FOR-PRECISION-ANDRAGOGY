/**
 * Token-Bucket Rate Limiter
 * 
 * In-memory rate limiting for per-user API throttling.
 * Suitable for single-instance deployments (Vercel serverless functions).
 * 
 * Tiers:
 *   standard   ΓÇö 30 req/min (DB writes, cached reads)
 *   llm-heavy  ΓÇö 10 req/min (LLM generation/evaluation)
 *   chat       ΓÇö  5 req/min (prevents free chatbot abuse)
 */
import { NextResponse } from 'next/server'

export type RateLimitTier = 'standard' | 'llm-heavy' | 'chat'

const TIER_LIMITS: Record<RateLimitTier, { maxTokens: number; refillRate: number }> = {
    standard:     { maxTokens: 30, refillRate: 30 },     // 30/min
    'llm-heavy':  { maxTokens: 10, refillRate: 10 },     // 10/min
    chat:         { maxTokens: 5,  refillRate: 5 },       // 5/min
}

interface BucketState {
    tokens: number
    lastRefill: number
}

// Per-tier, per-user buckets
const buckets = new Map<string, BucketState>()

// Periodic cleanup of stale entries (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const MAX_BUCKET_AGE_MS = 10 * 60 * 1000

let lastCleanup = Date.now()

function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
    lastCleanup = now

    for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.lastRefill > MAX_BUCKET_AGE_MS) {
            buckets.delete(key)
        }
    }
}

/**
 * Check if a request is within rate limits.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
    userId: string,
    tier: RateLimitTier
): { allowed: boolean; retryAfterMs?: number } {
    cleanup()

    const config = TIER_LIMITS[tier]
    const key = `${tier}:${userId}`
    const now = Date.now()

    let bucket = buckets.get(key)

    if (!bucket) {
        bucket = { tokens: config.maxTokens, lastRefill: now }
        buckets.set(key, bucket)
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill
    const refillAmount = (elapsed / 60000) * config.refillRate
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refillAmount)
    bucket.lastRefill = now

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1
        return { allowed: true }
    }

    // Calculate retry-after: time until 1 token is available
    const tokensNeeded = 1 - bucket.tokens
    const retryAfterMs = Math.ceil((tokensNeeded / config.refillRate) * 60000)

    return { allowed: false, retryAfterMs }
}

/**
 * Convenience: returns a 429 NextResponse for rate-limited requests.
 */
export function rateLimitResponse(retryAfterMs: number): NextResponse {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)

    return NextResponse.json(
        {
            error: {
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please slow down.',
                retryAfterMs,
            }
        },
        {
            status: 429,
            headers: {
                'Retry-After': String(retryAfterSeconds),
            }
        }
    )
}
