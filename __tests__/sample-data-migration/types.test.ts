/**
 * Tests for core types
 * Verifies that all types are properly defined and exported
 */

import { describe, it, expect } from 'vitest';
import type {
  SampleDataConfig,
  ParseResult,
  UserProfile,
  AssessmentSession,
  Response,
  KnowledgeGap,
  UserPersona,
  CognitiveGraph,
  LLMCallLog,
  AssessmentFeedback,
  GeneratedData,
  ValidationResult,
} from '@/lib/sample-data-migration/types';

describe('Core Types', () => {
  it('should have SampleDataConfig type defined', () => {
    const config: SampleDataConfig = {
      version: '1.0',
      generation: {
        numUsers: 5,
        sessionsPerUser: 3,
        responsesPerSession: 10,
        knowledgeGapsPerUser: 2,
        feedbackPerUser: 2,
        llmLogsPerSession: 5,
      },
      seedFilePath: 'supabase/seed.sql',
    };
    expect(config.version).toBe('1.0');
    expect(config.generation.numUsers).toBe(5);
  });

  it('should have ParseResult type defined', () => {
    const result: ParseResult = {
      success: true,
      config: {
        version: '1.0',
        generation: {
          numUsers: 5,
          sessionsPerUser: 3,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      },
    };
    expect(result.success).toBe(true);
  });

  it('should have UserProfile type defined', () => {
    const user: UserProfile = {
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Test User',
      metadata: {
        userType: 'beginner',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(user.email).toBe('user@example.com');
    expect(user.metadata.userType).toBe('beginner');
  });

  it('should have AssessmentSession type defined', () => {
    const session: AssessmentSession = {
      id: 'session-1',
      userId: 'user-1',
      topic: 'Algebra',
      status: 'completed',
      totalQuestions: 10,
      correctCount: 8,
      currentDifficulty: 5,
      startedAt: new Date(),
      completedAt: new Date(),
      statistics: {
        averageResponseTime: 2500,
        accuracyRate: 0.8,
      },
    };
    expect(session.status).toBe('completed');
    expect(session.correctCount).toBe(8);
  });

  it('should have Response type defined', () => {
    const response: Response = {
      id: 'response-1',
      assessmentId: 'session-1',
      questionId: 'q-1',
      userAnswer: 'answer',
      isCorrect: true,
      difficulty: 5,
      createdAt: new Date(),
    };
    expect(response.isCorrect).toBe(true);
    expect(response.difficulty).toBe(5);
  });

  it('should have KnowledgeGap type defined', () => {
    const gap: KnowledgeGap = {
      id: 'gap-1',
      userId: 'user-1',
      concept: 'Quadratic Equations',
      severity: 7,
      identifiedAt: new Date(),
    };
    expect(gap.concept).toBe('Quadratic Equations');
    expect(gap.severity).toBe(7);
  });

  it('should have UserPersona type defined', () => {
    const persona: UserPersona = {
      id: 'persona-1',
      userId: 'user-1',
      cognitiveMetrics: {
        depth: 75,
        breadth: 60,
        creativity: 80,
        persistence: 70,
        curiosity: 85,
      },
      learningStyle: {
        preferredModality: 'visual',
        processingStyle: 'holist',
      },
      explanationPreference: ['visual', 'interactive'],
      strongConcepts: ['Algebra', 'Geometry'],
      weakConcepts: ['Calculus'],
      prerequisiteGaps: ['Trigonometry'],
      engagementPattern: 'accelerating',
      statistics: {
        averageResponseTime: 2500,
        consistencyScore: 85,
        totalSessions: 10,
        overallMastery: 75,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(persona.cognitiveMetrics.depth).toBe(75);
    expect(persona.learningStyle.preferredModality).toBe('visual');
  });

  it('should have CognitiveGraph type defined', () => {
    const graph: CognitiveGraph = {
      id: 'graph-1',
      userId: 'user-1',
      graphData: {
        nodes: [
          { id: 'n1', label: 'Algebra', mastery: 80 },
          { id: 'n2', label: 'Geometry', mastery: 70 },
        ],
        edges: [
          { source: 'n1', target: 'n2', type: 'prerequisite' },
        ],
      },
      nodeCount: 2,
      edgeCount: 1,
      sessionCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(graph.nodeCount).toBe(2);
    expect(graph.edgeCount).toBe(1);
  });

  it('should have LLMCallLog type defined', () => {
    const log: LLMCallLog = {
      id: 'log-1',
      assessmentId: 'session-1',
      promptType: 'question_generation',
      model: 'gemini-2.0-flash',
      inputTokens: 500,
      outputTokens: 200,
      totalTokens: 700,
      durationMs: 1500,
      createdAt: new Date(),
    };
    expect(log.model).toBe('gemini-2.0-flash');
    expect(log.totalTokens).toBe(700);
  });

  it('should have AssessmentFeedback type defined', () => {
    const feedback: AssessmentFeedback = {
      id: 'feedback-1',
      userId: 'user-1',
      sessionId: 'session-1',
      feedbackType: 'too_hard',
      feedbackText: 'This was too difficult',
      resolved: true,
      resolvedAt: new Date(),
      createdAt: new Date(),
    };
    expect(feedback.feedbackType).toBe('too_hard');
    expect(feedback.resolved).toBe(true);
  });

  it('should have GeneratedData type defined', () => {
    const data: GeneratedData = {
      users: [],
      assessmentSessions: [],
      responses: [],
      knowledgeGaps: [],
      userPersonas: [],
      cognitiveGraphs: [],
      llmCallLogs: [],
      assessmentFeedback: [],
    };
    expect(data.users).toHaveLength(0);
    expect(data.assessmentSessions).toHaveLength(0);
  });

  it('should have ValidationResult type defined', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    expect(result.valid).toBe(true);
  });
});
