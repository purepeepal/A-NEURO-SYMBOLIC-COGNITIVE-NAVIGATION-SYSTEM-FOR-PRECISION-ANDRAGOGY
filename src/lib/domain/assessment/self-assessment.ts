import { MASTERY_CONFIG } from './mastery-config'
import type { PrerequisiteTree, ConceptNode } from '@/lib/llm/types'

export interface SubTopicRating {
    subTopic: string
    confidence: number // 1-5
}

export interface CalibrationResult {
    subTopic: string
    selfRating: number
    measuredPerformance: number // 0-100
    calibrationGap: number
    calibrationType: 'well-calibrated' | 'overconfident' | 'underconfident' | 'insufficient_data' | 'emerging_signal'
    insight?: string
    /** Number of direct questions used for this concept */
    directQuestions?: number
    /** True if calibration was computed from pooled prerequisite-related concepts */
    clustered?: boolean
}

export function computeCalibration(
    selfRatings: SubTopicRating[],
    quizPerformance: Map<string, { correct: number, total: number }>
): CalibrationResult[] {
    return selfRatings.map(rating => {
        const perf = quizPerformance.get(rating.subTopic);

        if (!perf || perf.total < MASTERY_CONFIG.MIN_QUESTIONS_PER_CONCEPT) {
            return {
                subTopic: rating.subTopic,
                selfRating: rating.confidence,
                measuredPerformance: perf ? (perf.correct / perf.total) * 100 : 0,
                calibrationGap: 0,
                calibrationType: 'insufficient_data' as const
            }
        }

        const measuredScore = (perf.correct / perf.total) * 5; // Normalize to 1-5
        const gap = rating.confidence - measuredScore;

        return {
            subTopic: rating.subTopic,
            selfRating: rating.confidence,
            measuredPerformance: (perf.correct / perf.total) * 100,
            calibrationGap: gap,
            calibrationType:
                Math.abs(gap) < MASTERY_CONFIG.CALIBRATION_GAP_THRESHOLD ? 'well-calibrated' :
                    gap > 0 ? 'overconfident' : 'underconfident'
        }
    }).filter(Boolean) as CalibrationResult[];
}

// -------------------------------------------------------------------------------------------------
// PER-QUESTION CONFIDENCE CALIBRATION (activates confidence_level dead data)
// -------------------------------------------------------------------------------------------------

export interface DunningKrugerSignal {
    concept: string
    avgConfidence: number     // 1-3 scale
    accuracy: number          // 0-1
    totalQuestions: number
    signal: 'overconfident' | 'underconfident' | 'well-calibrated' | 'insufficient_data' | 'emerging_signal'
    description: string
}

export interface ConfidenceCalibrationSummary {
    signals: DunningKrugerSignal[]
    overallBias: number       // positive = overconfident, negative = underconfident
    overconfidentCount: number
    underconfidentCount: number
    calibratedCount: number
}

/**
 * Computes per-question confidence calibration by comparing the user's
 * self-reported confidence level (1ΓÇô3: low/medium/high) with actual correctness.
 *
 * Maps confidence 1ΓÇô3 ΓåÆ expected accuracy bands:
 *   1 (low)    ΓåÆ expects ~33% accuracy
 *   2 (medium) ΓåÆ expects ~66% accuracy
 *   3 (high)   ΓåÆ expects ~100% accuracy
 *
 * Then detects overconfidence (high confidence + low accuracy) and
 * underconfidence (low confidence + high accuracy) per concept.
 */
