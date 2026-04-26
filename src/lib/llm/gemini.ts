/**
 * GeminiService — thin facade delegating to domain services
 *
 * Implements LLMProvider by composing 5 focused services over a shared provider core.
 * All domain logic lives in services/ — this file is pure wiring.
 */

import type {
    LLMProvider,
    GeneratedQuestion,
    PrerequisiteTree,
    ErrorFingerprint,
    EvaluateAnswerResult,
    InvestigativeObjective,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
    MicroAnalysisResult,
    ProbingQuestionRecommendation,
    UserPersona,
    ActionPlan,
    AssessmentSnapshot,
    ChatMessage,
    DeductionSpace,
    SessionPersona,
    LearningSnippet,
    EnrichedSessionReport,
} from './types'
import type { ResponseRow } from '@/types/db-rows'
import type { CalibrationResult } from '@/lib/domain/assessment/self-assessment'
import { LLM_CONFIG } from './config'
import { geminiProvider } from './providers/gemini'
import { groqProvider } from './providers/groq'
import { instituteProvider } from './providers/institute'
import type { LLMProviderCore } from './providers/types'
import { z } from 'zod'
import { createLogger } from '@/lib/core/logger'

const logger = createLogger({ requestId: 'fallback-orchestrator' })

class FallbackProvider implements LLMProviderCore {
    name: string
    constructor(private providers: LLMProviderCore[]) {
        this.name = `fallback(${providers.map(p => p.name).join('->')})`
    }

    initialize() {
        for (const p of this.providers) {
            try { p.initialize() } catch (e) { /* ignore */ }
        }
    }

