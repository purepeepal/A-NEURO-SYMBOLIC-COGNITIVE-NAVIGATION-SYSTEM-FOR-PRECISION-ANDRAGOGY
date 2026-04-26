// src/lib/domain/assessment/repositories.ts
// Unit 3 (Domain Core) Repository Interfaces
// These define the contract that Unit 5 (Data & Persistence) must fulfill.
// CRITICAL: No `any` types — every interface method has explicit type contracts.

import { BiometricAnalysis } from './biometrics';

// ─── Domain Types ──────────────────────────────────────────────────

export interface SessionConfig {
    initialAbility: number;
    targetDifficulty: number;
}

export interface Session {
    id: string;
    user_id: string;
    objective_uid: string;    // topic or objective identifier
    topic: string;
    status: 'in_progress' | 'completed' | 'abandoned';
    config_snapshot: SessionConfig;
    current_question_id?: string;
    total_questions: number;
    correct_count: number;
    current_difficulty: number;
    consecutive_correct: number;
    consecutive_incorrect: number;
    started_at: string;
    completed_at?: string;
}

export interface Question {
    id: string;
    text: string;
    type: 'mcq' | 'open_ended' | 'coding' | 'short_answer' | 'true_false';
    options?: string[];
    difficulty: number;
    concept: string;
    correct_answer?: string;
    objective?: string;
    competency_level?: string;
    deduction_space?: Record<string, unknown>;
}

export interface EvaluationResult {
    isCorrect: boolean;
    score: number;           // 0.0 to 1.0
    feedback: string;
    detectedMisconception?: string;
    confidence: number;      // 1-10
    errorType?: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct';
}

export interface ResponseRecord {
    question_id: string;
    user_input: string;
    evaluation: EvaluationResult;
    biometrics?: BiometricAnalysis;
    error_type?: 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' | 'correct';
    time_taken_ms?: number;
}

export interface UserProfile {
    id: string;
    display_name?: string;
    email?: string;
    irt_theta?: number;      // Current IRT ability estimate
    created_at: string;
    updated_at: string;
}

export interface PersonaMetrics {
    depth: number;
    breadth: number;
    creativity: number;
    persistence: number;
    curiosity: number;
    preferred_modality?: 'visual' | 'verbal' | 'kinesthetic' | 'mixed';
    processing_style?: 'serialist' | 'holist';
    engagement_pattern?: 'deep_diver' | 'surface_scanner' | 'strategic' | 'neutral';
    overall_mastery: number;
    total_sessions: number;
}

export interface PersonaTraits {
    analytical: number;
    creative: number;
    practical: number;
    synthesizing: number;
    evaluative: number;
}

export interface PersonaSynthesis extends PersonaTraits {
    summary: string;
}

export interface ProgressSnapshot {
    learner_id: string;
    topic: string;
    concept: string;
    mastery_level: 'gap' | 'partial' | 'mastered';
    accuracy: number;
    blooms_depth?: string;
    calibration_delta?: number;
    session_id?: string;
}

export interface KnowledgeGap {
    id: string;
    user_id: string;
    assessment_id?: string;
    concept: string;
    mastery_score: number;
    gap_severity: 'critical' | 'moderate' | 'minor';
    related_prerequisites?: string[];
    error_patterns?: Record<string, number>;
    addressed: boolean;
}

export interface TopicSubtopics {
    id: string;
    topic: string;
    subtopics: string[];
}

export interface FeedbackRecord {
    session_id: string;
    user_id: string;
    question_id?: string;
    feedback_type: 'incorrect_answer' | 'unclear_question' | 'wrong_difficulty' | 'too_easy' | 'too_hard' | 'other';
    feedback_text?: string;
}

export interface TelemetryRecord {
    session_id: string;
    event_type: string;
    payload: Record<string, unknown>;
}

export interface LLMCallLog {
    session_id?: string;
    user_id?: string;
    provider: string;
    model: string;
    call_type: 'question_generation' | 'answer_evaluation' | 'persona_synthesis' | 'prerequisite_tree' | 'other';
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    latency_ms?: number;
    success: boolean;
    error_message?: string;
}

// ─── Repository Interfaces ─────────────────────────────────────────

export interface SessionRepository {
    createSession(userId: string, objectiveId: string, config: SessionConfig): Promise<Session>;
    getSession(sessionId: string): Promise<Session>;
    updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
    saveResponse(sessionId: string, response: ResponseRecord): Promise<void>;
    getResponseCount(sessionId: string): Promise<number>;
    getResponses(sessionId: string): Promise<ResponseRecord[]>;
}

export interface ProfileRepository {
    getProfile(userId: string): Promise<UserProfile | null>;
    updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void>;
    getPersona(userId: string): Promise<PersonaMetrics | null>;
    updatePersona(userId: string, updates: Partial<PersonaMetrics>): Promise<void>;
    saveSnapshot(snapshot: ProgressSnapshot): Promise<void>;
    awardBadge(userId: string, badgeData: { session_id: string; badge_type: string; topic: string; metadata?: Record<string, unknown> }): Promise<void>;
}

export interface KnowledgeRepository {
    getSubtopics(topic: string): Promise<TopicSubtopics | null>;
    saveSubtopics(topic: string, subtopics: string[]): Promise<void>;
    getPrerequisites(topicId: string): Promise<{ prerequisite_tree: Record<string, unknown>; concepts_list: string[] } | null>;
    logKnowledgeGap(userId: string, gapData: Omit<KnowledgeGap, 'id'>): Promise<void>;
    getKnowledgeGaps(userId: string, topic?: string): Promise<KnowledgeGap[]>;
}

export interface ContentRepository {
    getQuestion(questionId: string): Promise<Question>;
    saveQuestion(question: Question): Promise<void>;
    saveFeedback(feedback: FeedbackRecord): Promise<void>;
    findPoolQuestion(topic: string, concept: string, difficulty: number): Promise<Question | null>;
}

export interface TelemetryRepository {
    logBiometrics(telemetryRecord: TelemetryRecord): Promise<void>;
    saveAnalytics(sessionId: string, analytics: Record<string, unknown>): Promise<void>;
    logLLMCall(logRecord: LLMCallLog): Promise<void>;
}

export interface ExperimentsRepository {
    getAssignment(userId: string, experimentId: string): Promise<{ variant: string } | null>;
    assignUser(userId: string, experimentId: string, variant: string): Promise<void>;
}

export interface SelfAssessRepository {
    saveSelfAssessment(assessment: { assessment_id: string; user_id: string; subtopic: string; self_rating: number }): Promise<void>;
    getSelfAssessments(assessmentId: string): Promise<{ subtopic: string; self_rating: number }[]>;
}

// ─── LLM Service Interface ─────────────────────────────────────────

export interface LLMService {
    generateQuestion(context: { objective: string; difficulty: number; concept?: string; excludeConcepts?: string[] }): Promise<Question>;
    evaluateResponse(answer: string, questionText: string, correctAnswer?: string): Promise<EvaluationResult>;
    synthesizePersona(history: { responses: ResponseRecord[]; traits: PersonaTraits }): Promise<PersonaSynthesis>;
    performMicroAnalysis?: (
        questionSnapshot: any,
        stateSnapshot: any,
        personaPrior: any
    ) => Promise<any>;
}
