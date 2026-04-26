/**
 * Report Service ΓÇö session analysis, narrative, calibration insight, action plan
 */

import { PROMPTS } from '../prompts'
import { generateEnrichedReportPrompt } from '../prompts/enriched_report'
import { PROMPT_TEMPERATURES } from '../config'
import * as schemas from '../validators'
import { z } from 'zod'
import type { LLMProviderCore } from '../providers/types'
import type { CalibrationResult } from '@/lib/domain/assessment/self-assessment'
import type { ResponseRow } from '@/types/db-rows'
import type {
    AssessmentSnapshot,
    UserPersona,
    SessionPersona,
    ActionPlan,
    EnrichedSessionReport,
    CognitiveBehavioralProfile,
} from '../types'

export class ReportService {
    constructor(private provider: LLMProviderCore) {}

    async analyzeSession(
        topic: string,
        history: { question: string; isCorrect: boolean; concept: string; difficulty: number }[],
        userPersona?: Partial<UserPersona> | null
    ): Promise<SessionPersona> {
        this.provider.initialize()
        const prompt = PROMPTS.sessionAnalysis.template({ topic, history, userPersona })
        return this.provider.generateWithRetry<SessionPersona>(
            prompt,
            z.object({ requiresIntervention: z.boolean(), interventionReason: z.string() }) as any,
            'analysis', 5, PROMPT_TEMPERATURES.sessionAnalysis
        )
    }

    async generateNarrative(
        topic: string,
        state: AssessmentSnapshot,
        trigger: 'interval' | 'streak' | 'error' | 'pattern_detected',
        recentConcept?: string
    ): Promise<{ narrative: string }> {
        this.provider.initialize()
        const prompt = PROMPTS.narrativeMoment.template({ topic, state, trigger, recentConcept })
        return this.provider.generateWithRetry<{ narrative: string }>(
            prompt, schemas.RawNarrativeMomentSchema as any,
            'narrative', 6, PROMPT_TEMPERATURES.narrativeMoment
        )
    }

    async generateCalibrationInsight(
        calibration: CalibrationResult[]
    ): Promise<{ headline: string; detail: string }> {
        this.provider.initialize()
        const prompt = PROMPTS.calibrationInsight.template(calibration)
        return this.provider.generateWithRetry<{ headline: string; detail: string }>(
            prompt, schemas.RawCalibrationInsightSchema as any,
            'calibration_insight', 6, PROMPT_TEMPERATURES.calibrationInsight
        )
    }

    async generateActionPlan(
        topic: string,
        gaps: Partial<{ concept: string; mastery_score: number | null; gap_severity: string | null; error_patterns: unknown }>[],
        calibration: CalibrationResult[],
        accuracy: number
    ): Promise<ActionPlan> {
        this.provider.initialize()
        const prompt = PROMPTS.actionPlan.template({ topic, gaps, calibration, accuracy })
        return this.provider.generateWithRetry<ActionPlan>(
            prompt, schemas.RawActionPlanSchema as any,
            'action_plan', 6, PROMPT_TEMPERATURES.actionPlan
        )
    }

    async generateEnrichedReport(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        calibration: CalibrationResult[],
        profile: CognitiveBehavioralProfile | null,
        userPersona: Partial<UserPersona> | null
    ): Promise<Omit<EnrichedSessionReport, keyof import('../types').SessionPersona> & { title?: string }> {
        this.provider.initialize()
        const prompt = generateEnrichedReportPrompt(state, responses, calibration, profile, userPersona)
        return this.provider.generateWithRetry(
            prompt,
            z.object({
                title: z.string().optional(),
                perspectiveShifts: z.array(z.object({
                    currentDomain: z.string(),
                    suggestedDomain: z.string(),
                    rationale: z.string(),
                    bridgeConcept: z.string(),
                    expectedGrowth: z.string()
                })),
                metaLearningRecommendations: z.array(z.object({
                    practice: z.string(),
                    description: z.string(),
                    applicableConcepts: z.array(z.string()),
                    frequencyGuidance: z.string(),
                    evidenceBasis: z.string()
                })),
                learnerStageAssessment: z.enum(['novice', 'intermediate', 'expert']),
                learnerStageEvidence: z.string(),
                metacognitiveCalibrationSummary: z.string(),
                suggestionsTracking: z.array(z.any())
            }) as any,
            'enriched_report', 3, PROMPT_TEMPERATURES.actionPlan || 0.7
        )
    }
}