    async generateWithRetry<T>(
        prompt: string,
        schema: z.ZodType<T>,
        requestType: string,
        priority?: number,
        temperature?: number
    ): Promise<T> {
        let lastError: Error | unknown;
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[i];
            try {
                if (i > 0) {
                    logger.warn(`[Fallback] Attempting secondary provider ${provider.name} for ${requestType}...`)
                }
                return await provider.generateWithRetry(prompt, schema, requestType, priority, temperature);
            } catch (error) {
                lastError = error;
                logger.error(`[Fallback] Provider ${provider.name} failed for ${requestType}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        throw new Error(`All fallback providers failed for ${requestType}. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }
}
import { QuestionService } from './services/question.service'
import { EvaluationService } from './services/evaluation.service'
import { AnalysisService } from './services/analysis.service'
import { ReportService } from './services/report.service'
import { ChatService } from './services/chat.service'

export class GeminiService implements LLMProvider {
    name = 'active-load-balancer' // Re-branded since it now orchestrates three models

    private getProvider(domain: keyof typeof LLM_CONFIG.PROVIDER_ROUTING): LLMProviderCore {
        const providerNames = LLM_CONFIG.PROVIDER_ROUTING[domain]
        const providers = providerNames.map((name: string) => {
            switch (name) {
                case 'groq': return groqProvider
                case 'institute': return instituteProvider
                case 'gemini':
                default: return geminiProvider
            }
        })
        return new FallbackProvider(providers)
    }

    private questionSvc = new QuestionService(this.getProvider('question'))
    private evaluationSvc = new EvaluationService(this.getProvider('evaluation'))
    private analysisSvc = new AnalysisService(this.getProvider('analysis'))
    private reportSvc = new ReportService(this.getProvider('report'))
    private chatSvc = new ChatService(this.getProvider('chat'))

    /** Set the current assessment ID for cost tracking across all providers */
    setAssessmentId(id: string | null) {
        geminiProvider.setAssessmentId(id)
        // Note: Groq and Institute don't currently track assessment IDs
    }

    // ── Question Service ───────────────────────────────────────────
    generatePrerequisiteTree(topic: string): Promise<PrerequisiteTree> {
        return this.questionSvc.generatePrerequisiteTree(topic)
    }
    generateSubTopics(topic: string): Promise<string[]> {
        return this.questionSvc.generateSubTopics(topic)
    }
    generateQuestion(
        concept: string, difficulty: number, topic: string,
        userPersona?: Partial<UserPersona> | null, previousConcepts?: string[],
        preferredType?: 'mcq' | 'short_answer' | 'true_false', pastQuestions?: string[],
        probingGuidance?: string, distractorStrategy?: string,
        investigativeObjective?: InvestigativeObjective
    ): Promise<GeneratedQuestion> {
        return this.questionSvc.generateQuestion(
            concept, difficulty, topic, userPersona, previousConcepts,
            preferredType, pastQuestions, probingGuidance, distractorStrategy,
            investigativeObjective
        )
    }
    generateInvestigativeObjective(
        state: AssessmentSnapshot, currentPersona: Partial<UserPersona> | null,
        pastObjectives: InvestigativeObjective[]
    ): Promise<InvestigativeObjective> {
        return this.questionSvc.generateInvestigativeObjective(state, currentPersona, pastObjectives)
    }
    recommendProbingQuestion(
        hypothesis: string, state: AssessmentSnapshot, conceptPool: string[]
    ): Promise<ProbingQuestionRecommendation> {
        return this.questionSvc.recommendProbingQuestion(hypothesis, state, conceptPool)
    }

    // ── Evaluation Service ─────────────────────────────────────────
    fingerprintError(
        question: string, correctAnswer: string, userAnswer: string, concept: string
    ): Promise<ErrorFingerprint> {
        return this.evaluationSvc.fingerprintError(question, correctAnswer, userAnswer, concept)
    }
    evaluateAnswer(
        question: string, correctAnswer: string, userAnswer: string, concept: string,
        objective: string, deductionSpace: DeductionSpace,
        userPersona?: Partial<UserPersona> | null
    ): Promise<EvaluateAnswerResult> {
        return this.evaluationSvc.evaluateAnswer(
            question, correctAnswer, userAnswer, concept, objective, deductionSpace, userPersona
        )
    }
    verifyAnswer(
        question: string, correctAnswer: string, userAnswer: string
    ): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> {
        return this.evaluationSvc.verifyAnswer(question, correctAnswer, userAnswer)
    }

    // ── Analysis Service ───────────────────────────────────────────
    extractBehavioralPatterns(
        state: AssessmentSnapshot, responses: ResponseRow[]
    ): Promise<BehavioralPatternAnalysis> {
        return this.analysisSvc.extractBehavioralPatterns(state, responses)
    }
    detectAnomalies(
        responses: ResponseRow[], patterns: BehavioralPatternAnalysis
    ): Promise<AnomalyAnalysis> {
        return this.analysisSvc.detectAnomalies(responses, patterns)
    }
    synthesizeInsights(
        patterns: BehavioralPatternAnalysis, anomalies: AnomalyAnalysis,
        currentPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeInsight[]> {
        return this.analysisSvc.synthesizeInsights(patterns, anomalies, currentPersona)
    }
    buildCognitiveBehavioralProfile(
        state: AssessmentSnapshot, responses: ResponseRow[],
        insights: InvestigativeInsight[], existingPersona: Partial<UserPersona> | null
    ): Promise<CognitiveBehavioralProfile> {
        return this.analysisSvc.buildCognitiveBehavioralProfile(state, responses, insights, existingPersona)
    }
    generateInvestigativeReport(
        state: AssessmentSnapshot, responses: ResponseRow[],
        insights: InvestigativeInsight[], profile: CognitiveBehavioralProfile,
        existingPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeReport> {
        return this.analysisSvc.generateInvestigativeReport(state, responses, insights, profile, existingPersona)
    }
    performMicroAnalysis(
        lastResponse: Partial<ResponseRow>, state: AssessmentSnapshot,
        currentPersona: Partial<UserPersona> | null,
        biometrics?: { mouseJitterScore?: number; focusLossCount?: number; timeToFirstInteractionMs?: number; revisionCount?: number; scrollHesitationCount?: number }
    ): Promise<MicroAnalysisResult> {
        return this.analysisSvc.performMicroAnalysis(lastResponse, state, currentPersona, biometrics)
    }
    generateLearningSnippet(
        state: AssessmentSnapshot, lastResponse: Partial<ResponseRow>,
        microAnalysis: MicroAnalysisResult, userPersona?: Partial<UserPersona> | null
    ): Promise<LearningSnippet> {
        return this.analysisSvc.generateLearningSnippet(state, lastResponse, microAnalysis, userPersona || null)
    }

    // ── Report Service ─────────────────────────────────────────────
    analyzeSession(
        topic: string,
        history: { question: string; isCorrect: boolean; concept: string; difficulty: number }[],
        userPersona?: Partial<UserPersona> | null
    ): Promise<SessionPersona> {
        return this.reportSvc.analyzeSession(topic, history, userPersona)
    }
    generateNarrative(
        topic: string, state: AssessmentSnapshot,
        trigger: 'interval' | 'streak' | 'error' | 'pattern_detected',
        recentConcept?: string
    ): Promise<{ narrative: string }> {
        return this.reportSvc.generateNarrative(topic, state, trigger, recentConcept)
    }
    generateCalibrationInsight(
        calibration: CalibrationResult[]
    ): Promise<{ headline: string; detail: string }> {
        return this.reportSvc.generateCalibrationInsight(calibration)
    }
    generateActionPlan(
        topic: string,
        gaps: Partial<{ concept: string; mastery_score: number | null; gap_severity: string | null; error_patterns: unknown }>[],
        calibration: CalibrationResult[], accuracy: number
    ): Promise<ActionPlan> {
        return this.reportSvc.generateActionPlan(topic, gaps, calibration, accuracy)
    }
    generateEnrichedReport(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        calibration: CalibrationResult[],
        profile: CognitiveBehavioralProfile | null,
        userPersona?: Partial<UserPersona> | null
    ): Promise<Omit<EnrichedSessionReport, keyof SessionPersona> & { title?: string }> {
        return this.reportSvc.generateEnrichedReport(state, responses, calibration, profile, userPersona || null)
    }

    // ── Chat Service ───────────────────────────────────────────────
    chat(
        message: string,
        context?: { question: string; correctAnswer: string; userAnswer: string; concept: string; explanation: string },
        userPersona?: Partial<UserPersona> | null,
        history?: ChatMessage[],
        mode?: 'socratic' | 'evaluation'
    ): Promise<{ message: string; action: 'none' | 'adjust_score' | 'provide_hint'; sentiment: 'positive' | 'neutral' | 'negative' }> {
        return this.chatSvc.chat(message, context, userPersona, history, mode)
    }
}

// Singleton export
export const gemini = new GeminiService()
