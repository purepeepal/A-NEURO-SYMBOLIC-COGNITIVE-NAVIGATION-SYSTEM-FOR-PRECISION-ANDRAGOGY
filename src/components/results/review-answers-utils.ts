/**
 * ReviewAnswers shared types, config maps, and helpers
 */

export interface ResponseItem {
    id: string
    question_number: number
    concept: string
    difficulty: number
    question_text: string
    question_type: 'mcq' | 'short_answer' | 'true_false'
    options: Record<string, string> | null
    correct_answer: string
    user_answer: string | null
    is_correct: boolean | null
    time_taken_seconds: number | null
    error_type: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct' | null
    error_explanation: string | null
    confidence_level: number | null
    objective: string | null
}

export const ERROR_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    correct: { label: 'Correct', color: 'text-green-700', bg: 'bg-green-100 border-green-300' },
    careless: { label: 'Careless Error', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' },
    conceptual: { label: 'Conceptual Gap', color: 'text-red-700', bg: 'bg-red-100 border-red-300' },
    procedural: { label: 'Procedural Error', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300' },
    prerequisite_gap: { label: 'Prerequisite Gap', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' },
}

export const DIFFICULTY_LABELS: Record<number, string> = {
    1: 'Foundational',
    2: 'Developing',
    3: 'Proficient',
    4: 'Advanced',
    5: 'Expert',
}

export function formatTime(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return 'ΓÇö'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
}
