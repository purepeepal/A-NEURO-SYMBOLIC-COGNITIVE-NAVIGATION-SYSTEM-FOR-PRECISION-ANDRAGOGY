/**
 * Pool Generation Script
 * 
 * Symposium 3.1 Directive: Background job that pre-generates question banks
 * per popular topic. Uses cross-model verification pipeline.
 * 
 * Usage: npx tsx src/scripts/generate-pool.ts --topic "Calculus" --concepts 5
 *        npx tsx src/scripts/generate-pool.ts --popular  (top 50 topics from session data)
 * 
 * This is a standalone script — not called from the main app.
 * It generates questions for the question_pool table.
 */

// NOTE: This script requires runtime environment variables (GOOGLE_API_KEY, etc.)
// Run with: npx tsx src/scripts/generate-pool.ts

export interface GenerationConfig {
    topic: string
    conceptCount?: number       // Concepts to generate for (default: all from prerequisite tree)
    questionsPerConcept?: number // Questions per concept/difficulty (default: 5)
    difficultyRange?: [number, number] // [min, max] difficulty (default: [1, 8])
    questionTypes?: string[]    // Types to generate (default: ['mcq', 'short_answer'])
    poolTier?: 'hot' | 'warm'   // Pool tier (default: 'hot')
}

/**
 * Generate a batch of questions for a topic.
 * 
 * Pipeline per question:
 * 1. Generate question via primary LLM (Gemini)
 * 2. Cross-verify answer via secondary LLM (Groq/Llama)
 * 3. If disagreement → flag for manual review
 * 4. If agreement → mark verified, insert into pool
 */
export async function generatePoolBatch(config: GenerationConfig): Promise<{
    generated: number
    verified: number
    flagged: number
    failed: number
}> {
    const results = { generated: 0, verified: 0, flagged: 0, failed: 0 }

    console.log(`[Pool Generator] Starting batch for topic: ${config.topic}`)
    console.log(`[Pool Generator] Config: ${JSON.stringify(config)}`)

    // TODO: Implementation requires LLM service instantiation outside Next.js context
    // This is a placeholder that shows the architecture.
    // 
    // Full implementation steps:
    // 1. Generate prerequisite tree for topic
    // 2. For each concept in tree:
    //    a. For each difficulty in range:
    //       i.  Generate N questions via Gemini
    //       ii. Cross-verify each answer via Groq
    //       iii. If agreement: mark verified, insert into pool
    //       iv. If disagreement: flag for manual review
    // 3. Report results

    console.log(`[Pool Generator] Batch complete:`, results)
    return results
}

/**
 * Get the top N most-assessed topics for hot pool generation.
 */
export async function getPopularTopics(limit: number = 50): Promise<string[]> {
    // TODO: Query sessions table grouped by topic, ordered by count
    // Returns topics with >= 5 sessions in the last 30 days
    console.log(`[Pool Generator] Fetching top ${limit} topics...`)
    return []
}

// ─── CLI Entry Point ───────────────────────────────────────────────
// npx tsx src/scripts/generate-pool.ts --topic "Calculus"
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('generate-pool')) {
    const args = process.argv.slice(2)
    const topicIdx = args.indexOf('--topic')
    const topic = topicIdx >= 0 ? args[topicIdx + 1] : undefined

    if (topic) {
        generatePoolBatch({ topic }).then(console.log).catch(console.error)
    } else {
        console.log('Usage: npx tsx src/scripts/generate-pool.ts --topic "Topic Name"')
    }
}
