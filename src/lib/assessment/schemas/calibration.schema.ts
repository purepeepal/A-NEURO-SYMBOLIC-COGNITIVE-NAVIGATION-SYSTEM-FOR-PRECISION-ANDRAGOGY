/**
 * Calibration & Self-Assessment Schemas
 * Validates self-assessment ratings and calibration computation results
 */
import { z } from 'zod'

// ─── Self-Assessment Rating ────────────────────────────────────────
export const SelfAssessmentRatingSchema = z.object({
    subTopic: z.string(),
    rating: z.number().int().min(1).max(5),
})

// ─── Calibration Result ────────────────────────────────────────────
export const CalibrationResultSchema = z.object({
    concept: z.string(),
    selfRating: z.number().min(1).max(5),
    measuredAccuracy: z.number().min(0).max(1),
    delta: z.number(),           // selfRating normalized vs measuredAccuracy
    interpretation: z.string(),  // "overconfident", "underconfident", "calibrated"
    questionsAsked: z.number().int().min(0),
})

// ─── Evaluation Result (from LLM answer evaluation) ────────────────
export const EvaluateAnswerResultSchema = z.object({
    isCorrect: z.boolean(),
    explanation: z.string(),
    errorType: z.enum([
        'conceptual', 'procedural', 'careless', 'prerequisite_gap', 'correct'
    ]).optional(),
    prerequisiteGaps: z.array(z.string()).optional(),
    partialCredit: z.number().min(0).max(1).optional(),
})

// ─── Raw Evaluation (permissive — from LLM) ───────────────────────
export const RawEvaluateAnswerResultSchema = z.object({
    isCorrect: z.union([z.boolean(), z.string().transform(s => s.toLowerCase() === 'true')]),
    explanation: z.string().default(''),
    errorType: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(z.enum(['conceptual', 'procedural', 'careless', 'prerequisite_gap', 'correct']))
        .optional(),
    prerequisiteGaps: z.array(z.string()).optional().default([]),
    partialCredit: z.coerce.number().min(0).max(1).optional(),
})

// ─── Confidence Indicator ──────────────────────────────────────────
export const ConfidenceIndicatorSchema = z.object({
    label: z.string(),
    sampleSize: z.number().int().min(0),
    caveat: z.string().optional(),
})

// ─── Derived Types ─────────────────────────────────────────────────
export type SelfAssessmentRating = z.infer<typeof SelfAssessmentRatingSchema>
export type CalibrationResult = z.infer<typeof CalibrationResultSchema>
export type EvaluateAnswerResult = z.infer<typeof EvaluateAnswerResultSchema>
export type RawEvaluateAnswerResult = z.infer<typeof RawEvaluateAnswerResultSchema>
export type ConfidenceIndicator = z.infer<typeof ConfidenceIndicatorSchema>
