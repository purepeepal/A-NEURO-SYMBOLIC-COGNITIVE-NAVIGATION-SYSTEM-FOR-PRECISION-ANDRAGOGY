/**
 * Assessment State Schema
 * Validates the in-memory assessment state passed between engine functions
 * 
 * Symposium 3.4 Directive: Replace `any` types in AssessmentState
 */
import { z } from 'zod'
import { DeductionSpaceSchema } from './question.schema'

// ─── History Entry ─────────────────────────────────────────────────
export const HistoryEntrySchema = z.object({
    questionId: z.string(),
    concept: z.string(),
    isCorrect: z.boolean(),
    difficulty: z.number().min(1).max(10),
    objective: z.string().optional(),
    deduction: z.record(z.string(), z.unknown()).optional(), // Was `any`, now typed
    questionText: z.string().optional(),
})

// ─── Investigative Objective ───────────────────────────────────────
export const InvestigativeObjectiveSchema = z.object({
    primaryGoal: z.string(),
    hypothesis: z.string(),
    targetConcept: z.string(),
    suggestedDifficulty: z.number(),
    questionType: z.enum(['mcq', 'short_answer', 'true_false']).optional(),
    probingStrategy: z.string().optional(),
    distractorGuidance: z.string().optional(),
    reasoningChain: z.string().optional(),
})

// ─── Micro Analysis Result ─────────────────────────────────────────
export const MicroAnalysisResultSchema = z.object({
    deductions: z.array(z.object({
        concept: z.string(),
        deduction: z.string(),
        deductionType: z.enum([
            'strength', 'weakness', 'misconception',
            'learning_style', 'behavioral', 'insight'
        ]),
        confidence: z.number().min(0).max(1),
    })),
    narrativeMoment: z.string().optional(),
    adjustedDifficulty: z.number().optional(),
    nextObjectiveSuggestion: z.string().optional(),
})

// ─── Full Assessment State ─────────────────────────────────────────
export const AssessmentStateSchema = z.object({
    assessmentId: z.string(),
    topic: z.string(),
    currentDifficulty: z.number().min(1).max(10),
    consecutiveCorrect: z.number().int().min(0),
    consecutiveIncorrect: z.number().int().min(0),
    questionsAnswered: z.number().int().min(0),
    currentObjective: z.string().optional(),
    currentDeductionSpace: DeductionSpaceSchema.optional(), // Was `any`
    currentInvestigativeObjective: InvestigativeObjectiveSchema.optional(),
    lastMicroAnalysis: MicroAnalysisResultSchema.optional(),
    history: z.array(HistoryEntrySchema),
})

// ─── Derived Types ─────────────────────────────────────────────────
export type HistoryEntry = z.infer<typeof HistoryEntrySchema>
export type InvestigativeObjective = z.infer<typeof InvestigativeObjectiveSchema>
export type MicroAnalysisResult = z.infer<typeof MicroAnalysisResultSchema>
export type AssessmentState = z.infer<typeof AssessmentStateSchema>
