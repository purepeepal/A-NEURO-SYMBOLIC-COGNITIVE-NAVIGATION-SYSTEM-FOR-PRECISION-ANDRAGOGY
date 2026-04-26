/**
 * Investigative analysis types ΓÇö cognitive profiling and detective-mode types
 */

import type { Deduction } from './assessment'

// ============================================================================
// INVESTIGATIVE ANALYSIS TYPES
// ============================================================================

export type InvestigativeFocus =
    | 'cognitive_depth'
    | 'knowledge_boundaries'
    | 'error_archaeology'
    | 'pattern_detection'
    | 'stress_response'
    | 'learning_velocity'
    | 'metacognition'
    | 'transfer_potential'

export interface InvestigativeObjective {
    focus: InvestigativeFocus
    hypothesis: string
    probingStrategy: string
    successIndicators: string[]
    failureIndicators: string[]
    questionGuidance: {
        preferredType: 'mcq' | 'short_answer' | 'true_false'
        difficultyRange: [number, number]
        distractorStrategy?: string
    }
    reasoning: string
}

export interface DetectedPattern {
    patternType: 'temporal' | 'difficulty_response' | 'error_cluster' | 'recovery' | 'confidence' | 'concept_connection' | 'hidden_strength' | 'blind_spot'
    description: string
    evidence: string[]
    significance: 'high' | 'medium' | 'low'
    implication: string
}

export interface BehavioralPatternAnalysis {
    detectedPatterns: DetectedPattern[]
    emergingHypotheses: string[]
    unexplainedObservations: string[]
    confidenceMetrics: {
        dataQuality: number
        patternStrength: number
        analysisDepth: 'surface' | 'moderate' | 'deep'
    }
}

export interface DetectedAnomaly {
    type: 'performance_shift' | 'counter_pattern' | 'timing_outlier' | 'conceptual_leap' | 'error_inversion' | 'behavioral_signal'
    description: string
    location: string
    deviation: string
    possibleExplanations: string[]
    investigationPriority: 'high' | 'medium' | 'low'
    suggestedProbe: string
}

export interface AnomalyAnalysis {
    anomalies: DetectedAnomaly[]
    overallAnomalyScore: number
    sessionStability: 'stable' | 'variable' | 'chaotic'
    concernFlags: string[]
}

export interface InvestigativeInsight {
    category: 'breakthrough' | 'anomaly' | 'pattern' | 'concern' | 'potential'
    title: string
    evidence: string[]
    confidence: number
    implication: string
    actionable: boolean
    recommendedAction?: string
}

export interface ErrorDNA {
    dominantType: string
    triggers: string[]
    recoveryPattern: string
    persistentMisconceptions: string[]
}

export interface CognitiveBehavioralProfile {
    thinkingStyle: 'linear' | 'lateral' | 'mixed' | 'undetermined'
    thinkingStyleEvidence: string
    reasoningApproach: 'inductive' | 'deductive' | 'abductive' | 'mixed'
    reasoningEvidence: string
    problemSolvingSignature: string
    errorFingerprint: ErrorDNA
    adaptationRate: 'fast' | 'moderate' | 'slow' | 'variable'
    adaptationEvidence: string
    difficultyThreshold: number
    comfortZone: [number, number]
    confidenceCalibration: 'overconfident' | 'underconfident' | 'calibrated' | 'unknown'
    confidenceEvidence: string
    responseVelocityPattern: 'consistent' | 'rushed_on_hard' | 'slow_on_easy' | 'variable'
    persistenceScore: number
    latentStrengths: string[]
    untappedAreas: string[]
    growthVectors: string[]
}

export interface KnowledgeTopology {
    strongholds: string[]
    frontiers: string[]
    gaps: string[]
    bridges: string[]
    isolatedIslands: string[]
}

export interface StrategicRecommendation {
    priority: 'critical' | 'high' | 'medium' | 'low'
    recommendation: string
    rationale: string
    expectedOutcome: string
}

export interface Predictions {
    nextSessionSuccess: number
    optimalDifficultyStart: number
    conceptsReadyToAdvance: string[]
    conceptsNeedingRemediation: string[]
    estimatedMasteryTime: string
}

export interface HypothesisResult {
    hypothesis: string
    verdict: 'confirmed' | 'refuted' | 'inconclusive'
    evidence: string
}

export interface InvestigativeReport {
    executiveSummary: string
    keyInsights: InvestigativeInsight[]
    unexpectedFindings: string[]
    hypothesesTested: HypothesisResult[]
    knowledgeTopology: KnowledgeTopology
    strategicRecommendations: StrategicRecommendation[]
    predictions: Predictions
    narrativeAnalysis: string
}

export interface MicroAnalysisResult {
    immediateDeductions: Deduction[]
    suggestedProbe: string
    confidenceShift: number
    anomalyDetected: boolean
    anomalyNote?: string
    snippetTrigger?: {
        type: 'misconception_correction' | 'perspective_shift' | 'reinforcement' | 'bridge_concept' | 'metacognitive_prompt'
        reason: string
        targetConcept: string
    }
    adaptiveGuidance: {
        difficultyAdjustment: number
        conceptPivot: string | null
        questionTypeRecommendation: 'mcq' | 'short_answer' | 'true_false'
        urgency: 'normal' | 'probe_deeper' | 'remediate' | 'accelerate'
    }
}

export interface ProbingQuestionRecommendation {
    concept: string
    difficulty: number
    questionType: 'mcq' | 'short_answer' | 'true_false'
    probingObjective: string
    expectedInformationGain: string
    distractorGuidance?: string
    interpretationKey: {
        ifCorrect: string
        ifIncorrect: string
        ifSpecificError: string
    }
    followUpStrategy: string
}
