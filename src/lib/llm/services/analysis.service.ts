/**
 * Analysis Service ΓÇö investigative analysis pipeline
 *
 * Behavioral patterns ΓåÆ anomaly detection ΓåÆ insight synthesis ΓåÆ
 * cognitive profile ΓåÆ investigative report ΓåÆ micro-analysis
 */

import { PROMPTS, INVESTIGATIVE_DEEP_PROMPTS } from '../prompts'
import { generateSnippetPrompt } from '../prompts/snippet_prompt'
import { PROMPT_TEMPERATURES } from '../config'
import * as schemas from '../validators'
import { z } from 'zod'
import type { LLMProviderCore } from '../providers/types'
import type { ResponseRow } from '@/types/db-rows'
import type {
    AssessmentSnapshot,
    UserPersona,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
    MicroAnalysisResult,
    LearningSnippet,
} from '../types'

export class AnalysisService {
    constructor(private provider: LLMProviderCore) {}

    async extractBehavioralPatterns(
        state: AssessmentSnapshot,
        responses: ResponseRow[]
    ): Promise<BehavioralPatternAnalysis> {
        this.provider.initialize()
        const prompt = PROMPTS.behavioralPatterns.template({ state, responses })
        return this.provider.generateWithRetry<BehavioralPatternAnalysis>(
            prompt,
            z.object({
                patterns: z.array(z.object({
                    pattern: z.string(), evidence: z.array(z.string()), impact: z.string()
                }))
            }) as any,
            'behavioral_patterns', 4, PROMPT_TEMPERATURES.behavioralPatterns
        )
    }

    async detectAnomalies(
        responses: ResponseRow[],
        patterns: BehavioralPatternAnalysis
    ): Promise<AnomalyAnalysis> {
        this.provider.initialize()
        const prompt = PROMPTS.anomalyDetection.template({ responses, patterns })
        return this.provider.generateWithRetry<AnomalyAnalysis>(
            prompt,
            z.object({
                anomalies: z.array(z.object({
                    anomaly: z.string(), context: z.string(), potentialCause: z.string()
                }))
            }) as any,
            'anomaly_detection', 4, PROMPT_TEMPERATURES.anomalyDetection
        )
    }

    async synthesizeInsights(
        patterns: BehavioralPatternAnalysis,
        anomalies: AnomalyAnalysis,
        currentPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeInsight[]> {
        this.provider.initialize()
        const prompt = PROMPTS.insightSynthesis.template({ patterns, anomalies, currentPersona })
        const result = await this.provider.generateWithRetry<{ insights: InvestigativeInsight[] }>(
            prompt,
            z.object({ insights: z.array(z.any()) }) as any,
            'insight_synthesis', 3, PROMPT_TEMPERATURES.insightSynthesis
        )
        return result.insights
    }

    async buildCognitiveBehavioralProfile(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        insights: InvestigativeInsight[],
        existingPersona: Partial<UserPersona> | null
    ): Promise<CognitiveBehavioralProfile> {
        this.provider.initialize()
        const prompt = PROMPTS.cognitiveBehavioralProfile.template({ state, responses, insights, existingPersona })
        return this.provider.generateWithRetry<CognitiveBehavioralProfile>(
            prompt,
            z.object({
                learningStyle: z.string(), strengths: z.array(z.string()),
                weaknesses: z.array(z.string()), behavioralTraits: z.array(z.string()),
                recommendedApproach: z.string()
            }) as any,
            'cognitive_profile', 3, PROMPT_TEMPERATURES.cognitiveBehavioralProfile
        )
    }

    async generateInvestigativeReport(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        insights: InvestigativeInsight[],
        profile: CognitiveBehavioralProfile,
        existingPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeReport> {
        this.provider.initialize()
        const prompt = PROMPTS.investigativeReport.template({ state, responses, insights, profile, existingPersona })
        return this.provider.generateWithRetry<InvestigativeReport>(
            prompt,
            z.object({
                executiveSummary: z.string(), keyInsights: z.array(z.any()),
                strategicRecommendations: z.array(z.any()), timelineAnalysis: z.string(),
                narrativeAnalysis: z.string()
            }) as any,
            'investigative_report', 2, PROMPT_TEMPERATURES.investigativeReport
        )
    }

    async performMicroAnalysis(
        lastResponse: Partial<ResponseRow>,
        state: AssessmentSnapshot,
        currentPersona: Partial<UserPersona> | null,
        biometrics?: {
            mouseJitterScore?: number
            focusLossCount?: number
            timeToFirstInteractionMs?: number
            revisionCount?: number
            scrollHesitationCount?: number
        }
    ): Promise<MicroAnalysisResult> {
        this.provider.initialize()
        const prompt = INVESTIGATIVE_DEEP_PROMPTS.microAnalysis.template({ lastResponse, state, currentPersona, biometrics })
        return this.provider.generateWithRetry<MicroAnalysisResult>(
            prompt, schemas.RawMicroAnalysisSchema as any,
            'micro_analysis', 6, PROMPT_TEMPERATURES.microAnalysis
        )
    }

    async generateLearningSnippet(
        state: AssessmentSnapshot,
        lastResponse: Partial<ResponseRow>,
        microAnalysis: MicroAnalysisResult,
        userPersona: Partial<UserPersona> | null
    ): Promise<LearningSnippet> {
        this.provider.initialize()
        const prompt = generateSnippetPrompt(state, lastResponse, microAnalysis, userPersona)
        return this.provider.generateWithRetry<LearningSnippet>(
            prompt,
            z.object({
                type: z.enum(['misconception_correction', 'perspective_shift', 'reinforcement', 'bridge_concept', 'metacognitive_prompt']),
                title: z.string(),
                content: z.string(),
                relatedConcept: z.string(),
                metaLearningPractice: z.string(),
                sourceEvidence: z.string()
            }) as any,
            'learning_snippet', 6, PROMPT_TEMPERATURES.microAnalysis || 0.7
        )
    }
}
