import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limiter'
import { SubtopicsSchema } from '@/lib/api-schemas'
import { sanitizeTopic } from '@/lib/sanitize'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    const logger = createLogger({ requestId: 'api-subtopics' })
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const rl = checkRateLimit(user.id, 'standard')
        if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!)

        const body = await request.json()
        const parsed = SubtopicsSchema.safeParse(body)
        if (!parsed.success) {
            return errorResponse('MISSING_FIELDS', 'Invalid input', 400, parsed.error.flatten())
        }

        const topic = sanitizeTopic(parsed.data.topic)
        if (!topic) {
            return errorResponse('MISSING_FIELDS', 'Topic is required', 400)
        }

        // 1. Check Knowledge Graph Database (Cache) First
        const { data: cached } = await supabase
            .from('topic_subtopics')
            .select('subtopics')
            .eq('topic', topic)
            .maybeSingle()

        if (cached && cached.subtopics && cached.subtopics.length > 0) {
            return NextResponse.json({ subtopics: cached.subtopics })
        }

        // 2. Generation via Assessment Engine Prerequisite Tree
        // We use the EXACT concept names so they match the actual assessment flow
        const { assessmentEngine } = await import('@/lib/assessment/engine')
        const tree = await assessmentEngine.getTree(topic)
        // Extract up to 5 concepts to use as subtopics (mixing difficulties)
        const subtopics = tree.concepts.slice(0, 5).map(c => c.name)

        // 3. Cache the newly generated subtopics asynchronously
        if (subtopics && subtopics.length > 0) {
            // Non-blocking insert using background execution
            supabase.from('topic_subtopics').upsert({
                topic,
                subtopics
            }, { onConflict: 'topic' }).then(({ error }) => {
                if (error && error.code !== '23505') logger.error('Failed to cache subtopics:', error instanceof Error ? error : undefined)
            })
        }

        return NextResponse.json({ subtopics })
    } catch (error: any) {
        logger.error("Subtopics generation error:", error instanceof Error ? error : undefined)
        // Return fallback subtopics rather than error
        return NextResponse.json({
            subtopics: [
                `Core concepts`,
                `Problem solving techniques`,
                `Common misconceptions`,
                `Advanced applications`,
                `Real-world connections`
            ]
        })
    }
}
