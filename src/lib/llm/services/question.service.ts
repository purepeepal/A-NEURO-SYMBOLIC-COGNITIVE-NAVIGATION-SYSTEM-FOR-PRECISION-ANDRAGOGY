/**
 * Question Service ΓÇö prerequisite trees, subtopics, question generation,
 * investigative objectives, probing questions
 */

import { PROMPTS } from '../prompts'
import { PROMPT_TEMPERATURES } from '../config'
import * as schemas from '../validators'
import { z } from 'zod'
import { createLogger } from '@/lib/core/logger'
import { GeneratedQuestionSchema } from '@/lib/assessment/schemas/question.schema'
import type { LLMProviderCore } from '../providers/types'
import type {
    PrerequisiteTree,
    GeneratedQuestion,
    InvestigativeObjective,
    UserPersona,
    AssessmentSnapshot,
    ProbingQuestionRecommendation,
} from '../types'

const logger = createLogger({ requestId: 'question-service' })

export class QuestionService {
    constructor(private provider: LLMProviderCore) {}

    async generatePrerequisiteTree(topic: string): Promise<PrerequisiteTree> {
        this.provider.initialize()
        const prompt = PROMPTS.prerequisiteTree.template(topic)
        return this.provider.generateWithRetry<PrerequisiteTree>(
            prompt, schemas.RawPrerequisiteTreeSchema as any,
            'prerequisite', 5, PROMPT_TEMPERATURES.prerequisiteTree
        )
    }

    async generateSubTopics(topic: string): Promise<string[]> {
        this.provider.initialize()
        const prompt = PROMPTS.subTopics.template(topic)
        const result = await this.provider.generateWithRetry<{ subtopics: string[] }>(
            prompt, z.object({ subtopics: z.array(z.string()) }),
            'subtopics', 5, PROMPT_TEMPERATURES.subTopics
        )
        return result.subtopics
    }

    async generateQuestion(
        concept: string,
        difficulty: number,
        topic: string,
        userPersona?: Partial<UserPersona> | null,
        previousConcepts: string[] = [],
        preferredType?: 'mcq' | 'short_answer' | 'true_false',
        pastQuestions: string[] = [],
        probingGuidance?: string,
        distractorStrategy?: string,
        investigativeObjective?: InvestigativeObjective
    ): Promise<GeneratedQuestion> {
        this.provider.initialize()

        const questionType = preferredType || (difficulty <= 3 ? 'mcq' : difficulty <= 7 ? 'short_answer' : 'mcq')

        const maxAttempts = 3
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const prompt = PROMPTS.questionGeneration.template({
                concept, difficulty, topic, questionType,
                previousConcepts, pastQuestions, userPersona,
                probingGuidance, distractorStrategy, investigativeObjective
            })

            const result = await this.provider.generateWithRetry<GeneratedQuestion>(
                prompt, schemas.RawGeneratedQuestionSchema as any,
                'question', 5, PROMPT_TEMPERATURES.questionGeneration
            )
            // Strict validation (business rules): ensures correctAnswer is present/non-empty.
            let question: GeneratedQuestion
            try {
                const parsed = GeneratedQuestionSchema.parse({ ...result, concept, difficulty })

                // `src/lib/llm/types` expects DeductionSpace to always include
                // `unexpectedPatterns` and `futuresFeedback`. Some prompts/schemas
                // omit them, so we normalize to safe defaults.
                const ds: any = parsed.deductionSpace ?? {}
                const futures = ds.futuresFeedback ?? {}
                const normalizedDeductionSpace = {
                    expectedErrors: Array.isArray(ds.expectedErrors) ? ds.expectedErrors : [],
                    unexpectedPatterns: Array.isArray(ds.unexpectedPatterns) ? ds.unexpectedPatterns : [],
                    futuresFeedback: {
                        contentStyle: typeof futures.contentStyle === 'string' ? futures.contentStyle : '',
                        cognitiveLoad: (futures.cognitiveLoad === 'high' || futures.cognitiveLoad === 'medium' || futures.cognitiveLoad === 'low')
                            ? futures.cognitiveLoad
                            : 'medium',
                        engagementHint: typeof futures.engagementHint === 'string' ? futures.engagementHint : '',
                    },
                }

                question = { ...parsed, deductionSpace: normalizedDeductionSpace } as GeneratedQuestion
            } catch (e) {
                logger.warn(`Strict question validation failed (attempt ${attempt}/${maxAttempts}); retrying generation`)
                if (attempt < maxAttempts) continue
                throw e
            }

            // Guard against placeholder/garbage baselines.
            const normalizedCorrect = question.correctAnswer.trim().toLowerCase()
            if (!normalizedCorrect || normalizedCorrect === 'undefined' || normalizedCorrect === 'null' || normalizedCorrect.includes('[no reference answer')) {
                logger.warn(`Invalid correctAnswer baseline (attempt ${attempt}/${maxAttempts}): "${question.correctAnswer}"`)
                if (attempt < maxAttempts) continue
                throw new Error('Question generation produced an invalid correctAnswer baseline')
            }

            // MCQ integrity validation
            if (question.questionType === 'mcq' && question.options) {
                const issues = validateMcqIntegrity(question.questionText, question.options, question.correctAnswer)
                if (issues.length > 0) {
                    logger.warn(`MCQ integrity issues (attempt ${attempt}/${maxAttempts}): ${issues.join('; ')}`)
                    // If the baseline answer is invalid (e.g., key not in options), we MUST retry.
                    const baselineInvalid = issues.some(i => i.toLowerCase().includes('not a valid option key'))
                    if (attempt < maxAttempts && baselineInvalid) continue
                    // On final attempt, still return — a flawed question is better than no question
                    logger.warn('MCQ integrity issues persist after retries, returning anyway')
                }
            }

            return question
        }

