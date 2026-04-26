import { Database } from '@/types/database'

type ResponseRow = Database['public']['Tables']['responses']['Row']

export interface ConfidenceIndicator {
    concept: string
    sampleSize: number
    consistency: number     // 0-1: variance in correctness
    confidenceLevel: number // 0-100
    label: string           // Human-readable
    caveat?: string         // "Need more data" etc.
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
    if (sampleSize === 1) return "Brief glimpse — need more data"

    if (confidenceLevel >= 80) return "High confidence"
    if (confidenceLevel >= 55) return "Moderate confidence"
    return "Low confidence — early signal"
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
            label: 'Brief glimpse — need more data',
            caveat: 'Need more data'
        }
    }

    // Map correctness to exactly 1 or 0 binary for variance calculation
    const correctnessArray = responses.map(r => r.is_correct ? 1 : 0)

    // Consistency is inverse of variance. (0 SD = perfect consistency = 1)
    const sd = standardDeviation(correctnessArray)
    const consistency = Math.max(0, 1 - sd)

    // Base confidence scales linearly with sample size up to a cap
    const base = Math.min(90, 50 + n * 8)

    // Final level weighs base sample size against response consistency
    const confidenceLevel = Math.round(base * (0.5 + 0.5 * consistency))

    return {
        concept,
        sampleSize: n,
        consistency,
        confidenceLevel,
        label: generateLabel(confidenceLevel, n),
        caveat: n < 4 ? 'More questions would help clarify this area' : undefined
    }
}
