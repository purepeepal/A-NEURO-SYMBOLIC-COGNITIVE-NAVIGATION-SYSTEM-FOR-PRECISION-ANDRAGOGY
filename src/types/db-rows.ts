/**
 * Convenience type aliases for Supabase database rows.
 * These bridge the gap between the generated Database type and application code.
 */
import { Database } from './database'

// ΓöÇΓöÇΓöÇ Core Table Rows ΓöÇΓöÇΓöÇ
export type AssessmentRow = Database['public']['Tables']['assessments']['Row']
export type ResponseRow = Database['public']['Tables']['responses']['Row']
export type KnowledgeGapRow = Database['public']['Tables']['knowledge_gaps']['Row']

// ΓöÇΓöÇΓöÇ User Persona (manual ΓÇö not in Supabase generated types) ΓöÇΓöÇΓöÇ
export interface UserPersonaRow {
    user_id: string
    depth: number
    breadth: number
    creativity: number
    persistence: number
    curiosity: number
    preferred_modality: 'visual' | 'textual' | 'interactive' | 'mixed'
    processing_style: 'serialist' | 'holist' | 'mixed'
    explanation_preference: string[]
    strong_concepts: string[]
    weak_concepts: string[]
    prerequisite_gaps: string[]
    average_response_time: number
    consistency_score: number
    engagement_pattern: 'accelerating' | 'decelerating' | 'consistent' | 'erratic' | 'neutral'
    total_sessions: number
    overall_mastery: number
    last_session_at: string | null
    created_at: string
    updated_at: string
}

// ΓöÇΓöÇΓöÇ LLM-facing history entry (subset of ResponseRow used in assessment state) ΓöÇΓöÇΓöÇ
export interface HistoryEntry {
    questionId: string
    concept: string
    isCorrect: boolean
    objective?: string
    deduction?: DeductionData
    difficulty: number
    questionText?: string
}

// ΓöÇΓöÇΓöÇ Deduction data attached to responses ΓöÇΓöÇΓöÇ
export interface DeductionData {
    analysis?: string
    deductions?: string[]
    perspective?: string
    [key: string]: unknown
}

// ΓöÇΓöÇΓöÇ Evaluation result from LLM ΓöÇΓöÇΓöÇ
export interface EvaluationResult {
    isCorrect: boolean
    errorType?: string
    feedback?: string
    reasoning?: string
    deductions?: unknown[]
    userPerspective?: string
}

// ΓöÇΓöÇΓöÇ Generated question content from LLM ΓöÇΓöÇΓöÇ
export interface GeneratedQuestionContent {
    concept: string
    difficulty: number
    questionText: string
    questionType: string
    options?: Record<string, string> | null
    correctAnswer: string
    explanation?: string
    objective?: string
    competencyLevel?: string
    deductionSpace?: Record<string, unknown> | DeductionSpace
}

// ΓöÇΓöÇΓöÇ DeductionSpace reference (from LLM types) ΓöÇΓöÇΓöÇ
interface DeductionSpace {
    expectedErrors: Array<{
        pattern: string
        implies: string
        errorType: string
    }>
    unexpectedPatterns: Array<{
        description: string
        action: string
    }>
    futuresFeedback: {
        contentStyle: string
        cognitiveLoad: string
        engagementHint: string
    }
}

// ΓöÇΓöÇΓöÇ Assessment stats update payload ΓöÇΓöÇΓöÇ
export interface AssessmentStatsUpdate {
    total_questions?: number
    correct_count?: number
    current_difficulty?: number
    consecutive_correct?: number
    consecutive_incorrect?: number
    status?: 'in_progress' | 'completed' | 'abandoned'
    completed_at?: string | null
}

// ΓöÇΓöÇΓöÇ Session persona (synthesized during assessment) ΓöÇΓöÇΓöÇ
export interface SessionPersona {
    accuracy: number
    averageDifficulty: number
    difficultyProgression: number[]
    errorBreakdown: Record<string, number>
    conceptsStruggled: string[]
    conceptsMastered: string[]
    synthesizedDeductions: unknown[]
    descriptiveAnalysis: string
    immediateActions: string[]
    nextSessionFocus: string[]
    longTermPath: string[]
}
