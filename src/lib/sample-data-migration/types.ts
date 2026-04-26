/**
 * Core types for Supabase Sample Data Migration feature
 * Defines all data structures for configuration, generation, and migration
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface SampleDataConfig {
  version: string;
  generation: {
    numUsers: number;
    sessionsPerUser: number;
    responsesPerSession: number;
    knowledgeGapsPerUser: number;
    feedbackPerUser: number;
    llmLogsPerSession: number;
  };
  userDefaults?: {
    displayNamePattern?: string;
    emailDomain?: string;
    metadata?: Record<string, unknown>;
  };
  seedFilePath: string;
}

export interface ParseResult {
  success: boolean;
  config?: SampleDataConfig;
  errors?: string[];
}

// ============================================================================
// User Profile Types
// ============================================================================

export interface UserProfile {
  id: string; // UUID
  email: string;
  displayName: string;
  metadata: {
    userType: 'beginner' | 'intermediate' | 'advanced';
    learningStyle?: string;
    preferredLanguage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Assessment Session Types
// ============================================================================

export interface AssessmentSession {
  id: string; // UUID
  userId: string; // FK to user_profiles
  topic: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  totalQuestions: number;
  correctCount: number;
  currentDifficulty: number; // 1-10
  startedAt: Date;
  completedAt?: Date; // Only for completed sessions
  statistics: {
    averageResponseTime: number;
    accuracyRate: number;
  };
}

// ============================================================================
// Response Types
// ============================================================================

export interface Response {
  id: string; // UUID
  assessmentId: string; // FK to assessments
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  difficulty: number; // 1-10
  deductionData?: {
    analysis: string;
    reasoning: string;
    suggestedConcepts: string[];
  };
  createdAt: Date;
}

// ============================================================================
// Knowledge Gap Types
// ============================================================================

export interface KnowledgeGap {
  id: string; // UUID
  userId: string; // FK to user_profiles
  concept: string;
  severity: number; // 1-10 scale
  remediationSuggestions?: {
    resources: string[];
    estimatedTime: number;
    difficulty: number;
  };
  identifiedAt: Date;
}

// ============================================================================
// User Persona Types
// ============================================================================

export interface UserPersona {
  id: string; // UUID
  userId: string; // FK to user_profiles
  cognitiveMetrics: {
    depth: number; // 0-100
    breadth: number; // 0-100
    creativity: number; // 0-100
    persistence: number; // 0-100
    curiosity: number; // 0-100
  };
  learningStyle: {
    preferredModality: 'visual' | 'textual' | 'interactive' | 'mixed';
    processingStyle: 'serialist' | 'holist' | 'mixed';
  };
  explanationPreference: string[];
  strongConcepts: string[];
  weakConcepts: string[];
  prerequisiteGaps: string[];
  engagementPattern: 'accelerating' | 'decelerating' | 'consistent' | 'erratic' | 'neutral';
  statistics: {
    averageResponseTime: number; // milliseconds
    consistencyScore: number; // 0-100
    totalSessions: number;
    overallMastery: number; // 0-100
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Cognitive Graph Types
// ============================================================================

export interface CognitiveGraphNode {
  id: string;
  label: string;
  mastery: number;
  doc?: string;
  owner?: string;
}

export interface CognitiveGraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface CognitiveGraphData {
  nodes: CognitiveGraphNode[];
  edges: CognitiveGraphEdge[];
}

export interface CognitiveGraph {
  id: string; // UUID
  userId: string; // FK to user_profiles
  graphData: CognitiveGraphData;
  nodeCount: number;
  edgeCount: number;
  sessionCount: number;
  lastSessionId?: string; // FK to assessments
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// LLM Call Log Types
// ============================================================================

export interface LLMCallLog {
  id: string; // UUID
  assessmentId: string; // FK to assessments
  promptType: 'question_generation' | 'answer_evaluation' | 'persona_synthesis' | 'feedback_generation';
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  createdAt: Date;
}

// ============================================================================
// Assessment Feedback Types
// ============================================================================

export interface AssessmentFeedback {
  id: string; // UUID
  userId: string; // FK to user_profiles
  sessionId: string; // FK to assessments
  feedbackType: 'incorrect_answer' | 'unclear_question' | 'wrong_difficulty' | 'too_easy' | 'too_hard' | 'other';
  feedbackText?: string;
  resolved: boolean;
  resolvedAt?: Date; // Only for resolved feedback
  createdAt: Date;
}

// ============================================================================
// Generated Data Container
// ============================================================================

export interface GeneratedData {
  users: UserProfile[];
  assessmentSessions: AssessmentSession[];
  responses: Response[];
  knowledgeGaps: KnowledgeGap[];
  userPersonas: UserPersona[];
  cognitiveGraphs: CognitiveGraph[];
  llmCallLogs: LLMCallLog[];
  assessmentFeedback: AssessmentFeedback[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  type: string;
  message: string;
  affectedRecords?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
