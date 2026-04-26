/**
 * Report type definitions ΓÇö shared interfaces for assessment reports
 */

import type {
    InvestigativeReport,
    ActionPlan,
    EnrichedSessionReport,
} from '@/lib/llm/types'
import type { KnowledgeGapRow } from '@/types/db-rows'
import type { CalibrationResult, ConfidenceCalibrationSummary } from './self-assessment'
import type { ConfidenceIndicator } from './uncertainty'

export interface AssessmentReport {
    assessmentId: string
    topic: string
    completedAt: Date
    totalQuestions: number
    correctCount: number
    accuracy: number
    averageDifficulty: number
    timeTakenSeconds: number
    conceptPerformance: ConceptPerformance[]
    knowledgeGaps: Partial<KnowledgeGapRow>[]
    totalGaps: number
    criticalGaps: number
    moderateGaps: number
    minorGaps: number
    recommendations: string[]
    // NEW: Investigative Analysis
    investigativeReport?: InvestigativeReport
    calibrationData?: CalibrationResult[]
    calibrationInsight?: { headline: string, detail: string }
    confidenceCalibration?: ConfidenceCalibrationSummary
    actionPlan?: ActionPlan
    enrichedReport?: Omit<EnrichedSessionReport, 'sessionId' | 'topic' | 'questionsAnswered' | 'accuracy' | 'averageDifficulty' | 'difficultyProgression' | 'errorBreakdown' | 'conceptsStruggled' | 'conceptsMastered' | 'synthesizedDeductions' | 'descriptiveAnalysis' | 'immediateActions' | 'nextSessionFocus' | 'longTermPath'>
    knowledgeTree?: {
        nodes: KnowledgeTreeNode[],
        edges: KnowledgeTreeEdge[]
    }
}

export interface KnowledgeTreeNode {
    id: string
    position: { x: number; y: number }
    data: {
        label: string
        mastery: 'untested' | 'mastered' | 'partial' | 'gap'
        questionsAsked: number
        accuracy: number
        difficulty: number
        confidence?: ConfidenceIndicator
    }
    type: 'conceptNode'
}

export interface KnowledgeTreeEdge {
    id: string
    source: string
    target: string
    animated: boolean
    style: { stroke: string; strokeWidth: number }
}

export interface ConceptPerformance {
    concept: string
    questionsAsked: number
    correctCount: number
    averageDifficulty: number
    timeTakenSeconds: number
    confidence?: ConfidenceIndicator
    errorPatterns: { conceptual: number; procedural: number; careless: number; prerequisite_gap: number; correct: number }
    lastAttempt: Date
}
