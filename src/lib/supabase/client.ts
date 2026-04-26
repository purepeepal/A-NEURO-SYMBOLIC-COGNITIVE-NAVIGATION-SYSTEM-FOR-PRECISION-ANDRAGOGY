import { createBrowserClient } from '@supabase/ssr'

/**
 * Resilient fetch wrapper that converts opaque "Failed to fetch" TypeErrors
 * into actionable console warnings so they don't flood the dev console.
 */
const resilientFetch: typeof fetch = async (input, init) => {
    try {
        return await fetch(input, init)
    } catch (err) {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine
        console.warn(
            `[STREETS] Supabase request failed${
                offline ? ' (device is offline)' : ' — check network / Supabase status'
            }`
        )
        throw err // re-throw so Supabase's retry logic still works
    }
}

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { fetch: resilientFetch } }
    )
}
