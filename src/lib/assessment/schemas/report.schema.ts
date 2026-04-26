/**
 * Report Schemas
 * Validates assessment report structures and knowledge tree data
 * 
 * Symposium 3.4 Directive: Replace `any[]` in knowledgeTree with typed nodes/edges
 */
import { z } from 'zod'
import { ErrorTypeSchema } from './response.schema'

// ─── Knowledge Tree ────────────────────────────────────────────────
export const KnowledgeTreeNodeSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
        label: z.string(),
        mastery: z.enum(['mastered', 'partial', 'gap', 'untested']),
        questionsAsked: z.number().int().min(0),
        accuracy: z.number().min(0).max(1),
        confidence: z.object({
            label: z.string(),
            sampleSize: z.number(),
            caveat: z.string().optional(),
        }).optional(),
    }),
})

export const KnowledgeTreeEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string().optional(),
    animated: z.boolean().optional(),
    markerEnd: z.record(z.string(), z.unknown()).optional(),
    style: z.record(z.string(), z.unknown()).optional(),
})

export const KnowledgeTreeSchema = z.object({
    nodes: z.array(KnowledgeTreeNodeSchema),
    edges: z.array(KnowledgeTreeEdgeSchema),
})

// ─── Concept Performance ───────────────────────────────────────────
export const ConceptPerformanceSchema = z.object({
    concept: z.string(),
    questionsAsked: z.number().int().min(0),
    correctCount: z.number().int().min(0),
    averageDifficulty: z.number(),
    timeTakenSeconds: z.number(),
    confidence: z.object({
        label: z.string(),
        sampleSize: z.number(),
        caveat: z.string().optional(),
    }).optional(),
    errorPatterns: z.object({
        conceptual: z.number(),
        procedural: z.number(),
        careless: z.number(),
        prerequisite_gap: z.number(),
        correct: z.number(),
    }),
    lastAttempt: z.coerce.date(),
})

// ─── Investigative Report ──────────────────────────────────────────
export const InvestigativeInsightSchema = z.object({
    category: z.string(),
    finding: z.string(),
    evidence: z.string(),
    confidence: z.number(),
    implication: z.string(),
})

export const InvestigativeReportSchema = z.object({
    insights: z.array(InvestigativeInsightSchema),
    narrativeAnalysis: z.string().optional(),
    cognitiveBehavioralProfile: z.record(z.string(), z.unknown()).optional(),
    knowledgeTopology: z.record(z.string(), z.unknown()).optional(),
    strategicRecommendations: z.array(z.record(z.string(), z.unknown())).optional(),
    predictions: z.record(z.string(), z.unknown()).optional(),
})

// ─── Action Plan ───────────────────────────────────────────────────
export const ActionPlanSchema = z.object({
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

// ─── Full Report Schema ────────────────────────────────────────────
export const AssessmentReportSchema = z.object({
    assessmentId: z.string(),
    topic: z.string(),
    completedAt: z.coerce.date(),
    totalQuestions: z.number(),
    correctCount: z.number(),
    accuracy: z.number(),
    averageDifficulty: z.number(),
    timeTakenSeconds: z.number(),
    conceptPerformance: z.array(ConceptPerformanceSchema),
    knowledgeGaps: z.array(z.record(z.string(), z.unknown())),
    totalGaps: z.number(),
    criticalGaps: z.number(),
    moderateGaps: z.number(),
    minorGaps: z.number(),
    recommendations: z.array(z.string()),
    investigativeReport: InvestigativeReportSchema.optional(),
    calibrationData: z.array(z.record(z.string(), z.unknown())).optional(),
    calibrationInsight: z.object({
        headline: z.string(),
        detail: z.string(),
    }).optional(),
    actionPlan: ActionPlanSchema.optional(),
    knowledgeTree: KnowledgeTreeSchema.optional(),
})

// ─── Derived Types ─────────────────────────────────────────────────
export type KnowledgeTreeNode = z.infer<typeof KnowledgeTreeNodeSchema>
export type KnowledgeTreeEdge = z.infer<typeof KnowledgeTreeEdgeSchema>
export type KnowledgeTree = z.infer<typeof KnowledgeTreeSchema>
export type ConceptPerformance = z.infer<typeof ConceptPerformanceSchema>
export type InvestigativeInsight = z.infer<typeof InvestigativeInsightSchema>
export type ActionPlan = z.infer<typeof ActionPlanSchema>
export type AssessmentReport = z.infer<typeof AssessmentReportSchema>
