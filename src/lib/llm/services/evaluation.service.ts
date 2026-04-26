/**
 * Evaluation Service ΓÇö answer evaluation, verification, error fingerprinting
 */

import { PROMPTS } from '../prompts'
import { PROMPT_TEMPERATURES } from '../config'
import * as schemas from '../validators'
import type { LLMProviderCore } from '../providers/types'
import type {
    ErrorFingerprint,
    EvaluateAnswerResult,
    DeductionSpace,
    UserPersona,
} from '../types'

export class EvaluationService {
    constructor(private provider: LLMProviderCore) {}

    async fingerprintError(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string
    ): Promise<ErrorFingerprint> {
        this.provider.initialize()
        const prompt = PROMPTS.errorFingerprint.template({ question, correctAnswer, userAnswer, concept })
        return this.provider.generateWithRetry<ErrorFingerprint>(
            prompt, schemas.RawErrorFingerprintSchema,
            'fingerprint', 5, PROMPT_TEMPERATURES.errorFingerprint
        )
    }

    async evaluateAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string,
        objective: string,
        deductionSpace: DeductionSpace,
        userPersona?: Partial<UserPersona> | null
    ): Promise<EvaluateAnswerResult> {
        this.provider.initialize()
        const prompt = PROMPTS.evaluateAnswer.template({
            question, correctAnswer, userAnswer, concept,
            objective, deductionSpace, userPersona
        })
        return this.provider.generateWithRetry<EvaluateAnswerResult>(
            prompt, schemas.RawEvaluateAnswerResultSchema as any,
            'evaluation', 5, PROMPT_TEMPERATURES.evaluateAnswer
        )
    }

    async verifyAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string
    ): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> {
        this.provider.initialize()
        const prompt = PROMPTS.verifyAnswer.template({ question, correctAnswer, userAnswer })
        return this.provider.generateWithRetry<{ isCorrect: boolean; confidence: number; explanation: string }>(
            prompt, schemas.RawVerifyAnswerSchema as any,
            'verify', 5, PROMPT_TEMPERATURES.verifyAnswer
        )
    }
}
