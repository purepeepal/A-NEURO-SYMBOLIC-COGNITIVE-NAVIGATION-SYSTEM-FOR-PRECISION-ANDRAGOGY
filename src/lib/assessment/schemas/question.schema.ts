/**
 * Question Schemas — Raw (LLM) and Strict (Internal)
 * 
 * Symposium 3.4 Directive: Two-layer validation at LLM boundary
 * Raw schemas use z.coerce and .transform() for LLM quirks
 * Strict schemas enforce business rules
 */
import { z } from 'zod'
import { QuestionTypeSchema, CompetencyLevelSchema, ErrorTypeSchema } from './response.schema'

// ─── Deduction Space ───────────────────────────────────────────────
export const ExpectedErrorSchema = z.object({
    pattern: z.string(),
    implies: z.string(),
    errorType: z.enum(['conceptual', 'procedural', 'careless', 'prerequisite_gap']),
})

export const DeductionSpaceSchema = z.object({
    expectedErrors: z.array(ExpectedErrorSchema),
    futuresFeedback: z.object({
        contentStyle: z.string(),
        cognitiveLoad: z.enum(['high', 'medium', 'low']),
        engagementHint: z.string(),
    }).optional(),
})

// ─── Strict Question Schema (Internal) ─────────────────────────────
export const GeneratedQuestionSchema = z.object({
    concept: z.string().min(1),
    difficulty: z.number().int().min(1).max(10),
    questionType: QuestionTypeSchema,
    questionText: z.string().min(10),
    options: z.record(z.string(), z.string()).optional(),
    correctAnswer: z.string().min(1),
    explanation: z.string(),
    prerequisites: z.array(z.string()),
    objective: z.string(),
    competencyLevel: CompetencyLevelSchema,
    deductionSpace: DeductionSpaceSchema,
})

// ─── Raw Question Schema (Permissive — from LLM) ──────────────────
// Handles common LLM quirks: numeric strings, missing optional fields, extra whitespace
export const RawGeneratedQuestionSchema = z.object({
    concept: z.string().transform(s => s.trim()),
    difficulty: z.coerce.number().min(1).max(10),
    questionType: z.string().transform(s => s.toLowerCase().trim()).pipe(QuestionTypeSchema),
    questionText: z.string().transform(s => s.trim()),
    options: z.record(z.string(), z.string()).optional().nullable().transform(v => v ?? undefined),
    correctAnswer: z.string().transform(s => s.trim()),
    explanation: z.string().default(''),
    prerequisites: z.array(z.string()).default([]),
    objective: z.string().default(''),
    competencyLevel: z.string()
        .transform(s => s.toLowerCase().trim())
        .pipe(CompetencyLevelSchema)
        .default('understand'),
    deductionSpace: z.object({
        expectedErrors: z.array(z.object({
            pattern: z.string(),
            implies: z.string(),
            errorType: z.string().transform(s => {
                const normalized = s.toLowerCase().trim().replace(/[\s-]+/g, '_')
                const ALIASES: Record<string, string> = {
                    'calculation': 'procedural', 'computational': 'procedural', 'arithmetic': 'procedural',
                    'misunderstanding': 'conceptual', 'interpretation': 'conceptual', 'conceptual_error': 'conceptual',
                    'oversight': 'careless', 'attention': 'careless', 'slip': 'careless',
                    'gap': 'prerequisite_gap', 'missing_knowledge': 'prerequisite_gap', 'foundation': 'prerequisite_gap',
                }
                return ALIASES[normalized] ?? normalized
            }).pipe(z.enum(['conceptual', 'procedural', 'careless', 'prerequisite_gap'])),
        })).default([]),
        futuresFeedback: z.object({
            contentStyle: z.string(),
            cognitiveLoad: z.string().transform(s => s.toLowerCase().trim())
                .pipe(z.enum(['high', 'medium', 'low'])),
            engagementHint: z.string(),
        }).optional(),
    }).default({ expectedErrors: [] }),
})

// ─── Prerequisite Tree ─────────────────────────────────────────────
export const ConceptNodeSchema = z.object({
    name: z.string(),
    difficulty: z.number(),
    prerequisites: z.array(z.string()),
    description: z.string(),
    type: z.string().optional(),
})

export const PrerequisiteTreeSchema = z.object({
    topic: z.string(),
    concepts: z.array(ConceptNodeSchema),
})

// ─── Derived Types ─────────────────────────────────────────────────
export type DeductionSpace = z.infer<typeof DeductionSpaceSchema>
export type ExpectedError = z.infer<typeof ExpectedErrorSchema>
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>
export type RawGeneratedQuestion = z.infer<typeof RawGeneratedQuestionSchema>
export type ConceptNode = z.infer<typeof ConceptNodeSchema>
export type PrerequisiteTree = z.infer<typeof PrerequisiteTreeSchema>
