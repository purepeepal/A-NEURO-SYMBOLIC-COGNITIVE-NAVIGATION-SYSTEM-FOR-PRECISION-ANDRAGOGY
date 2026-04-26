/**
 * Badge System — Competence Badges
 * 
 * Symposium 4.3 Directive: Metacognition-first badges.
 * Calibrated badge is flagship. No completion badges.
 * Reward mastery, depth, growth, and self-awareness.
 */
import { createClient } from '@/lib/supabase/server'

// ─── Badge Definitions ─────────────────────────────────────────────
export type BadgeType = 'calibrated' | 'deep_diver' | 'growth_tracker' | 'expert_analyst'

export interface BadgeDefinition {
    type: BadgeType
    name: string
    description: string
    icon: string
    tier: 'crystal' | 'gold' | 'silver' | 'platinum'
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
}

export const BADGE_DEFINITIONS: Record<BadgeType, BadgeDefinition> = {
    calibrated: {
        type: 'calibrated',
        name: 'Calibrated',
        description: 'Your self-assessment matched your measured performance (±10%)',
        icon: '🎯',
        tier: 'crystal',
        rarity: 'rare',
    },
    deep_diver: {
        type: 'deep_diver',
        name: 'Deep Diver',
        description: 'Achieved >80% accuracy with depth beyond recall',
        icon: '🔬',
        tier: 'gold',
        rarity: 'uncommon',
    },
    growth_tracker: {
        type: 'growth_tracker',
        name: 'Growth Tracker',
        description: 'Improved 20%+ on a topic between sessions',
        icon: '📈',
        tier: 'silver',
        rarity: 'uncommon',
    },
    expert_analyst: {
        type: 'expert_analyst',
        name: 'Expert Analyst',
        description: 'Achieved >90% accuracy across 3+ sub-topics',
        icon: '🎓',
        tier: 'platinum',
        rarity: 'legendary',
    },
}

// ─── Session Data for Evaluation ───────────────────────────────────
export interface SessionBadgeData {
    sessionId: string
    topic: string
    accuracy: number
    questionsAnswered: number
    calibrationDelta?: number        // |self - measured|, from self-assessment
    bloomsDepthRatio?: number        // % of questions at Apply+ level
    subTopicsMastered?: number       // Concepts with >90% accuracy
    previousAccuracyOnTopic?: number // From last session on same topic
}

// ─── Evaluation ────────────────────────────────────────────────────
/**
 * Evaluate which badges a session earns.
 * Returns array of earned badge types.
 */
export function evaluateBadges(data: SessionBadgeData): BadgeType[] {
    const earned: BadgeType[] = []

    // Calibrated: self-assessment matches reality (±10%)
    if (data.calibrationDelta !== undefined && data.calibrationDelta <= 0.10) {
        earned.push('calibrated')
    }

    // Deep Diver: >80% accuracy with depth  
    if (data.accuracy >= 0.80 && (data.bloomsDepthRatio ?? 0) >= 0.70) {
        earned.push('deep_diver')
    }

    // Growth Tracker: improved 20%+ on a topic
    if (data.previousAccuracyOnTopic !== undefined &&
        data.accuracy - data.previousAccuracyOnTopic >= 0.20) {
        earned.push('growth_tracker')
    }

    // Expert Analyst: 90%+ accuracy across 3+ sub-topics
    if (data.accuracy >= 0.90 && (data.subTopicsMastered ?? 0) >= 3) {
        earned.push('expert_analyst')
    }

    return earned
}

// ─── Persistence ───────────────────────────────────────────────────
/**
 * Award badges to a session and persist to DB.
 */
export async function awardBadges(
    data: SessionBadgeData,
    badgeTypes: BadgeType[]
): Promise<void> {
    if (badgeTypes.length === 0) return

    const supabase = await createClient()

    for (const type of badgeTypes) {
        const def = BADGE_DEFINITIONS[type]
        await supabase.from('badges').insert({
            session_id: data.sessionId,
            badge_type: type,
            topic: data.topic,
            metadata: {
                accuracy: data.accuracy,
                calibrationDelta: data.calibrationDelta,
                name: def.name,
                tier: def.tier,
            },
        })
        console.info(`[Badges] 🏆 Awarded "${def.name}" badge for session ${data.sessionId}`)
    }
}

/**
 * Get all badges for a learner (by session IDs).
 */
export async function getBadgesForSessions(
    sessionIds: string[]
): Promise<Array<{ badgeType: BadgeType; topic: string; earnedAt: string; metadata: Record<string, unknown> }>> {
    if (sessionIds.length === 0) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('badges')
        .select('*')
        .in('session_id', sessionIds)
        .order('earned_at', { ascending: false })

    if (error || !data) return []

    return data.map(b => ({
        badgeType: b.badge_type as BadgeType,
        topic: b.topic,
        earnedAt: b.earned_at,
        metadata: b.metadata ?? {},
    }))
}
