/**
 * Core assessment types ΓÇö questions, personas, provider interface
 */

import type { HistoryEntry, ResponseRow } from '@/types/db-rows'
import type { CalibrationResult } from '@/lib/domain/assessment/self-assessment'
import type { ChatMessage } from '../context-manager'
export type { ChatMessage } from '../context-manager'

import type {
    InvestigativeObjective,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
    MicroAnalysisResult,
    ProbingQuestionRecommendation,
} from './investigative'

/**
 * Lightweight snapshot of assessment state for LLM provider methods.
 * Mirrors AssessmentState from engine.ts without creating a circular import.
 */
export interface AssessmentSnapshot {
    assessmentId: string
    topic: string
    currentDifficulty: number
    consecutiveCorrect: number
    consecutiveIncorrect: number
    questionsAnswered: number
    currentObjective?: string
    currentInvestigativeObjective?: InvestigativeObjective
    lastMicroAnalysis?: MicroAnalysisResult
    history: HistoryEntry[]
}

export interface GeneratedQuestion {
    concept: string
    difficulty: number
    questionType: 'mcq' | 'short_answer' | 'true_false'
    questionText: string
    options?: Record<string, string>
    correctAnswer: string
    explanation: string
    prerequisites: string[]
    // New Modular Flow fields
    objective: string
    competencyLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
    deductionSpace: DeductionSpace
}

export interface DeductionSpace {
    expectedErrors: Array<{
        pattern: string
        implies: string
        errorType: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap'
    }>
    unexpectedPatterns: Array<{
        description: string
        action: 'flag_for_review' | 'probe_deeper' | 'record_insight'
    }>
    futuresFeedback: {
        contentStyle: string
        cognitiveLoad: 'high' | 'medium' | 'low'
        engagementHint: string
    }
}

export interface PrerequisiteTree {
    topic: string
    concepts: ConceptNode[]
}

export type ObjectiveType = 'recall' | 'procedural' | 'conceptual' | 'analytical';

export interface ConceptNode {
    name: string
    difficulty: number // 1-10
    prerequisites: string[]
    description: string
    type: ObjectiveType
}

export interface ErrorFingerprint {
    errorType: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap'
    explanation: string
    prerequisiteGaps: string[]
}

export interface Deduction {
    concept: string
    deduction: string
    deductionType: 'strength' | 'weakness' | 'misconception' | 'learning_style' | 'behavioral' | 'insight'
    confidence: number
}

export interface UserPersona {
    userId: string
    // 5D Cognitive Metrics
    depth: number
    breadth: number
    creativity: number
    persistence: number
    curiosity: number
    // Style & Knowledge
    preferredModality: 'visual' | 'verbal' | 'kinesthetic' | 'mixed'
    processingStyle: 'serialist' | 'holist'
    explanationPreference: string[]
    strongConcepts: string[]
    weakConcepts: string[]
    prerequisiteGaps: string[]
    // Behavioral
    averageResponseTime: number
    consistencyScore: number
    lastSessionAt?: Date
}

export interface SessionPersona {
    sessionId: string
    topic: string
    questionsAnswered: number
    accuracy: number
    averageDifficulty: number
    difficultyProgression: number[]
    errorBreakdown: Record<string, number>
    conceptsStruggled: string[]
    conceptsMastered: string[]
    synthesizedDeductions: Deduction[]
    descriptiveAnalysis: string
    immediateActions: string[]
    nextSessionFocus: string[]
    longTermPath: string[]
}

export interface LearningSnippet {
    type: 'misconception_correction' | 'perspective_shift' | 'reinforcement' | 'bridge_concept' | 'metacognitive_prompt'
    title: string
    content: string                     
    relatedConcept: string
    metaLearningPractice: string        
    sourceEvidence: string              
}

export interface PerspectiveShift {
    currentDomain: string               
    suggestedDomain: string             
    rationale: string                   
    bridgeConcept: string               
    expectedGrowth: string              
}

export interface MetaLearningRecommendation {
    practice: string                     
    description: string
    applicableConcepts: string[]
    frequencyGuidance: string            
    evidenceBasis: string                
}

export interface EnrichedSessionReport extends SessionPersona {
    perspectiveShifts: PerspectiveShift[]
    metaLearningRecommendations: MetaLearningRecommendation[]
    learnerStageAssessment: 'novice' | 'intermediate' | 'expert'  
    learnerStageEvidence: string
    metacognitiveCalibrationSummary: string   
    suggestionsTracking: {                   
        suggestionId: string
        suggestion: string
        status: 'pending' | 'explored' | 'dismissed'
        exploredAt?: string
    }[]
}

export interface LLMProvider {
    name: string;

    generatePrerequisiteTree(topic: string): Promise<PrerequisiteTree>;

