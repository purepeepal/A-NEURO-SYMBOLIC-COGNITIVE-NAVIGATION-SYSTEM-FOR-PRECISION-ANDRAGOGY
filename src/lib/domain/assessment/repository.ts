import { createClient } from '@/lib/infrastructure/supabase/server'
import { createLogger } from '@/lib/core/logger'
import type { AssessmentRow, ResponseRow, AssessmentStatsUpdate, EvaluationResult, GeneratedQuestionContent, SessionPersona } from '@/types/db-rows'

const logger = createLogger({ requestId: 'repository' })

export class StateRepository {
    async createAssessment(userId: string, topic: string) {
        const supabase = await createClient()
        const { data: assessment, error } = await supabase
            .from('assessments')
            .insert({
                user_id: userId,
                topic,
                status: 'in_progress',
                current_difficulty: 5
            })
            .select()
            .single()

        if (error) throw error
        return assessment
    }

    async getAssessment(assessmentId: string) {
        const supabase = await createClient()
        const { data: assessment } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', assessmentId)
            .single()

        if (!assessment) throw new Error("Assessment not found")
        return assessment
    }

    async updateAssessmentDifficulty(assessmentId: string, difficulty: number) {
        const supabase = await createClient()
        await supabase.from('assessments').update({
            current_difficulty: Math.round(difficulty)
        }).eq('id', assessmentId)
    }

    async updateAssessmentStats(assessmentId: string, updatePayload: AssessmentStatsUpdate) {
        const supabase = await createClient()
        const { error } = await supabase
            .from('assessments')
            .update(updatePayload)
            .eq('id', assessmentId)

        if (error) throw new Error("Failed to update session progress")
    }

    async endAssessment(assessmentId: string) {
        const supabase = await createClient()
        await supabase.from('assessments').update({
            status: 'completed',
            completed_at: new Date().toISOString()
        }).eq('id', assessmentId)
    }

    async getHistory(assessmentId: string) {
        const supabase = await createClient()
        const { data: history } = await supabase
            .from('responses')
            .select('*')
            .eq('assessment_id', assessmentId)
            .order('created_at', { ascending: true })

        return history || []
    }

    async getQuestion(questionId: string) {
        const supabase = await createClient()
        const { data: question } = await supabase
            .from('responses')
            .select('*')
            .eq('id', questionId)
            .single()

        if (!question) throw new Error("Question not found")
        return question
    }

    async saveQuestion(assessmentId: string, questionContent: GeneratedQuestionContent, assessment: AssessmentRow, sanitizedQuestionType: string) {
        const supabase = await createClient()
        try {
            const { data, error } = await supabase
                .from('responses')
                .insert({
                    assessment_id: assessmentId,
                    question_number: assessment.total_questions + 1,
                    concept: questionContent.concept,
                    difficulty: Math.round(questionContent.difficulty),
                    question_text: questionContent.questionText,
                    question_type: sanitizedQuestionType,
                    options: questionContent.options || null,
                    correct_answer: (questionContent.options && questionContent.correctAnswer && questionContent.options[questionContent.correctAnswer])
                        ? questionContent.options[questionContent.correctAnswer]
                        : questionContent.correctAnswer,
                    error_explanation: questionContent.explanation,
                    objective: questionContent.objective,
                    competency_level: questionContent.competencyLevel,
                    deduction_space: questionContent.deductionSpace
                })
                .select()
                .single()

            if (error) throw error
            return data

        } catch (primaryError: unknown) {
            logger.warn("Primary DB Insert Failed. Attempting Fallback.", primaryError instanceof Error ? { detail: primaryError.message } : typeof primaryError === 'object' ? primaryError as Record<string, unknown> : { detail: String(primaryError) })
            const { data, error } = await supabase
                .from('responses')
                .insert({
                    assessment_id: assessmentId,
                    question_number: assessment.total_questions + 1,
                    concept: questionContent.concept,
                    difficulty: Math.round(questionContent.difficulty),
                    question_text: questionContent.questionText,
                    question_type: sanitizedQuestionType,
                    options: questionContent.options || null,
                    correct_answer: (questionContent.options && questionContent.correctAnswer && questionContent.options[questionContent.correctAnswer])
                        ? questionContent.options[questionContent.correctAnswer]
                        : questionContent.correctAnswer,
                    error_explanation: questionContent.explanation
                })
                .select()
                .single()

            if (error) {
                logger.error("Critical DB Failure on Fallback Insert:", error instanceof Error ? error : undefined, { detail: error?.message })
                throw new Error(`Database Error: ${error.message}`)
            }
            return data
        }
    }

