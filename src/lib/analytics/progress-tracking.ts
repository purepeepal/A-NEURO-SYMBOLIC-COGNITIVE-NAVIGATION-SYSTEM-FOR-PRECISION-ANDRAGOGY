/**
 * Longitudinal Progress Tracking
 * 
 * Symposium 4.4 Directive: 4-dimensional tracking (accuracy, depth, 
 * calibration, discovery). Growth-framed visualization. 
 * Cookie-based learner ID with optional account linking.
 */
import { createClient } from '@/lib/supabase/server'

// ─── Types ─────────────────────────────────────────────────────────
export interface ProgressSnapshot {
    id?: string
    learnerId: string
    topic: string
    concept: string
    masteryLevel: 'gap' | 'partial' | 'mastered'
    accuracy: number
    bloomsDepth?: string          // Highest Bloom's level demonstrated
    calibrationDelta?: number     // Self vs reality gap
    sessionId: string
    capturedAt?: Date
}

export interface TopicProgress {
    topic: string
    sessions: SessionSnapshot[]
    overallGrowth: number         // % improvement from first to last
    conceptsDiscovered: number    // Unique concepts encountered
    currentAccuracy: number       // Latest session accuracy
}

export interface SessionSnapshot {
    sessionId: string
    accuracy: number
    questionsAnswered: number
    bloomsDepth: string
    calibrationDelta: number
    capturedAt: Date
    conceptsMastered: string[]
    conceptsGap: string[]
}

// ─── Capture Snapshot ──────────────────────────────────────────────
/**
 * Capture a progress snapshot after session completion.
 * Called automatically when a session is terminated.
 */
export async function captureProgressSnapshot(
    learnerId: string,
    sessionId: string,
    topic: string,
    conceptPerformance: Array<{
        concept: string
        accuracy: number
        bloomsDepth?: string
    }>,
    calibrationDelta?: number
): Promise<void> {
    const supabase = await createClient()

    const snapshots = conceptPerformance.map(cp => ({
        learner_id: learnerId,
        topic,
        concept: cp.concept,
        mastery_level: cp.accuracy >= 0.8 ? 'mastered' : cp.accuracy >= 0.5 ? 'partial' : 'gap',
        accuracy: cp.accuracy,
        blooms_depth: cp.bloomsDepth ?? 'unknown',
        calibration_delta: calibrationDelta ?? null,
        session_id: sessionId,
    }))

    for (const snapshot of snapshots) {
        await supabase.from('progress_snapshots').insert(snapshot)
    }

    console.info(`[Progress] Captured ${snapshots.length} concept snapshots for learner ${learnerId}`)
}

// ─── Retrieve Progress ─────────────────────────────────────────────
/**
 * Get progress timeline for a learner on a specific topic.
 * Returns sessions ordered by date with per-concept performance.
 */
export async function getTopicProgress(
    learnerId: string,
    topic: string
): Promise<TopicProgress | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('progress_snapshots')
        .select('*')
        .eq('learner_id', learnerId)
        .eq('topic', topic)
        .order('captured_at', { ascending: true })

    if (error || !data || data.length === 0) return null

    // Group by session
    const sessionMap = new Map<string, typeof data>()
    for (const row of data) {
        const sid = row.session_id
        if (!sessionMap.has(sid)) sessionMap.set(sid, [])
        sessionMap.get(sid)!.push(row)
    }

    const sessions: SessionSnapshot[] = Array.from(sessionMap.entries()).map(([sid, rows]) => {
        const accuracy = rows.reduce((sum, r) => sum + (r.accuracy ?? 0), 0) / rows.length
        return {
            sessionId: sid,
            accuracy,
            questionsAnswered: rows.length,
            bloomsDepth: rows[0]?.blooms_depth ?? 'unknown',
            calibrationDelta: rows[0]?.calibration_delta ?? 0,
            capturedAt: new Date(rows[0]?.captured_at ?? Date.now()),
            conceptsMastered: rows.filter(r => r.mastery_level === 'mastered').map(r => r.concept),
            conceptsGap: rows.filter(r => r.mastery_level === 'gap').map(r => r.concept),
        }
    })

    // Compute growth
    const firstAccuracy = sessions[0]?.accuracy ?? 0
    const lastAccuracy = sessions[sessions.length - 1]?.accuracy ?? 0
    const growth = firstAccuracy > 0 ? ((lastAccuracy - firstAccuracy) / firstAccuracy) * 100 : 0

    // Unique concepts
    const allConcepts = new Set(data.map(r => r.concept))

    return {
        topic,
        sessions,
        overallGrowth: Math.round(growth),
        conceptsDiscovered: allConcepts.size,
        currentAccuracy: lastAccuracy,
    }
}

// ─── Knowledge Map Diff ────────────────────────────────────────────
/**
 * Compute diff between two sessions' knowledge maps.
 * Returns concepts that improved, declined, or remained stable.
 */
export async function computeKnowledgeMapDiff(
    learnerId: string,
    topic: string,
    sessionId1: string,
    sessionId2: string
): Promise<{
    improved: Array<{ concept: string; before: number; after: number }>
    declined: Array<{ concept: string; before: number; after: number }>
    stable: Array<{ concept: string; accuracy: number }>
    newConcepts: string[]
}> {
    const supabase = await createClient()

    const [{ data: session1 }, { data: session2 }] = await Promise.all([
        supabase.from('progress_snapshots')
            .select('concept, accuracy')
            .eq('session_id', sessionId1)
            .eq('learner_id', learnerId),
        supabase.from('progress_snapshots')
            .select('concept, accuracy')
            .eq('session_id', sessionId2)
            .eq('learner_id', learnerId),
    ])

    const map1 = new Map((session1 ?? []).map(r => [r.concept, r.accuracy]))
    const map2 = new Map((session2 ?? []).map(r => [r.concept, r.accuracy]))

    const improved: Array<{ concept: string; before: number; after: number }> = []
    const declined: Array<{ concept: string; before: number; after: number }> = []
    const stable: Array<{ concept: string; accuracy: number }> = []
    const newConcepts: string[] = []

    for (const [concept, accuracy] of map2) {
        const before = map1.get(concept)
        if (before === undefined) {
            newConcepts.push(concept)
        } else if (accuracy > before + 0.05) {
            improved.push({ concept, before, after: accuracy })
        } else if (accuracy < before - 0.05) {
            declined.push({ concept, before, after: accuracy })
        } else {
            stable.push({ concept, accuracy })
        }
    }

    return { improved, declined, stable, newConcepts }
}