export function computeConfidenceCalibration(
    responses: Array<{ concept: string; confidence_level: number | null; is_correct: boolean | null }>
): ConfidenceCalibrationSummary {
    // Filter to responses with both confidence AND evaluation
    const rated = responses.filter(
        r => r.confidence_level != null && r.is_correct != null
    ) as Array<{ concept: string; confidence_level: number; is_correct: boolean }>

    // Group by concept
    const byConcept = new Map<string, typeof rated>()
    for (const r of rated) {
        const group = byConcept.get(r.concept) || []
        group.push(r)
        byConcept.set(r.concept, group)
    }

    const signals: DunningKrugerSignal[] = []

    for (const [concept, items] of byConcept) {
        if (items.length < MASTERY_CONFIG.MIN_QUESTIONS_PER_CONCEPT) {
            // Exactly 1 question ΓåÆ emerging signal (preliminary calibration)
            if (items.length === 1) {
                const avgConfidence = items[0].confidence_level
                const accuracy = items[0].is_correct ? 1 : 0
                signals.push({
                    concept,
                    avgConfidence,
                    accuracy,
                    totalQuestions: 1,
                    signal: 'emerging_signal',
                    description: `Preliminary signal from 1 question ΓÇö ${items[0].is_correct ? 'answered correctly' : 'answered incorrectly'} with ${avgConfidence === 3 ? 'high' : avgConfidence === 2 ? 'medium' : 'low'} confidence.`
                })
            } else {
                signals.push({
                    concept,
                    avgConfidence: 0,
                    accuracy: 0,
                    totalQuestions: items.length,
                    signal: 'insufficient_data',
                    description: `Only ${items.length} rated question${items.length === 1 ? '' : 's'} ΓÇö need more data.`
                })
            }
            continue
        }

        const avgConfidence = items.reduce((s, r) => s + r.confidence_level, 0) / items.length
        const accuracy = items.filter(r => r.is_correct).length / items.length

        // Map confidence 1-3 to expected accuracy: 1ΓåÆ0.33, 2ΓåÆ0.66, 3ΓåÆ1.0
        const expectedAccuracy = avgConfidence / 3
        const gap = expectedAccuracy - accuracy // positive = overconfident

        let signal: DunningKrugerSignal['signal']
        let description: string

        if (Math.abs(gap) < 0.2) {
            signal = 'well-calibrated'
            description = `Your confidence matches your performance on ${concept}.`
        } else if (gap > 0) {
            signal = 'overconfident'
            description = `You rated ${concept} with high confidence but got ${Math.round((1 - accuracy) * 100)}% wrong ΓÇö worth revisiting.`
        } else {
            signal = 'underconfident'
            description = `You doubted ${concept} but performed well (${Math.round(accuracy * 100)}% correct) ΓÇö trust your knowledge more.`
        }

        signals.push({ concept, avgConfidence, accuracy, totalQuestions: items.length, signal, description })
    }

    const meaningful = signals.filter(s => s.signal !== 'insufficient_data')
    const overconfidentCount = meaningful.filter(s => s.signal === 'overconfident').length
    const underconfidentCount = meaningful.filter(s => s.signal === 'underconfident').length
    const calibratedCount = meaningful.filter(s => s.signal === 'well-calibrated').length

    // Overall bias: avg(expectedAccuracy - actualAccuracy) across all rated responses
    const overallBias = rated.length > 0
        ? rated.reduce((s, r) => s + (r.confidence_level / 3) - (r.is_correct ? 1 : 0), 0) / rated.length
        : 0

    return { signals, overallBias, overconfidentCount, underconfidentCount, calibratedCount }
}

// -------------------------------------------------------------------------------------------------
// CLUSTERED CALIBRATION ΓÇö pools prerequisite-related concepts for low-data concepts
// -------------------------------------------------------------------------------------------------

/**
 * Builds an adjacency map from the prerequisite tree.
 * Each concept maps to its direct neighbors (both prerequisites AND dependents).
 */
function buildAdjacencyMap(tree: PrerequisiteTree): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>()
    for (const node of tree.concepts) {
        if (!adj.has(node.name)) adj.set(node.name, new Set())
        for (const prereq of node.prerequisites) {
            if (!adj.has(prereq)) adj.set(prereq, new Set())
            adj.get(node.name)!.add(prereq)
            adj.get(prereq)!.add(node.name)
        }
    }
    return adj
}

/**
 * Finds all concepts within a given graph distance from a source concept.
 * Returns a map of concept name ΓåÆ distance (1 = direct neighbor, 2 = two hops, etc.)
 */
