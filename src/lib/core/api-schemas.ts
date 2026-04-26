/**
 * API Input Validation Schemas
 * 
 * Zod schemas for validating all API route inputs.
 * Applied before any business logic to reject malformed requests early.
 */
import { z } from 'zod'

// ΓöÇΓöÇΓöÇ Shared ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const uuidSchema = z.string().uuid('Invalid ID format')

// ΓöÇΓöÇΓöÇ POST /api/assessment/start ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const StartAssessmentSchema = z.object({
    topic: z.string().min(1, 'Topic is required').max(200),
    selfAssessment: z.array(z.object({
        subtopic: z.string().min(1).max(200),
        rating: z.number().int().min(1).max(5),
    })).max(10).optional(),
})

// ΓöÇΓöÇΓöÇ Biometrics (optional, attached to submit) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const BiometricsSchema = z.object({
    mouseJitterScore: z.number().min(0).max(100).default(0),
    scrollHesitationCount: z.number().int().min(0).default(0),
    dwellTimeMs: z.number().int().min(0).default(0),
    focusLossCount: z.number().int().min(0).default(0),
    keystrokeVarianceMs: z.number().min(0).default(0),
    timeToFirstInteractionMs: z.number().int().min(0).default(0),
    revisionCount: z.number().int().min(0).default(0),
}).optional()

// ΓöÇΓöÇΓöÇ POST /api/assessment/submit ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const SubmitAnswerSchema = z.object({
    assessmentId: uuidSchema,
    questionId: uuidSchema,
    userAnswer: z.any(), // flexible ΓÇö text, number, or selection
    timeTakenSeconds: z.number().min(0).max(600).default(0),
    confidenceLevel: z.number().int().min(0).max(4).default(2),
    biometrics: BiometricsSchema,
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/evaluate ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const EvaluateAnswerSchema = z.object({
    assessmentId: uuidSchema,
    questionId: uuidSchema,
    fallbackAnswer: z.any().optional(),
    fallbackTime: z.number().min(0).max(600).optional(),
    fallbackConfidence: z.number().int().min(0).max(4).optional(),
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/next ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const NextQuestionSchema = z.object({
    assessmentId: uuidSchema,
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/subtopics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const SubtopicsSchema = z.object({
    topic: z.string().min(1, 'Topic is required').max(200),
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/chat ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const ChatSchema = z.object({
    assessmentId: uuidSchema.optional(),
    questionId: uuidSchema.optional(),
    message: z.string().min(1, 'Message is required').max(1000),
    clientContext: z.record(z.string(), z.unknown()).optional(),
    history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
    })).max(20).optional(),
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/terminate ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const TerminateSchema = z.object({
    assessmentId: uuidSchema,
})

// ΓöÇΓöÇΓöÇ POST /api/assessment/feedback ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const FeedbackSchema = z.object({
    assessmentId: uuidSchema,
    responseId: uuidSchema.optional(),
    feedbackType: z.enum(['incorrect_answer', 'unclear_question', 'wrong_difficulty', 'other']),
    comment: z.string().min(1, 'Comment is required').max(2000),
})

// ΓöÇΓöÇΓöÇ GET /api/assessment/[id]/report ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
export const ReportParamsSchema = z.object({
    id: uuidSchema,
})
