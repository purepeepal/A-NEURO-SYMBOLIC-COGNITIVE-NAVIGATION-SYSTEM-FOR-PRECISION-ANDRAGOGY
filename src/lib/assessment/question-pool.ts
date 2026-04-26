/**
 * Question Pool Manager
 * 
 * Symposium 3.1 Directive: Two-tier pooling (hot batch + warm on-demand).
 * Freshness decay for overused questions. Random selection, least-used first.
 * 
 * Architecture:
 *   Hot pool:  Batch-generated for top topics (nightly/on-demand)
 *   Warm pool: On-demand cached for long-tail topics (generated on first use)
 * 
 * Fallback: If pool is empty for a topic/concept/difficulty, 
 *   return null → caller falls back to real-time generation (current behavior).
 */
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'question-pool' })

// ─── Types ─────────────────────────────────────────────────────────
export interface PooledQuestion {
    id: string
    topic: string
    concept: string
    difficulty: number
    questionType: string
    questionText: string
    options: Record<string, string> | null
    correctAnswer: string
    acceptableAnswers: string[]
    objective: string
    deductionSpace: Record<string, unknown>
    competencyLevel: string | null
    verified: boolean
    verificationMethod: string | null
    poolTier: 'hot' | 'warm'
    timesUsed: number
}

export interface PoolQueryParams {
    topic: string
    concept: string
    difficulty: number
    questionType?: string
}

// ─── Selection (Least-Used + Random) ───────────────────────────────
/**
 * Select a question from the pool.
 * Prioritizes least-used, verified questions.
 * Returns null if pool is empty for this combination.
 */
export async function selectFromPool(
    params: PoolQueryParams
): Promise<PooledQuestion | null> {
    const supabase = await createClient()

    let query = supabase
        .from('question_pool')
        .select('*')
        .eq('topic', params.topic)
        .eq('concept', params.concept)
        .eq('difficulty', params.difficulty)
        .eq('verified', true)
        .eq('retired', false)
        .order('times_used', { ascending: true })
        .limit(5) // Get top 5 least-used, then randomize

    if (params.questionType) {
        query = query.eq('question_type', params.questionType)
    }

    const { data, error } = await query

    if (error || !data || data.length === 0) return null

    // Random selection from least-used candidates
    const selected = data[Math.floor(Math.random() * data.length)]

    // Increment usage count
    await supabase
        .from('question_pool')
        .update({ times_used: (selected.times_used || 0) + 1 })
        .eq('id', selected.id)

    // Check retirement threshold
    if ((selected.times_used || 0) + 1 > 100) {
        await supabase
            .from('question_pool')
            .update({ retired: true })
            .eq('id', selected.id)
        console.info(`[Pool] Question ${selected.id} retired after 100+ uses`)
    }

    return {
        id: selected.id,
        topic: selected.topic,
        concept: selected.concept,
        difficulty: selected.difficulty,
        questionType: selected.question_type,
        questionText: selected.question_text,
        options: selected.options,
        correctAnswer: selected.correct_answer,
        acceptableAnswers: selected.acceptable_answers ?? [],
        objective: selected.objective,
        deductionSpace: selected.deduction_space,
        competencyLevel: selected.competency_level,
        verified: selected.verified,
        verificationMethod: selected.verification_method,
        poolTier: selected.pool_tier,
        timesUsed: selected.times_used,
    }
}

// ─── Insertion (from batch generation or on-demand caching) ────────
/**
 * Insert a newly generated question into the pool.
 * Used by both batch generation and on-demand warm caching.
 */
export async function insertIntoPool(
    question: Omit<PooledQuestion, 'id' | 'timesUsed'>,
): Promise<string | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('question_pool')
        .insert({
            topic: question.topic,
            concept: question.concept,
            difficulty: question.difficulty,
            question_type: question.questionType,
            question_text: question.questionText,
            options: question.options,
            correct_answer: question.correctAnswer,
            acceptable_answers: question.acceptableAnswers,
            objective: question.objective,
            deduction_space: question.deductionSpace,
            competency_level: question.competencyLevel,
            verified: question.verified,
            verification_method: question.verificationMethod,
            pool_tier: question.poolTier,
        })
        .select('id')
        .single()

    if (error) {
        logger.error('[Pool] Insert failed:', error)
        return null
    }

    return data?.id ?? null
}

// ─── Pool Metrics ──────────────────────────────────────────────────
export interface PoolMetrics {
    totalQuestions: number
    verifiedCount: number
    retiredCount: number
    hotCount: number
    warmCount: number
    topicCoverage: { topic: string; count: number }[]
}

/**
 * Get pool coverage metrics.
 */
export async function getPoolMetrics(): Promise<PoolMetrics> {
    const supabase = await createClient()

    const { count: totalQuestions } = await supabase
        .from('question_pool')
        .select('*', { count: 'exact', head: true })

    const { count: verifiedCount } = await supabase
        .from('question_pool')
        .select('*', { count: 'exact', head: true })
        .eq('verified', true)

    const { count: retiredCount } = await supabase
        .from('question_pool')
        .select('*', { count: 'exact', head: true })
        .eq('retired', true)

    const { count: hotCount } = await supabase
        .from('question_pool')
        .select('*', { count: 'exact', head: true })
        .eq('pool_tier', 'hot')

    const { count: warmCount } = await supabase
        .from('question_pool')
        .select('*', { count: 'exact', head: true })
        .eq('pool_tier', 'warm')

    return {
        totalQuestions: totalQuestions ?? 0,
        verifiedCount: verifiedCount ?? 0,
        retiredCount: retiredCount ?? 0,
        hotCount: hotCount ?? 0,
        warmCount: warmCount ?? 0,
        topicCoverage: [], // TODO: aggregate by topic
    }
}