function findRelatedConcepts(
    source: string,
    adj: Map<string, Set<string>>,
    maxDistance: number = 2
): Map<string, number> {
    const distances = new Map<string, number>()
    const queue: Array<{ name: string; dist: number }> = [{ name: source, dist: 0 }]
    const visited = new Set<string>([source])

    while (queue.length > 0) {
        const { name, dist } = queue.shift()!
        if (dist > 0) distances.set(name, dist)
        if (dist >= maxDistance) continue

        const neighbors = adj.get(name)
        if (!neighbors) continue
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor)
                queue.push({ name: neighbor, dist: dist + 1 })
            }
        }
    }

    return distances
}

/**
 * Computes calibration with concept clustering for low-data concepts.
 *
 * For concepts with >= MIN_QUESTIONS_PER_CONCEPT direct questions:
 *   Uses standard calibration (same as computeCalibration).
 *
 * For concepts with exactly 1 question:
 *   Pools performance from prerequisite-related concepts (weighted by distance)
 *   and marks as 'emerging_signal' with a caveat.
 *
 * For concepts with 0 questions:
 *   Remains 'insufficient_data'.
 */
export function computeClusteredCalibration(
    selfRatings: SubTopicRating[],
    quizPerformance: Map<string, { correct: number; total: number }>,
    prerequisiteTree: PrerequisiteTree
): CalibrationResult[] {
    const adj = buildAdjacencyMap(prerequisiteTree)

    return selfRatings.map(rating => {
        const perf = quizPerformance.get(rating.subTopic)

        // --- Sufficient direct data: standard calibration ---
        if (perf && perf.total >= MASTERY_CONFIG.MIN_QUESTIONS_PER_CONCEPT) {
            const measuredScore = (perf.correct / perf.total) * 5
            const gap = rating.confidence - measuredScore

            return {
                subTopic: rating.subTopic,
                selfRating: rating.confidence,
                measuredPerformance: (perf.correct / perf.total) * 100,
                calibrationGap: gap,
                calibrationType:
                    Math.abs(gap) < MASTERY_CONFIG.CALIBRATION_GAP_THRESHOLD ? 'well-calibrated' as const :
                        gap > 0 ? 'overconfident' as const : 'underconfident' as const,
                directQuestions: perf.total,
                clustered: false
            }
        }

        // --- Has exactly 1 question: pool from related concepts ---
        if (perf && perf.total === 1) {
            const related = findRelatedConcepts(rating.subTopic, adj, 2)
            let weightedCorrect = perf.correct  // direct question at weight 1.0
            let weightedTotal = perf.total       // = 1

            for (const [relatedConcept, distance] of related) {
                const relatedPerf = quizPerformance.get(relatedConcept)
                if (!relatedPerf || relatedPerf.total === 0) continue

                // Distance-based weighting: 1/(2^distance)
                // distance=1 ΓåÆ weight 0.5, distance=2 ΓåÆ weight 0.25
                const weight = 1 / Math.pow(2, distance)
                weightedCorrect += relatedPerf.correct * weight
                weightedTotal += relatedPerf.total * weight
            }

            const pooledAccuracy = weightedTotal > 0 ? weightedCorrect / weightedTotal : 0
            const measuredScore = pooledAccuracy * 5
            const gap = rating.confidence - measuredScore

            return {
                subTopic: rating.subTopic,
                selfRating: rating.confidence,
                measuredPerformance: pooledAccuracy * 100,
                calibrationGap: gap,
                calibrationType: 'emerging_signal' as const,
                insight: `Based on 1 direct question + ${related.size} related concept${related.size === 1 ? '' : 's'}. Treat as a preliminary signal.`,
                directQuestions: 1,
                clustered: true
            }
        }

        // --- Zero questions: insufficient data ---
        return {
            subTopic: rating.subTopic,
            selfRating: rating.confidence,
            measuredPerformance: 0,
            calibrationGap: 0,
            calibrationType: 'insufficient_data' as const,
            directQuestions: 0,
            clustered: false
        }
    })
}
