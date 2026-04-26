import { gemini } from '@/lib/llm'
import { ErrorFingerprint } from '@/lib/llm/types'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'fingerprint' })

export type ErrorType = 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap'

// Fallback logic if LLM fails
export function heuristicFingerprint(
    questionType: string,
    userAnswer: string,
    correctAnswer: string
): ErrorType {
    // If numeric and off by order of magnitude -> Procedural/Careless
    const numUser = parseFloat(userAnswer)
    const numCorrect = parseFloat(correctAnswer)

    if (!isNaN(numUser) && !isNaN(numCorrect)) {
        if (numCorrect !== 0) {
            const ratio = numUser / numCorrect
            if (ratio === 10 || ratio === 0.1 || ratio === 100 || ratio === 0.01) {
                return 'careless' // Likely decimal place error
            }
        }
    }

    // Default assumption for text match fail
    return 'conceptual'
}

export async function analyzeError(
    question: string,
    correct: string,
    user: string,
    concept: string
): Promise<ErrorFingerprint> {
    try {
        // Attempt LLM fingerprinting
        const result = await gemini.fingerprintError(question, correct, user, concept)
        return result
    } catch (e) {
        logger.error('Fingerprinting failed, using heuristic', e)

        const fallbackType = heuristicFingerprint('short_answer', user, correct)

        return {
            errorType: fallbackType,
            explanation: "Incorrect answer (analysis unavailable due to connectivity)",
            prerequisiteGaps: []
        }
    }
}
