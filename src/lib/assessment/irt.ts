// src/lib/assessment/irt.ts
// IRT utilities for the assessment engine (1PL Rasch model adapter)
// Re-exports core IRT + provides strategy-layer convenience functions

import { calculateProbabilityCorrect, updateAbilityEstimate } from '@/lib/domain/assessment/irt'
export type { IRTParameters } from '@/lib/domain/assessment/irt'
export { calculateProbabilityCorrect, updateAbilityEstimate } from '@/lib/domain/assessment/irt'

/**
 * A single response record used for IRT ability estimation.
 */
export interface ResponseHistory {
    isCorrect: boolean
    difficulty: number  // 1-10 scale
}

interface AbilityEstimate {
    /** Raw theta on logit scale (approx -4 to +4) */
    theta: number
    /** Target difficulty mapped back to 1-10 scale */
    difficulty1to10: number
}

/**
 * Estimate a learner's ability from a sequence of responses using
 * iterative MLE with the Rasch model.
 *
 * Difficulty values are mapped from the 1-10 assessment scale to the
 * IRT logit scale (-3 to +3) before estimation.
 */
export function estimateAbility(history: ResponseHistory[]): AbilityEstimate {
    if (history.length === 0) {
        return { theta: 0, difficulty1to10: 5 }
    }

    // Map 1-10 difficulty to IRT logit scale: 1→-3, 5.5→0, 10→+3
    const toLogit = (d: number) => ((d - 1) / 9) * 6 - 3

    let theta = 0 // Start at average ability
    const learningRate = 0.4

    for (const response of history) {
        const b = toLogit(response.difficulty)
        const p = calculateProbabilityCorrect({ ability: theta, difficulty: b })
        const actual = response.isCorrect ? 1 : 0
        theta += learningRate * (actual - p)
    }

    // Clamp theta
    theta = Math.max(-4, Math.min(4, theta))

    // Map theta back to 1-10 scale for target difficulty
    const difficulty1to10 = ((theta + 3) / 6) * 9 + 1

    return {
        theta,
        difficulty1to10: Math.max(1, Math.min(10, difficulty1to10)),
    }
}

/**
 * Compute the optimal next-item difficulty for a learner at the given
 * ability level (theta). In the Rasch model, maximum information is at
 * b = theta, so we simply convert theta to the 1-10 scale.
 */
export function targetDifficulty(theta: number): number {
    const d = ((theta + 3) / 6) * 9 + 1
    return Math.max(1, Math.min(10, Math.round(d)))
}
