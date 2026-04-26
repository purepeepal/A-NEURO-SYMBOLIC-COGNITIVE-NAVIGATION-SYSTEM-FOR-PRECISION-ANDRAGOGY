/**
 * STREETS Investigative Analyzer
 * 
 * A creative, deductive reasoning engine that performs detective-style analysis
 * on learner behavior to build rich psychological and cognitive profiles.
 * 
 * Philosophy:
 * - Every question is an investigative probe, not just an assessment
 * - Patterns reveal more than individual answers
 * - Unexpected behaviors are gold mines for insights
 * - The AI should think like a detective, not a grader
 */

import { gemini } from '@/lib/llm'
import { AssessmentState } from './engine'
import { 
    Deduction, 
    UserPersona,
    InvestigativeObjective,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
    MicroAnalysisResult,
    ProbingQuestionRecommendation
} from '@/lib/llm/types'
import { DynamicCognitiveGraphProfiler } from '@/lib/cognitive-graph'

/**
 * The Investigative Analyzer - Detective-style cognitive profiler
 */
export class InvestigativeAnalyzer {
    
    /**
     * Determine the next investigative objective based on current intel
     * This is the "detective's next move" - what question will reveal the most?
     */
    async determineNextObjective(
        state: AssessmentState,
        currentPersona: Partial<UserPersona> | null,
        pastObjectives: InvestigativeObjective[]
    ): Promise<InvestigativeObjective> {
        // Call AI for creative investigative strategy
        if (!gemini.generateInvestigativeObjective) {
            throw new Error('generateInvestigativeObjective not available on LLM provider')
        }
        return gemini.generateInvestigativeObjective(state, currentPersona, pastObjectives)
    }
    
    /**
     * Synthesize all session data into investigative insights
     * Uses multi-pass AI analysis for depth
     */
    async synthesizeInsights(
        state: AssessmentState,
        responses: any[],
        currentPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeInsight[]> {
        if (!gemini.extractBehavioralPatterns || !gemini.detectAnomalies || !gemini.synthesizeInsights) {
            throw new Error('Investigative methods not available on LLM provider')
        }
        
        // First pass: Pattern extraction
        const patterns = await gemini.extractBehavioralPatterns(state, responses)
        
        // Second pass: Anomaly detection
        const anomalies = await gemini.detectAnomalies(responses, patterns)
        
        // Third pass: Insight synthesis
        return gemini.synthesizeInsights(patterns, anomalies, currentPersona)
    }
    
    /**
     * Build comprehensive cognitive-behavioral profile
     */
    async buildCognitiveBehavioralProfile(
        state: AssessmentState,
        responses: any[],
        insights: InvestigativeInsight[],
        existingPersona: Partial<UserPersona> | null
    ): Promise<CognitiveBehavioralProfile> {
        if (!gemini.buildCognitiveBehavioralProfile) {
            throw new Error('buildCognitiveBehavioralProfile not available on LLM provider')
        }
        return gemini.buildCognitiveBehavioralProfile(state, responses, insights, existingPersona)
    }
    
    /**
     * Generate full investigative report
     * The crown jewel - detective's final dossier
     */
    async generateInvestigativeReport(
        assessmentId: string,
        state: AssessmentState,
        responses: any[],
        existingPersona: Partial<UserPersona> | null,
        userId?: string
    ): Promise<InvestigativeReport> {
        if (!gemini.generateInvestigativeReport) {
            throw new Error('generateInvestigativeReport not available on LLM provider')
        }
        
        // Step 1: Synthesize all insights
        const insights = await this.synthesizeInsights(state, responses, existingPersona)
        
        // Step 2: Build cognitive-behavioral profile
        const profile = await this.buildCognitiveBehavioralProfile(state, responses, insights, existingPersona)
        
        // Step 3: Generate full narrative report via AI
        const report = await gemini.generateInvestigativeReport(
            state,
            responses,
            insights,
            profile,
            existingPersona
        )

        // Step 4: Fire-and-forget cognitive graph update
        // Runs asynchronously — does NOT block report delivery
        if (userId) {
            this.updateCognitiveGraph(userId, assessmentId, state, insights, profile, report, existingPersona)
                .catch(() => {/* Swallow — graph update is non-critical */ })
        }

        return report
    }

    /**
     * Update the user's persistent cognitive graph with session results.
     * This is a fire-and-forget operation — it never blocks the main pipeline.
     */
    private async updateCognitiveGraph(
        userId: string,
        assessmentId: string,
        state: AssessmentState,
        insights: InvestigativeInsight[],
        profile: CognitiveBehavioralProfile,
        report: InvestigativeReport,
        existingPersona: Partial<UserPersona> | null
    ): Promise<void> {
        const profiler = new DynamicCognitiveGraphProfiler()
        await profiler.loadOrCreate(userId)
        await profiler.ingestSessionResults(
            assessmentId,
            assessmentId,
            state,
            insights,
            profile,
            report,
            existingPersona
        )
        await profiler.save()
    }
    
    /**
     * Real-time micro-analysis during session
     * Quick deductions to inform next question
     */
    async performMicroAnalysis(
        lastResponse: any,
        state: AssessmentState,
        currentPersona: Partial<UserPersona> | null
    ): Promise<MicroAnalysisResult> {
        if (!gemini.performMicroAnalysis) {
            throw new Error('performMicroAnalysis not available on LLM provider')
        }
        return gemini.performMicroAnalysis(lastResponse, state, currentPersona)
    }
    
    /**
     * Hypothesis-driven question recommendation
     * "If I ask this question in this way, what can I learn?"
     */
    async recommendProbingQuestion(
        hypothesis: string,
        state: AssessmentState,
        conceptPool: string[]
    ): Promise<ProbingQuestionRecommendation> {
        if (!gemini.recommendProbingQuestion) {
            throw new Error('recommendProbingQuestion not available on LLM provider')
        }
        return gemini.recommendProbingQuestion(hypothesis, state, conceptPool)
    }
}

export const investigativeAnalyzer = new InvestigativeAnalyzer()
