import { assessmentEngine, AssessmentState } from './engine'
import { gemini } from '@/lib/llm'
import { stateRepository } from './repository'
import { personaEngine } from './persona-engine'
import { createLogger } from '@/lib/logger'
import { generateAndCacheLearningSnippet } from './learning-snippets'
import { LearningSnippet } from '@/lib/llm/types'

const logger = createLogger({ requestId: 'flow' })

// ── In-memory micro-analysis cache (evaluate → next-question bridge) ────────
// Stores the latest micro-analysis result per assessment so the next-question
// path can skip the blocking LLM call. TTL: consumed on first read.
const microAnalysisCache = new Map<string, { result: unknown; timestamp: number }>()

function cacheMicroAnalysis(assessmentId: string, result: unknown) {
    microAnalysisCache.set(assessmentId, { result, timestamp: Date.now() })
}

export function consumeMicroAnalysis(assessmentId: string): unknown | null {
    const cached = microAnalysisCache.get(assessmentId)
    if (cached && Date.now() - cached.timestamp < 60_000) {
        microAnalysisCache.delete(assessmentId)
        return cached.result
    }
    microAnalysisCache.delete(assessmentId)
    return null
}

// ── Prefetched question cache (evaluate → client prefetch bridge) ───────────
// After evaluate, we fire-and-forget a next-question generation and cache it.
const prefetchedQuestions = new Map<string, { data: unknown; timestamp: number }>()

function cachePrefetchedQuestion(assessmentId: string, data: unknown) {
    prefetchedQuestions.set(assessmentId, { data, timestamp: Date.now() })
}

export function consumePrefetchedQuestion(assessmentId: string): unknown | null {
    const cached = prefetchedQuestions.get(assessmentId)
    if (cached && Date.now() - cached.timestamp < 120_000) {
        prefetchedQuestions.delete(assessmentId)
        return cached.data
    }
    prefetchedQuestions.delete(assessmentId)
    return null
}

/**
 * Manages the flow of an assessment session
 * Orchestrates domain logic via Repositories and Engines
 *
 * Latency Optimizations (March 2026):
 * - DB reads parallelized with Promise.all
 * - Narrative generation is fire-and-forget (non-blocking)
 * - Micro-analysis runs during evaluate and is cached for next-question
 * - Next question is prefetched during evaluate (fire-and-forget)
 * - pastQuestions capped to last 8 to reduce token bloat
 */
export class AssessmentFlow {

    /**
     * Start a new assessment session
     */
    async startAssessment(userId: string, topic: string) {
        // Create DB record via repository
        const assessment = await stateRepository.createAssessment(userId, topic)

        // Ensure User Persona Exists
        await personaEngine.initializePersona(userId)

        // Generate first question immediately
        const nextQuestion = await this.generateNextQuestion(assessment.id)
        return { assessment, nextQuestion }
    }

    /**
     * Generate next question for an existing assessment
     */
    async generateNextQuestion(assessmentId: string) {
        // 1. Parallelized DB reads — assessment, persona, and history fetched concurrently
        const assessment = await stateRepository.getAssessment(assessmentId)

        if (assessment.status === 'completed') {
            return { complete: true, assessmentId }
        }

        const [userPersonaData, history] = await Promise.all([
            personaEngine.getPersona(assessment.user_id),
            stateRepository.getHistory(assessmentId),
        ])

        const state: AssessmentState = {
            assessmentId,
            topic: assessment.topic,
            currentDifficulty: assessment.current_difficulty,
            consecutiveCorrect: assessment.consecutive_correct,
            consecutiveIncorrect: assessment.consecutive_incorrect,
            questionsAnswered: assessment.total_questions,
            currentObjective: undefined,
            history: history?.map((h) => ({
                questionId: h.id,
                concept: h.concept,
                isCorrect: h.is_correct ?? false,
                difficulty: h.difficulty,
                questionText: h.question_text,
                objective: h.objective
            })) || []
        }

        // Inject cached micro-analysis from evaluate (avoids re-running the LLM call)
        const cachedMicro = consumeMicroAnalysis(assessmentId)
        if (cachedMicro) {
            state.lastMicroAnalysis = cachedMicro as AssessmentState['lastMicroAnalysis']
        }

        // 2. Get params from Engine (Difficulty & Concept)
        const params = await assessmentEngine.getNextQuestionParams(state)

        // 2.2 Persist Difficulty Update
        if (assessment.current_difficulty !== params.difficulty) {
            await stateRepository.updateAssessmentDifficulty(assessmentId, params.difficulty)
        }

        // Cap pastQuestions to last 8 to reduce prompt token bloat
        const pastQuestions = state.history
            .map((h) => h.questionText)
            .filter(Boolean)
            .slice(-8) as string[]

        // 3. Generate Objective-Based Question via LLM
        const questionContent = await gemini.generateQuestion(
            params.concept,
            params.difficulty,
            params.topic,
            userPersonaData,
            params.previousConcepts,
            params.questionType,
            pastQuestions,
            params.probingGuidance,
            params.distractorStrategy,
            params.investigativeObjective
        )

        // 4. Save to DB
        const rawType = (questionContent.questionType || params.questionType || 'short_answer').toLowerCase().trim();
        const validTypes = ['mcq', 'short_answer', 'true_false'];
        const sanitizedQuestionType = validTypes.includes(rawType) ? rawType : 'short_answer';

        const questionRecord = await stateRepository.saveQuestion(
            assessmentId,
            questionContent,
            assessment,
            sanitizedQuestionType
        )

        // Calculate adaptive confidence score (0-100)
        const baseConfidence = Math.min(100, Math.round(((assessment.total_questions + 1) / 15) * 80));
        const bonus = Math.min(20, (assessment.consecutive_correct + assessment.consecutive_incorrect) * 2);
        const analysisConfidence = Math.min(100, baseConfidence + bonus);

        return {
            question: {
                id: questionRecord.id,
                ...questionContent,
                correctAnswer: undefined, // Hide from client
                explanation: undefined    // Hide from client
            },
            progress: {
                current: assessment.total_questions + 1,
                total: 20,
                confidence: analysisConfidence
            }
        }
    }