        // Unreachable, but TypeScript needs it
        throw new Error('Question generation failed')
    }

    async generateInvestigativeObjective(
        state: AssessmentSnapshot,
        currentPersona: Partial<UserPersona> | null,
        pastObjectives: InvestigativeObjective[]
    ): Promise<InvestigativeObjective> {
        this.provider.initialize()
        const prompt = PROMPTS.investigativeObjective.template({ state, currentPersona, pastObjectives })
        return this.provider.generateWithRetry<InvestigativeObjective>(
            prompt, schemas.RawInvestigativeObjectiveSchema as any,
            'investigative_objective', 3, PROMPT_TEMPERATURES.investigativeObjective
        )
    }

    async recommendProbingQuestion(
        hypothesis: string,
        state: AssessmentSnapshot,
        conceptPool: string[]
    ): Promise<ProbingQuestionRecommendation> {
        this.provider.initialize()
        const prompt = PROMPTS.probingQuestion.template({ hypothesis, state, conceptPool })
        return this.provider.generateWithRetry<ProbingQuestionRecommendation>(
            prompt,
            z.object({
                concept: z.string(), difficulty: z.number(),
                questionType: z.enum(['mcq', 'short_answer', 'true_false']),
                probingObjective: z.string(), distractorGuidance: z.string()
            }) as any,
            'probing_question', 5, PROMPT_TEMPERATURES.probingQuestion
        )
    }
}

// ─── MCQ Integrity Validator ─────────────────────────────────────────────
/**
 * Validates that an MCQ question is logically sound:
 * - correctAnswer key exists in options
 * - at least 3 options provided
 * - no duplicate option text
 * - correct answer option text is non-empty
 * Returns array of issue descriptions (empty = valid)
 */
function validateMcqIntegrity(
    questionText: string,
    options: Record<string, string>,
    correctAnswer: string
): string[] {
    const issues: string[] = []
    const keys = Object.keys(options)

    // Must have at least 3 options
    if (keys.length < 3) {
        issues.push(`Only ${keys.length} options provided (need at least 3)`)
    }

    // correctAnswer key must exist in options
    const answerKey = correctAnswer.trim().toLowerCase()
    if (!keys.some(k => k.toLowerCase() === answerKey)) {
        issues.push(`correctAnswer "${correctAnswer}" is not a valid option key (keys: ${keys.join(', ')})`)
    }

    // No duplicate option text (case-insensitive)
    const normalized = keys.map(k => options[k].trim().toLowerCase())
    const dupes = normalized.filter((v, i) => normalized.indexOf(v) !== i)
    if (dupes.length > 0) {
        issues.push(`Duplicate option text found: "${dupes[0]}"`)
    }

    // Correct answer option text should be non-empty
    const correctText = options[answerKey]
    if (correctText !== undefined && correctText.trim().length === 0) {
        issues.push('Correct answer option text is empty')
    }

    return issues
}
