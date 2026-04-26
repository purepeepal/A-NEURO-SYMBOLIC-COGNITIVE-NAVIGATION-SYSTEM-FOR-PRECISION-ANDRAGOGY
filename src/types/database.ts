export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            user_profiles: {
                Row: {
                    id: string
                    display_name: string | null
                    email: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    display_name?: string | null
                    email?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    display_name?: string | null
                    email?: string | null
                    updated_at?: string
                }
            }
            assessments: {
                Row: {
                    id: string
                    user_id: string
                    topic: string
                    status: 'in_progress' | 'completed' | 'abandoned'
                    started_at: string
                    completed_at: string | null
                    total_questions: number
                    correct_count: number
                    current_difficulty: number
                    consecutive_correct: number
                    consecutive_incorrect: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    topic: string
                    status?: 'in_progress' | 'completed' | 'abandoned'
                    started_at?: string
                    completed_at?: string | null
                    total_questions?: number
                    correct_count?: number
                    current_difficulty?: number
                    consecutive_correct?: number
                    consecutive_incorrect?: number
                }
                Update: {
                    status?: 'in_progress' | 'completed' | 'abandoned'
                    completed_at?: string | null
                    total_questions?: number
                    correct_count?: number
                    current_difficulty?: number
                    consecutive_correct?: number
                    consecutive_incorrect?: number
                }
            }
            responses: {
                Row: {
                    id: string
                    assessment_id: string
                    question_number: number
                    concept: string
                    difficulty: number
                    question_text: string
                    question_type: 'mcq' | 'short_answer' | 'true_false'
                    options: Json | null
                    correct_answer: string
                    user_answer: string | null
                    is_correct: boolean | null
                    time_taken_seconds: number | null
                    error_type: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct' | null
                    error_explanation: string | null
                    objective: string | null
                    competency_level: string | null
                    deduction_space: Json | null
                    deduction: Json | null
                    confidence_level: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    assessment_id: string
                    question_number: number
                    concept: string
                    difficulty: number
                    question_text: string
                    question_type: 'mcq' | 'short_answer' | 'true_false'
                    options?: Json | null
                    correct_answer: string
                    user_answer?: string | null
                    is_correct?: boolean | null
                    time_taken_seconds?: number | null
                    error_type?: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct' | null
                    error_explanation?: string | null
                    created_at?: string
                }
                Update: {
                    user_answer?: string | null
                    is_correct?: boolean | null
                    time_taken_seconds?: number | null
                    error_type?: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct' | null
                    error_explanation?: string | null
                    // New columns from 20240207000000_modular_assessment.sql
                    objective?: string | null
                    competency_level?: string | null
                    deduction_space?: Json | null
                    deduction?: Json | null
                }
            }
            knowledge_gaps: {
                Row: {
                    id: string
                    user_id: string
                    assessment_id: string | null
                    concept: string
                    mastery_score: number | null
                    gap_severity: 'critical' | 'moderate' | 'minor' | null
                    related_prerequisites: string[] | null
                    error_patterns: Json | null
                    identified_at: string
                    addressed: boolean
                    addressed_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    assessment_id?: string | null
                    concept: string
                    mastery_score?: number | null
                    gap_severity?: 'critical' | 'moderate' | 'minor' | null
                    related_prerequisites?: string[] | null
                    error_patterns?: Json | null
                    identified_at?: string
                    addressed?: boolean
                    addressed_at?: string | null
                }
                Update: {
                    mastery_score?: number | null
                    gap_severity?: 'critical' | 'moderate' | 'minor' | null
                    addressed?: boolean
                    addressed_at?: string | null
                }
            }
            prerequisite_cache: {
                Row: {
                    id: string
                    topic: string
                    prerequisite_tree: Json
                    concepts_list: string[]
                    generated_at: string
                    expires_at: string
                }
                Insert: {
                    id?: string
                    topic: string
                    prerequisite_tree: Json
                    concepts_list: string[]
                    generated_at?: string
                    expires_at?: string
                }
                Update: {
                    prerequisite_tree?: Json
                    concepts_list?: string[]
                    expires_at?: string
                }
            }
            perspective_suggestions: {
                Row: {
                    id: string
                    user_id: string
                    assessment_id: string
                    current_domain: string
                    suggested_domain: string
                    rationale: string
                    bridge_concept: string
                    status: string
                    explored_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    assessment_id: string
                    current_domain: string
                    suggested_domain: string
                    rationale: string
                    bridge_concept: string
                    status?: string
                    explored_at?: string | null
                    created_at?: string
                }
                Update: {
                    status?: string
                    explored_at?: string | null
                }
            }
            learning_snippets: {
                Row: {
                    id: string
                    assessment_id: string
                    question_id: string
                    snippet_type: string
                    title: string
                    content: string
                    related_concept: string
                    meta_learning_practice: string
                    source_evidence: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    assessment_id: string
                    question_id: string
                    snippet_type: string
                    title: string
                    content: string
                    related_concept: string
                    meta_learning_practice: string
                    source_evidence?: string | null
                    created_at?: string
                }
                Update: {
                    snippet_type?: string
                    title?: string
                    content?: string
                    related_concept?: string
                    meta_learning_practice?: string
                    source_evidence?: string | null
                }
            }
        }
    }
}