    async saveRawAnswer(questionId: string, userAnswer: string, timeTaken: number, confidenceLevel: number) {
        const supabase = await createClient()
        const roundedTime = Math.round(timeTaken)

        // Primary update with all fields
        const { error } = await supabase
            .from('responses')
            .update({
                user_answer: userAnswer,
                time_taken_seconds: roundedTime,
                confidence_level: confidenceLevel,
                evaluation_status: 'pending'
            })
            .eq('id', questionId)

        if (error) {
            logger.error(`[saveRawAnswer] Primary update failed for ${questionId}:`, undefined, { detail: error.message })
            // Fallback: save just the critical fields without optional ones
            const { error: fallbackError } = await supabase
                .from('responses')
                .update({
                    user_answer: userAnswer,
                    time_taken_seconds: roundedTime
                })
                .eq('id', questionId)

            if (fallbackError) {
                logger.error(`[saveRawAnswer] Fallback update also failed for ${questionId}:`, undefined, { detail: fallbackError.message })
            }
        }
    }

    async updateQuestionWithEvaluation(questionId: string, userAnswer: string, timeTaken: number, confidenceLevel: number, evaluation: EvaluationResult) {
        const supabase = await createClient()
        const roundedTime = Math.round(timeTaken)

        // Primary update with all fields including deduction metadata
        const { error } = await supabase
            .from('responses')
            .update({
                user_answer: userAnswer,
                is_correct: evaluation.isCorrect,
                time_taken_seconds: roundedTime,
                error_type: evaluation.errorType || (evaluation.isCorrect ? 'correct' : 'conceptual'),
                error_explanation: evaluation.feedback,
                confidence_level: confidenceLevel,
                evaluation_status: 'evaluated',
                deduction: {
                    analysis: evaluation.reasoning,
                    deductions: evaluation.deductions,
                    perspective: evaluation.userPerspective
                }
            })
            .eq('id', questionId)

        if (error) {
            logger.error(`[updateQuestionWithEvaluation] Primary update failed for ${questionId}:`, undefined, { detail: error.message })
            // Fallback: save only the critical scoring fields
            const { error: fallbackError } = await supabase
                .from('responses')
                .update({
                    user_answer: userAnswer,
                    is_correct: evaluation.isCorrect,
                    time_taken_seconds: roundedTime,
                    error_type: evaluation.errorType || (evaluation.isCorrect ? 'correct' : 'conceptual'),
                    error_explanation: evaluation.feedback,
                    evaluation_status: 'evaluated'
                })
                .eq('id', questionId)

            if (fallbackError) {
                logger.error(`[updateQuestionWithEvaluation] CRITICAL: Fallback update also failed for ${questionId}:`, undefined, { detail: fallbackError.message })
                // This is a critical failure — is_correct will not be saved
                // Mark as failed so we know evaluation didn't complete
                await supabase.from('responses').update({ evaluation_status: 'failed' }).eq('id', questionId)
            }
        }
    }

    async saveSessionAnalytics(assessmentId: string, assessment: AssessmentRow, sessionPersona: SessionPersona, totalQuestions: number) {
        const supabase = await createClient()
        await supabase.from('session_analytics').insert({
            session_id: assessmentId,
            user_id: assessment.user_id,
            topic: assessment.topic,
            questions_answered: totalQuestions,
            accuracy: sessionPersona.accuracy,
            average_difficulty: sessionPersona.averageDifficulty,
            difficulty_progression: sessionPersona.difficultyProgression,
            error_breakdown: sessionPersona.errorBreakdown,
            concepts_struggled: sessionPersona.conceptsStruggled,
            concepts_mastered: sessionPersona.conceptsMastered,
            synthesized_deductions: sessionPersona.synthesizedDeductions,
            descriptive_analysis: sessionPersona.descriptiveAnalysis,
            immediate_actions: sessionPersona.immediateActions,
            next_session_focus: sessionPersona.nextSessionFocus,
            long_term_path: sessionPersona.longTermPath
        })
    }
}

export const stateRepository = new StateRepository()