    /**
     * Rapid DB Insert for Optimistic UI flow
     */
    async saveAnswerFast(assessmentId: string, questionId: string, userAnswer: string, timeTaken: number, confidenceLevel: number = 2) {
        await stateRepository.saveRawAnswer(questionId, userAnswer, timeTaken, confidenceLevel)
        return { queued: true }
    }

    /**
     * Submit an answer with Deductive Analysis
     *
     * Latency optimizations:
     * - DB reads parallelized
     * - Micro-analysis runs here and is cached for next-question (skips re-running in engine)
     * - Narrative is fire-and-forget (does not block response)
     * - Session analysis on termination is fire-and-forget
     * - Next question prefetch fires in background after evaluation
     */
    async evaluateAnswer(assessmentId: string, questionId: string, fallbackAnswer?: string, fallbackTime?: number, fallbackConfidence?: number) {
        // 1. Parallel DB reads — question, assessment, and persona fetched concurrently
        const [question, assessment] = await Promise.all([
            stateRepository.getQuestion(questionId),
            stateRepository.getAssessment(assessmentId),
        ])

        const userAnswer = question.user_answer || fallbackAnswer;
        if (!userAnswer) {
            throw new Error("Cannot evaluate question without a user answer");
        }

        const timeTaken = question.time_taken_seconds || fallbackTime || 0;
        const confidenceLevel = question.confidence_level || fallbackConfidence || 2;

        const userPersonaData = await personaEngine.getPersona(assessment.user_id)

        // Format answers for MCQ
        let formattedUserAnswer = userAnswer;
        if (question.question_type === 'mcq' && typeof question.options === 'object' && question.options !== null) {
            const optionText = (question.options as Record<string, string>)[userAnswer];
            if (optionText) {
                formattedUserAnswer = `${userAnswer}) ${optionText}`;
            }
        }

        let formattedCorrectAnswer = question.correct_answer;
        if (question.question_type === 'mcq' && typeof question.options === 'object' && question.options !== null) {
            const correctText = (question.options as Record<string, string>)[question.correct_answer];
            if (correctText) {
                formattedCorrectAnswer = `${question.correct_answer}) ${correctText}`;
            }
        }

        // 2. Deep Deductive Evaluation (the one required LLM call)
        const evaluation = await gemini.evaluateAnswer(
            question.question_text,
            formattedCorrectAnswer,
            formattedUserAnswer,
            question.concept,
            question.objective,
            question.deduction_space,
            userPersonaData
        )

        // 3. Parallel DB writes — evaluation record + persona + stats updated concurrently
        const updatePayload = {
            total_questions: assessment.total_questions + 1,
            correct_count: assessment.correct_count + (evaluation.isCorrect ? 1 : 0),
            consecutive_correct: evaluation.isCorrect ? assessment.consecutive_correct + 1 : 0,
            consecutive_incorrect: !evaluation.isCorrect ? assessment.consecutive_incorrect + 1 : 0
        }

        await Promise.all([
            stateRepository.updateQuestionWithEvaluation(questionId, userAnswer, timeTaken, confidenceLevel, evaluation),
            personaEngine.applyEvaluationUpdates(assessment.user_id, evaluation, userPersonaData),
            stateRepository.updateAssessmentStats(assessmentId, updatePayload),
        ])

        // 4. Re-fetch history and check termination
        const updatedHistory = await stateRepository.getHistory(assessmentId)

        const analysisState: AssessmentState = {
            assessmentId,
            topic: assessment.topic,
            currentDifficulty: assessment.current_difficulty,
            consecutiveCorrect: updatePayload.consecutive_correct,
            consecutiveIncorrect: updatePayload.consecutive_incorrect,
            questionsAnswered: updatePayload.total_questions,
            history: updatedHistory?.map((h) => ({
                questionId: h.id,
                concept: h.concept,
                isCorrect: h.is_correct ?? false,
                difficulty: h.difficulty,
                objective: h.objective
            })) || []
        }

        const termination = await assessmentEngine.shouldEndSession(analysisState)

        if (termination.end) {
            await stateRepository.endAssessment(assessmentId)

            // Fire-and-forget session analysis — does NOT block the response
            if (updatePayload.total_questions! >= 12) {
                gemini.analyzeSession(
                    assessment.topic,
                    analysisState.history.map((h) => ({
                        question: h.questionText || "Question ID " + h.questionId,
                        isCorrect: h.isCorrect,
                        concept: h.concept,
                        difficulty: h.difficulty
                    })),
                    userPersonaData
                ).then(sessionPersona => {
                    if (sessionPersona) {
                        stateRepository.saveSessionAnalytics(assessmentId, assessment, sessionPersona, updatePayload.total_questions)
                            .catch(e => logger.warn('Session analytics save failed:', { detail: String(e) }))
                    }
                }).catch(e => logger.warn('Session analysis failed:', { detail: String(e) }))
            }
        }

        // 5. Fire-and-forget: micro-analysis + narrative + next-question prefetch
        //    These run in the background and do NOT block the evaluate response.
        let snippet: LearningSnippet | null = null;
        if (!termination.end) {
            // Micro-analysis: await to generate snippet before returning
            if (analysisState.questionsAnswered >= 3 && gemini.performMicroAnalysis) {
                try {
                    const microResult = await gemini.performMicroAnalysis(
                        {
                            question_text: question.question_text,
                            concept: question.concept,
                            difficulty: question.difficulty,
                            is_correct: evaluation.isCorrect,
                            user_answer: userAnswer,
                            correct_answer: question.correct_answer,
                            objective: question.objective,
                            deduction_space: question.deduction_space,
                        },
                        analysisState,
                        userPersonaData ?? null
                    )
                    cacheMicroAnalysis(assessmentId, microResult)
                    
                    // Generate Snippet if triggered
                    snippet = await generateAndCacheLearningSnippet(
                        assessmentId,
                        questionId,
                        analysisState,
                        { ...question, is_correct: evaluation.isCorrect, user_answer: userAnswer },
                        microResult,
                        (userPersonaData as any) || null
                    )
                    
                    // Background: prefetch next question
                    this.generateNextQuestion(assessmentId)
                        .then(q => { if (q && !('complete' in q)) cachePrefetchedQuestion(assessmentId, q) })
                        .catch(e => logger.warn('Prefetch failed:', { detail: String(e) }))
                } catch (e) {
                    logger.warn('Micro-analysis failed:', { detail: String(e) })
                    this.generateNextQuestion(assessmentId)
                        .then(q => { if (q && !('complete' in q)) cachePrefetchedQuestion(assessmentId, q) })
                        .catch(e2 => logger.warn('Prefetch failed:', { detail: String(e2) }))
                }
            } else {
                // No micro-analysis needed; prefetch directly
                this.generateNextQuestion(assessmentId)
                    .then(q => { if (q && !('complete' in q)) cachePrefetchedQuestion(assessmentId, q) })
                    .catch(e => logger.warn('Prefetch failed:', { detail: String(e) }))
            }

            // Narrative: fire-and-forget, not returned to client (client can poll /next)
            let trigger: 'interval' | 'streak' | 'error' | 'pattern_detected' | null = null
            if (!evaluation.isCorrect && updatePayload.consecutive_incorrect === 1) {
                trigger = 'error'
            } else if (updatePayload.consecutive_correct > 0 && updatePayload.consecutive_correct % 3 === 0) {
                trigger = 'streak'
            } else if (updatePayload.total_questions % 3 === 0) {
                trigger = 'interval'
            }

            if (trigger && gemini.generateNarrative) {
                gemini.generateNarrative(assessment.topic, analysisState, trigger, question.concept)
                    .catch(e => logger.warn('Narrative generation failed:', { detail: String(e) }))
            }
        }

        return {
            correct: evaluation.isCorrect,
            explanation: evaluation.feedback,
            errorType: evaluation.errorType || null,
            learningSnippet: snippet || null,
            narrative: null, // No longer blocking on narrative; client prefetches next question immediately
            nextQuestionId: null,
            isComplete: termination.end,
            completionReason: termination.reason
        }
    }
}

export const assessmentFlow = new AssessmentFlow()
