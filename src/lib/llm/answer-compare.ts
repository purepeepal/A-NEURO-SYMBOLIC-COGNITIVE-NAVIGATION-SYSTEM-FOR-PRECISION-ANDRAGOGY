/**
 * Answer comparison utilities for assessment evaluation
 * Handles normalization and semantic equivalence
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'answer-compare' })

export interface ComparisonResult {
    isCorrect: boolean
    confidence: number
    normalizedUser: string
    normalizedCorrect: string
    method: 'exact' | 'normalized' | 'numeric' | 'semantic'
}

/**
 * Compare user answer with correct answer
 * Handles various formats and normalizations
 */
/**
 * Compare user answer with correct answer
 * Handles various formats and normalizations, with LLM fallback
 */
export async function compareAnswers(
    questionText: string, // Added question context
    userAnswer: string,
    correctAnswer: string,
    questionType: 'mcq' | 'short_answer' | 'true_false'
): Promise<ComparisonResult> {
    // 1. Fast path: Normalization checks
    const normalizedUser = normalizeAnswer(userAnswer)
    const normalizedCorrect = normalizeAnswer(correctAnswer)

    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) {
        return {
            isCorrect: true,
            confidence: 1.0,
            normalizedUser,
            normalizedCorrect,
            method: 'normalized',
        }
    }

    // For MCQ and true_false, only exact match counts
    if (questionType === 'mcq' || questionType === 'true_false') {
        return {
            isCorrect: false,
            confidence: 1.0,
            normalizedUser,
            normalizedCorrect,
            method: 'exact',
        }
    }

    // For short_answer, try additional comparisons
    // Check numeric equivalence
    const numericResult = compareNumeric(normalizedUser, normalizedCorrect)
    if (numericResult.isEquivalent) {
        return {
            isCorrect: true,
            confidence: numericResult.confidence,
            normalizedUser,
            normalizedCorrect,
            method: 'numeric',
        }
    }

    // Check if answer is contained (for longer correct answers)
    if (normalizedCorrect.includes(normalizedUser) && normalizedUser.length > 3) {
        return {
            isCorrect: true,
            confidence: 0.8,
            normalizedUser,
            normalizedCorrect,
            method: 'normalized',
        }
    }

    // 4. LLM Verification Fallback (for short_answer only)
    if (questionType === 'short_answer') {
        try {
            const { gemini } = await import('@/lib/llm') // Dynamic import to avoid cycles
            const validation = await gemini.verifyAnswer(questionText, correctAnswer, userAnswer)

            return {
                isCorrect: validation.isCorrect,
                confidence: validation.confidence,
                normalizedUser,
                normalizedCorrect,
                method: 'semantic', // New method type
            }
        } catch (e) {
            logger.error('LLM Verification Failed', e)
        }
    }

    return {
        isCorrect: false,
        confidence: 1.0,
        normalizedUser,
        normalizedCorrect,
        method: 'normalized',
    }
}

/**
 * Normalize answer for comparison
 */
function normalizeAnswer(answer: string): string {
    return answer
        .toLowerCase()
        .trim()
        // Remove common prefix/suffix words
        .replace(/^(the|a|an)\s+/i, '')
        .replace(/\s+(is|are|was|were)$/i, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove punctuation at end
        .replace(/[.,!?;:]+$/g, '')
        // Remove quotes
        .replace(/['"]/g, '')
}

/**
 * Compare numeric values with tolerance
 */
function compareNumeric(a: string, b: string): { isEquivalent: boolean; confidence: number } {
    // Try to extract numbers
    const numA = extractNumber(a)
    const numB = extractNumber(b)

    if (numA === null || numB === null) {
        return { isEquivalent: false, confidence: 0 }
    }

    // Check if equal within tolerance
    const tolerance = Math.abs(numB) * 0.01 // 1% tolerance
    const isEquivalent = Math.abs(numA - numB) <= tolerance

    return {
        isEquivalent,
        confidence: isEquivalent ? 0.95 : 0,
    }
}

/**
 * Extract numeric value from string
 */
function extractNumber(str: string): number | null {
    // Handle word numbers
    const wordNumbers: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4,
        five: 5, six: 6, seven: 7, eight: 8, nine: 9,
        ten: 10, eleven: 11, twelve: 12,
    }

    const lower = str.toLowerCase().trim()
    if (wordNumbers[lower] !== undefined) {
        return wordNumbers[lower]
    }

    // Try to parse as number
    const cleaned = str.replace(/[^0-9.-]/g, '')
    const num = parseFloat(cleaned)

    return isNaN(num) ? null : num
}

/**
 * Check if answer timing suggests cheating (too fast for complexity)
 */
export function checkSuspiciouslyFast(
    timeSeconds: number,
    difficulty: number,
    questionType: 'mcq' | 'short_answer' | 'true_false'
): boolean {
    // Minimum expected time based on difficulty and type
    const minTimes: Record<string, number> = {
        mcq: 3 + difficulty * 1.5,           // 4.5s for easy, 18s for hard
        short_answer: 5 + difficulty * 2,     // 7s for easy, 25s for hard  
        true_false: 2 + difficulty,          // 3s for easy, 12s for hard
    }

    const minExpected = minTimes[questionType] || 5

    // Flag if answered in less than 30% of expected time
    return timeSeconds < minExpected * 0.3
}
