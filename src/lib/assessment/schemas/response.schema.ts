/**
 * Response & Submission Schemas
 * Validates data at the assessment flow boundary
 * 
 * Symposium 3.4 Directive: Schema-per-domain with two-layer validation
 */
import { z } from 'zod'

// ─── Error Type Enums ──────────────────────────────────────────────
export const ErrorTypeSchema = z.enum([
    'conceptual',
    'procedural',
    'careless',
    'prerequisite_gap',
    'correct'
])

export const QuestionTypeSchema = z.enum(['mcq', 'short_answer', 'true_false'])

export const CompetencyLevelSchema = z.enum([
    'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
])

// ─── Response Schema ───────────────────────────────────────────────
export const ResponseSchema = z.object({
    questionId: z.string(),
    userAnswer: z.string(),
    isCorrect: z.boolean(),
    errorType: ErrorTypeSchema,
    timeTakenSeconds: z.number().positive(),
    concept: z.string(),
    difficulty: z.number().min(1).max(10),
    confidenceLevel: z.number().int().min(1).max(3).optional(),
    questionText: z.string().optional(),
    objective: z.string().optional(),
})

// ─── Submission Payload (from client to API) ───────────────────────
export const SubmissionPayloadSchema = z.object({
    assessmentId: z.string(),
    questionId: z.string(),
    answer: z.string().min(1),
    confidence: z.number().int().min(1).max(3).optional().nullable(),
    timeTaken: z.number().positive().optional(),
})

// ─── Derived Types ─────────────────────────────────────────────────
export type ErrorType = z.infer<typeof ErrorTypeSchema>
export type QuestionType = z.infer<typeof QuestionTypeSchema>
export type CompetencyLevel = z.infer<typeof CompetencyLevelSchema>
export type Response = z.infer<typeof ResponseSchema>
export type SubmissionPayload = z.infer<typeof SubmissionPayloadSchema>
