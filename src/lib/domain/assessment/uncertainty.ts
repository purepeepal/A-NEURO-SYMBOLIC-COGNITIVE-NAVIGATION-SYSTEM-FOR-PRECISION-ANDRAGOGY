import type { ResponseRow } from '@/types/db-rows'

export interface ConfidenceIndicator {
    concept: string
    sampleSize: number
    consistency: number     // 0-1: variance in correctness
    confidenceLevel: number // 0-100
    uncertaintyRange?: number // ┬▒ range in percentage points
    label: string           // Human-readable
    caveat?: string         // "Need more data" etc.
}

/**
 * Wilson Score Confidence Interval (Agresti-Coull adjusted)
 * Provides statistically grounded confidence bounds for proportions.
 * Better than naive p = correct/total for small samples.
 */
export function wilsonScore(
    correct: number,
    total: number,
    z: number = 1.96 // 95% confidence
): { lower: number; upper: number; center: number } {
    if (total === 0) return { lower: 0, upper: 0, center: 0 }

    const p = correct / total
    const zSquared = z * z
    const denominator = 1 + zSquared / total
    const center = (p + zSquared / (2 * total)) / denominator
    const margin = z * Math.sqrt((p * (1 - p) + zSquared / (4 * total)) / total) / denominator

    return {
        lower: Math.max(0, center - margin),
        upper: Math.min(1, center + margin),
        center
    }
}

/**
 * Calculates the standard deviation of an array of numbers.
 */
function standardDeviation(arr: number[]): number {
    const n = arr.length
    if (n <= 1) return 0
    const mean = arr.reduce((a, b) => a + b) / n
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) // Bessel's correction
    return Math.sqrt(variance)
}

/**
 * Generates a human-readable label based on the calculated confidence score and sample size.
 */
function generateLabel(confidenceLevel: number, sampleSize: number): string {
    if (sampleSize === 0) return "Not yet explored"
    if (sampleSize === 1) return "Brief glimpse ΓÇö need more data"

    if (confidenceLevel >= 80) return "High confidence"
    if (confidenceLevel >= 55) return "Moderate confidence"
    return "Low confidence ΓÇö early signal"
}

/**
 * Computes the epistemological confidence of the system's assessment for a given concept.
 * Takes into account both the raw sample size (questions asked) and the behavioral consistency
 * (standard deviation of correct vs incorrect answers).
 */
export function computeConfidence(
    concept: string,
    responses: ResponseRow[]
): ConfidenceIndicator {
    const n = responses.length

    if (n === 0) {
        return {
            concept,
            sampleSize: 0,
            consistency: 0,
            confidenceLevel: 0,
            label: 'Not yet explored'
        }
    }

    if (n === 1) {
        return {
            concept,
            sampleSize: 1,
            consistency: 1,
            confidenceLevel: 40,
            label: 'Brief glimpse ΓÇö need more data',
            caveat: 'Need more data'
        }
    }

    // Map correctness to exactly 1 or 0 binary for variance calculation
    const correctnessArray: number[] = responses.map(r => r.is_correct ? 1 : 0)
    const correctCount = correctnessArray.reduce((sum, v) => sum + v, 0)

    // Consistency is inverse of variance. (0 SD = perfect consistency = 1)
    const sd = standardDeviation(correctnessArray)
    const consistency = Math.max(0, 1 - sd)

    // Wilson Score confidence interval for statistically grounded confidence
    const wilson = wilsonScore(correctCount, n)
    const confidenceLevel = Math.round(wilson.center * 100)
    const uncertaintyRange = Math.round((wilson.upper - wilson.lower) * 100)

    return {
        concept,
        sampleSize: n,
        consistency,
        confidenceLevel,
        uncertaintyRange,
        label: generateLabel(confidenceLevel, n),
        caveat: n < 4 ? 'More questions would help clarify this area' : undefined
    }
}