    generateQuestion(
        concept: string,
        difficulty: number,
        topic: string,
        userPersona?: Partial<UserPersona> | null,
        previousConcepts?: string[],
        preferredType?: 'mcq' | 'short_answer' | 'true_false',
        pastQuestions?: string[],
        probingGuidance?: string,
        distractorStrategy?: string,
        investigativeObjective?: InvestigativeObjective
    ): Promise<GeneratedQuestion>;

    fingerprintError(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string
    ): Promise<ErrorFingerprint>;

    evaluateAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string,
        objective: string,
        deductionSpace: DeductionSpace,
        userPersona?: Partial<UserPersona> | null
    ): Promise<EvaluateAnswerResult>;

    analyzeSession(
        topic: string,
        history: { question: string, isCorrect: boolean, concept: string, difficulty: number }[],
        userPersona?: Partial<UserPersona> | null
    ): Promise<SessionPersona>;

    verifyAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string
    ): Promise<{ isCorrect: boolean; confidence: number; explanation: string }>;

    chat(
        message: string,
        context?: {
            question: string
            correctAnswer: string
            userAnswer: string
            concept: string
            explanation: string
        },
        userPersona?: Partial<UserPersona> | null,
        history?: ChatMessage[]
    ): Promise<{ message: string; action: 'none' | 'adjust_score' | 'provide_hint'; sentiment: 'positive' | 'neutral' | 'negative' }>;

    // Investigative Analysis Methods
    generateInvestigativeObjective?(
        state: AssessmentSnapshot,
        currentPersona: Partial<UserPersona> | null,
        pastObjectives: InvestigativeObjective[]
    ): Promise<InvestigativeObjective>;

    extractBehavioralPatterns?(
        state: AssessmentSnapshot,
        responses: ResponseRow[]
    ): Promise<BehavioralPatternAnalysis>;

    detectAnomalies?(
        responses: ResponseRow[],
        patterns: BehavioralPatternAnalysis
    ): Promise<AnomalyAnalysis>;

    synthesizeInsights?(
        patterns: BehavioralPatternAnalysis,
        anomalies: AnomalyAnalysis,
        currentPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeInsight[]>;

    buildCognitiveBehavioralProfile?(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        insights: InvestigativeInsight[],
        existingPersona: Partial<UserPersona> | null
    ): Promise<CognitiveBehavioralProfile>;

    generateInvestigativeReport?(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        insights: InvestigativeInsight[],
        profile: CognitiveBehavioralProfile,
        existingPersona: Partial<UserPersona> | null
    ): Promise<InvestigativeReport>;

    performMicroAnalysis?(
        lastResponse: Partial<ResponseRow>,
        state: AssessmentSnapshot,
        currentPersona: Partial<UserPersona> | null,
        biometrics?: { mouseJitterScore?: number; focusLossCount?: number; timeToFirstInteractionMs?: number; revisionCount?: number; scrollHesitationCount?: number }
    ): Promise<MicroAnalysisResult>;

    recommendProbingQuestion?(
        hypothesis: string,
        state: AssessmentSnapshot,
        conceptPool: string[]
    ): Promise<ProbingQuestionRecommendation>;

    // Self-Assessment Calibration
    generateSubTopics(topic: string): Promise<string[]>;

    generateNarrative?(
        topic: string,
        state: AssessmentSnapshot,
        trigger: 'interval' | 'streak' | 'error' | 'pattern_detected',
        recentConcept?: string
    ): Promise<{ narrative: string }>;

    generateCalibrationInsight?(
        calibration: CalibrationResult[]
    ): Promise<{ headline: string, detail: string }>;

    generateActionPlan?(
        topic: string,
        gaps: Partial<{ concept: string; mastery_score: number | null; gap_severity: string | null; error_patterns: unknown }>[],
        calibration: CalibrationResult[],
        accuracy: number
    ): Promise<ActionPlan>;

    generateLearningSnippet?(
        state: AssessmentSnapshot,
        lastResponse: Partial<ResponseRow>,
        microAnalysis: MicroAnalysisResult,
        userPersona?: Partial<UserPersona> | null
    ): Promise<LearningSnippet>;

    generateEnrichedReport?(
        state: AssessmentSnapshot,
        responses: ResponseRow[],
        calibration: CalibrationResult[],
        profile: CognitiveBehavioralProfile,
        userPersona?: Partial<UserPersona> | null
    ): Promise<Omit<EnrichedSessionReport, keyof SessionPersona> & { title?: string }>;
}

export interface ActionItem {
    priority: 'critical' | 'reinforce' | 'stretch'
    title: string
    rationale: string
    suggestion: string
    timeEstimate: string
    relatedGaps: string[]
}

export interface ActionPlan {
    items: ActionItem[]
    overallMessage: string
    nextSessionSuggestion: string
}

export interface EvaluateAnswerResult {
    isCorrect: boolean
    correctnessScore: number
    reasoning: string
    userPerspective: string
    feedback: string
    learningInsights: string[]
    errorType?: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct'
    deductions: Deduction[]
    personaUpdates?: Partial<UserPersona>
}

export type LLMProviderType = 'gemini' | 'groq';
