/**
 * LLM Response Validators — Zod schemas for all LLM response types
 * 
 * Symposium 3.2 Directive: Every LLM call should route through these validators
 * Uses two-layer schemas from 3.4 (Raw → Strict)
 */
import { z } from 'zod'
import {
    RawGeneratedQuestionSchema,
    PrerequisiteTreeSchema,
} from '@/lib/assessment/schemas/question.schema'
import {
    RawEvaluateAnswerResultSchema,
} from '@/lib/assessment/schemas/calibration.schema'
import {
    InvestigativeObjectiveSchema,
    MicroAnalysisResultSchema,
} from '@/lib/assessment/schemas/state.schema'

// ─── Error Fingerprint (from LLM) ─────────────────────────────────
export const RawErrorFingerprintSchema = z.object({
    errorType: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(z.enum(['conceptual', 'procedural', 'careless', 'prerequisite_gap'])),
    explanation: z.string().default(''),
    prerequisiteGaps: z.array(z.string()).default([]),
})

// ─── Verify Answer (from LLM) ─────────────────────────────────────
export const RawVerifyAnswerSchema = z.object({
    isCorrect: z.union([z.boolean(), z.string().transform(s => s.toLowerCase() === 'true')]),
    confidence: z.coerce.number().min(0).max(1),
    explanation: z.string().default(''),
})

// ─── Chat Response (from LLM) ─────────────────────────────────────
export const RawChatResponseSchema = z.object({
    message: z.string(),
    action: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(z.enum(['none', 'adjust_score', 'provide_hint']))
        .default('none'),
    sentiment: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(z.enum(['positive', 'neutral', 'negative']))
        .default('neutral'),
})

// ─── Investigative Objective (from LLM) ────────────────────────────
export const RawInvestigativeObjectiveSchema = z.object({
    primaryGoal: z.string(),
    hypothesis: z.string(),
    targetConcept: z.string(),
    suggestedDifficulty: z.coerce.number(),
    questionType: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(z.enum(['mcq', 'short_answer', 'true_false']))
        .optional(),
    probingStrategy: z.string().optional(),
    distractorGuidance: z.string().optional(),
    reasoningChain: z.string().optional(),
})

// ─── Micro Analysis (from LLM) ────────────────────────────────────
export const RawMicroAnalysisSchema = z.object({
    immediateDeductions: z.array(z.object({
        concept: z.string(),
        deduction: z.string(),
        deductionType: z.string()
            .transform(s => s.toLowerCase().trim())
            .pipe(z.enum([
                'strength', 'weakness', 'misconception',
                'learning_style', 'behavioral', 'insight'
            ])),
        confidence: z.coerce.number().min(0).max(1),
    })).default([]),
    // Legacy alias: some validators reference 'deductions' instead of 'immediateDeductions'
    deductions: z.array(z.object({
        concept: z.string(),
        deduction: z.string(),
        deductionType: z.string()
            .transform(s => s.toLowerCase().trim())
            .pipe(z.enum([
                'strength', 'weakness', 'misconception',
                'learning_style', 'behavioral', 'insight'
            ])),
        confidence: z.coerce.number().min(0).max(1),
    })).default([]),
    suggestedProbe: z.string().default(''),
    confidenceShift: z.coerce.number().default(0),
    anomalyDetected: z.union([z.boolean(), z.string().transform(s => s.toLowerCase() === 'true')]).default(false),
    anomalyNote: z.string().nullable().optional().transform(v => v ?? undefined),
    narrativeMoment: z.string().nullable().optional().transform(v => v ?? undefined),
    adjustedDifficulty: z.coerce.number().optional(),
    nextObjectiveSuggestion: z.string().optional(),
    adaptiveGuidance: z.object({
        difficultyAdjustment: z.coerce.number().default(0),
        conceptPivot: z.string().nullable().default(null),
        questionTypeRecommendation: z.string()
            .transform(s => s.toLowerCase().trim())
            .pipe(z.enum(['mcq', 'short_answer', 'true_false']))
            .default('mcq'),
        urgency: z.string()
            .transform(s => s.toLowerCase().trim())
            .pipe(z.enum(['normal', 'probe_deeper', 'remediate', 'accelerate']))
            .default('normal'),
    }).default({
        difficultyAdjustment: 0,
        conceptPivot: null,
        questionTypeRecommendation: 'mcq',
        urgency: 'normal',
    }),
})

// ─── Calibration Insight (from LLM) ───────────────────────────────
export const RawCalibrationInsightSchema = z.object({
    headline: z.string(),
    detail: z.string(),
})

// ─── Narrative Moment (from LLM) ──────────────────────────────────
export const RawNarrativeMomentSchema = z.object({
    narrativeText: z.string(),
    tone: z.string().optional(),
    emoji: z.string().optional(),
})

// ─── Action Plan (from LLM) ───────────────────────────────────────
export const RawActionPlanSchema = z.object({
    items: z.array(z.object({
        priority: z.enum(['critical', 'reinforce', 'stretch']),
        title: z.string(),
        rationale: z.string(),
        suggestion: z.string(),
        timeEstimate: z.string().optional(),
        relatedGaps: z.array(z.string()).default([]),
    })).default([]),
    overallMessage: z.string().default(''),
    nextSessionSuggestion: z.string().optional(),
})

// ─── Prerequisite Tree (raw — from LLM) ───────────────────────────
export const RawPrerequisiteTreeSchema = z.object({
    topic: z.string(),
    concepts: z.array(z.object({
        name: z.string(),
        difficulty: z.coerce.number(),
        prerequisites: z.array(z.string()).default([]),
        description: z.string().default(''),
        type: z.string().optional(),
    })).default([]),
})

// ─── RE-EXPORTS for convenience ────────────────────────────────────
export {
    RawGeneratedQuestionSchema,
    RawEvaluateAnswerResultSchema,
    InvestigativeObjectiveSchema,
    MicroAnalysisResultSchema,
    PrerequisiteTreeSchema,
}
