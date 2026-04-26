/**
 * Tests for Seed File Generator
 * Validates SQL generation with idempotency, escaping, and proper structure
 */

import { describe, it, expect } from 'vitest';
import { SeedFileGenerator } from '@/lib/sample-data-migration/seed-file-generator';
import { GeneratedData, UserProfile, AssessmentSession, Response, KnowledgeGap, UserPersona, CognitiveGraph, LLMCallLog, AssessmentFeedback } from '@/lib/sample-data-migration/types';

describe('Seed File Generator', () => {
  const generator = new SeedFileGenerator();

  // ============================================================================
  // Unit Tests - SQL Syntax Validation
  // ============================================================================

  describe('SQL Syntax Validation', () => {
    it('should generate valid SQL for user profiles', () => {
      const users: UserProfile[] = [
        {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          metadata: { userType: 'beginner' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateUserInserts(users);
      expect(sql).toContain('INSERT INTO user_profiles');
      expect(sql).toContain('VALUES');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('test@example.com');
    });

    it('should generate valid SQL for assessment sessions', () => {
      const sessions: AssessmentSession[] = [
        {
          id: 'session-1',
          userId: 'user-1',
          topic: 'Algebra',
          status: 'completed',
          totalQuestions: 10,
          correctCount: 8,
          currentDifficulty: 5,
          startedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-02'),
          statistics: { averageResponseTime: 2500, accuracyRate: 0.8 },
        },
      ];

      const sql = generator.generateSessionInserts(sessions);
      expect(sql).toContain('INSERT INTO assessments');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('Algebra');
    });

    it('should generate valid SQL for responses', () => {
      const responses: Response[] = [
        {
          id: 'response-1',
          assessmentId: 'session-1',
          questionId: 'q-1',
          userAnswer: 'answer',
          isCorrect: true,
          difficulty: 5,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateResponseInserts(responses);
      expect(sql).toContain('INSERT INTO responses');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('true');
    });

    it('should generate valid SQL for knowledge gaps', () => {
      const gaps: KnowledgeGap[] = [
        {
          id: 'gap-1',
          userId: 'user-1',
          concept: 'Quadratic Equations',
          severity: 7,
          identifiedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateKnowledgeGapInserts(gaps);
      expect(sql).toContain('INSERT INTO knowledge_gaps');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('Quadratic Equations');
    });

    it('should generate valid SQL for user personas', () => {
      const personas: UserPersona[] = [
        {
          id: 'persona-1',
          userId: 'user-1',
          cognitiveMetrics: { depth: 75, breadth: 80, creativity: 70, persistence: 85, curiosity: 90 },
          learningStyle: { preferredModality: 'visual', processingStyle: 'holist' },
          explanationPreference: ['detailed', 'examples'],
          strongConcepts: ['algebra'],
          weakConcepts: ['geometry'],
          prerequisiteGaps: ['trigonometry'],
          engagementPattern: 'accelerating',
          statistics: { averageResponseTime: 2500, consistencyScore: 85, totalSessions: 5, overallMastery: 75 },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generatePersonaInserts(personas);
      expect(sql).toContain('INSERT INTO user_personas');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('accelerating');
    });

    it('should generate valid SQL for cognitive graphs', () => {
      const graphs: CognitiveGraph[] = [
        {
          id: 'graph-1',
          userId: 'user-1',
          graphData: {
            nodes: [{ id: 'n1', label: 'Algebra', mastery: 75 }],
            edges: [{ source: 'n1', target: 'n2', type: 'prerequisite' }],
          },
          nodeCount: 1,
          edgeCount: 1,
          sessionCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateCognitiveGraphInserts(graphs);
      expect(sql).toContain('INSERT INTO cognitive_graphs');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('nodes');
      expect(sql).toContain('edges');
    });

    it('should generate valid SQL for LLM call logs', () => {
      const logs: LLMCallLog[] = [
        {
          id: 'log-1',
          assessmentId: 'session-1',
          promptType: 'question_generation',
          model: 'gemini-2.0-flash',
          inputTokens: 500,
          outputTokens: 200,
          totalTokens: 700,
          durationMs: 1500,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateLLMLogInserts(logs);
      expect(sql).toContain('INSERT INTO llm_call_logs');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('gemini-2.0-flash');
    });

    it('should generate valid SQL for assessment feedback', () => {
      const feedback: AssessmentFeedback[] = [
        {
          id: 'fb-1',
          userId: 'user-1',
          sessionId: 'session-1',
          feedbackType: 'too_hard',
          feedbackText: 'This was difficult',
          resolved: true,
          resolvedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateFeedbackInserts(feedback);
      expect(sql).toContain('INSERT INTO assessment_feedback');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(sql).toContain('too_hard');
    });
  });

  // ============================================================================
  // Unit Tests - Escaping and Special Characters
  // ============================================================================

  describe('Escaping and Special Characters', () => {
    it('should properly escape single quotes in strings', () => {
      const users: UserProfile[] = [
        {
          id: 'user-1',
          email: "test'quote@example.com",
          displayName: "O'Brien",
          metadata: { userType: 'beginner' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateUserInserts(users);
      expect(sql).toContain("''");
      // Verify that single quotes are escaped (doubled)
      expect(sql).toContain("test''quote");
      expect(sql).toContain("O''Brien");
    });

    it('should properly escape JSON data', () => {
      const responses: Response[] = [
        {
          id: 'response-1',
          assessmentId: 'session-1',
          questionId: 'q-1',
          userAnswer: 'answer',
          isCorrect: true,
          difficulty: 5,
          deductionData: {
            analysis: "It's wrong",
            reasoning: 'Because of "quotes"',
            suggestedConcepts: [],
          },
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateResponseInserts(responses);
      expect(sql).toContain('::jsonb');
      expect(sql).toContain("''");
    });

    it('should handle newlines in feedback text', () => {
      const feedback: AssessmentFeedback[] = [
        {
          id: 'fb-1',
          userId: 'user-1',
          sessionId: 'session-1',
          feedbackType: 'other',
          feedbackText: 'Line 1\nLine 2',
          resolved: false,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateFeedbackInserts(feedback);
      expect(sql).toContain('Line 1');
      expect(sql).toContain('Line 2');
    });
  });

  // ============================================================================
  // Unit Tests - Insertion Order
  // ============================================================================

  describe('Insertion Order', () => {
    it('should maintain correct insertion order in complete seed file', () => {
      const data: GeneratedData = {
        users: [
          {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Test User',
            metadata: { userType: 'beginner' },
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
        assessmentSessions: [
          {
            id: 'session-1',
            userId: 'user-1',
            topic: 'Algebra',
            status: 'completed',
            totalQuestions: 10,
            correctCount: 8,
            currentDifficulty: 5,
            startedAt: new Date('2024-01-01'),
            completedAt: new Date('2024-01-02'),
            statistics: { averageResponseTime: 2500, accuracyRate: 0.8 },
          },
        ],
        responses: [
          {
            id: 'response-1',
            assessmentId: 'session-1',
            questionId: 'q-1',
            userAnswer: 'answer',
            isCorrect: true,
            difficulty: 5,
            createdAt: new Date('2024-01-01'),
          },
        ],
        knowledgeGaps: [
          {
            id: 'gap-1',
            userId: 'user-1',
            concept: 'Quadratic Equations',
            severity: 7,
            identifiedAt: new Date('2024-01-01'),
          },
        ],
        userPersonas: [
          {
            id: 'persona-1',
            userId: 'user-1',
            cognitiveMetrics: { depth: 75, breadth: 80, creativity: 70, persistence: 85, curiosity: 90 },
            learningStyle: { preferredModality: 'visual', processingStyle: 'holist' },
            explanationPreference: ['detailed'],
            strongConcepts: ['algebra'],
            weakConcepts: ['geometry'],
            prerequisiteGaps: ['trigonometry'],
            engagementPattern: 'accelerating',
            statistics: { averageResponseTime: 2500, consistencyScore: 85, totalSessions: 5, overallMastery: 75 },
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
        cognitiveGraphs: [
          {
            id: 'graph-1',
            userId: 'user-1',
            graphData: {
              nodes: [{ id: 'n1', label: 'Algebra', mastery: 75 }],
              edges: [{ source: 'n1', target: 'n2', type: 'prerequisite' }],
            },
            nodeCount: 1,
            edgeCount: 1,
            sessionCount: 1,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
        llmCallLogs: [
          {
            id: 'log-1',
            assessmentId: 'session-1',
            promptType: 'question_generation',
            model: 'gemini-2.0-flash',
            inputTokens: 500,
            outputTokens: 200,
            totalTokens: 700,
            durationMs: 1500,
            createdAt: new Date('2024-01-01'),
          },
        ],
        assessmentFeedback: [
          {
            id: 'fb-1',
            userId: 'user-1',
            sessionId: 'session-1',
            feedbackType: 'too_hard',
            feedbackText: 'This was difficult',
            resolved: true,
            resolvedAt: new Date('2024-01-02'),
            createdAt: new Date('2024-01-01'),
          },
        ],
      };

      const sql = generator.generate(data);

      // Check order: user_profiles before assessments
      const userProfilesIndex = sql.indexOf('INSERT INTO user_profiles');
      const assessmentsIndex = sql.indexOf('INSERT INTO assessments');
      expect(userProfilesIndex).toBeLessThan(assessmentsIndex);

      // Check order: assessments before responses
      const responsesIndex = sql.indexOf('INSERT INTO responses');
      expect(assessmentsIndex).toBeLessThan(responsesIndex);

      // Check order: responses before knowledge_gaps
      const knowledgeGapsIndex = sql.indexOf('INSERT INTO knowledge_gaps');
      expect(responsesIndex).toBeLessThan(knowledgeGapsIndex);

      // Check order: knowledge_gaps before user_personas
      const personasIndex = sql.indexOf('INSERT INTO user_personas');
      expect(knowledgeGapsIndex).toBeLessThan(personasIndex);

      // Check order: user_personas before cognitive_graphs
      const graphsIndex = sql.indexOf('INSERT INTO cognitive_graphs');
      expect(personasIndex).toBeLessThan(graphsIndex);

      // Check order: cognitive_graphs before llm_call_logs
      const logsIndex = sql.indexOf('INSERT INTO llm_call_logs');
      expect(graphsIndex).toBeLessThan(logsIndex);

      // Check order: llm_call_logs before assessment_feedback
      const feedbackIndex = sql.indexOf('INSERT INTO assessment_feedback');
      expect(logsIndex).toBeLessThan(feedbackIndex);
    });
  });

  // ============================================================================
  // Unit Tests - Comments and Documentation
  // ============================================================================

  describe('Comments and Documentation', () => {
    it('should include header comments', () => {
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

      const sql = generator.generate(data);
      expect(sql).toContain('Supabase Sample Data Migration');
      expect(sql).toContain('idempotent INSERT statements');
      expect(sql).toContain('INSERT ... ON CONFLICT DO NOTHING');
    });

    it('should include section comments for each entity type', () => {
      const data: GeneratedData = {
        users: [
          {
            id: 'user-1',
            email: 'test@example.com',
            displayName: 'Test User',
            metadata: { userType: 'beginner' },
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
        assessmentSessions: [
          {
            id: 'session-1',
            userId: 'user-1',
            topic: 'Algebra',
            status: 'completed',
            totalQuestions: 10,
            correctCount: 8,
            currentDifficulty: 5,
            startedAt: new Date('2024-01-01'),
            completedAt: new Date('2024-01-02'),
            statistics: { averageResponseTime: 2500, accuracyRate: 0.8 },
          },
        ],
        responses: [],
        knowledgeGaps: [],
        userPersonas: [],
        cognitiveGraphs: [],
        llmCallLogs: [],
        assessmentFeedback: [],
      };

      const sql = generator.generate(data);
      expect(sql).toContain('Section 1: User Profiles');
      expect(sql).toContain('Section 2: Assessment Sessions');
      expect(sql).toContain('Creates sample users');
      expect(sql).toContain('linked to sample users');
    });

    it('should include footer comments', () => {
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

      const sql = generator.generate(data);
      expect(sql).toContain('Seed file generation complete');
      expect(sql).toContain('populated with realistic sample data');
    });
  });

  // ============================================================================
  // Unit Tests - ON CONFLICT DO NOTHING
  // ============================================================================

  describe('ON CONFLICT DO NOTHING Idempotency', () => {
    it('should include ON CONFLICT DO NOTHING for all INSERT statements', () => {
      const users: UserProfile[] = [
        {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
          metadata: { userType: 'beginner' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateUserInserts(users);
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
    });

    it('should handle NULL values for optional fields', () => {
      const sessions: AssessmentSession[] = [
        {
          id: 'session-1',
          userId: 'user-1',
          topic: 'Algebra',
          status: 'in_progress',
          totalQuestions: 10,
          correctCount: 5,
          currentDifficulty: 5,
          startedAt: new Date('2024-01-01'),
          statistics: { averageResponseTime: 2500, accuracyRate: 0.5 },
        },
      ];

      const sql = generator.generateSessionInserts(sessions);
      expect(sql).toContain('NULL');
      expect(sql).not.toContain('undefined');
    });

    it('should handle NULL for optional deduction_data', () => {
      const responses: Response[] = [
        {
          id: 'response-1',
          assessmentId: 'session-1',
          questionId: 'q-1',
          userAnswer: 'answer',
          isCorrect: true,
          difficulty: 5,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateResponseInserts(responses);
      expect(sql).toContain('NULL');
    });
  });

  // ============================================================================
  // Unit Tests - Empty Data Handling
  // ============================================================================

  describe('Empty Data Handling', () => {
    it('should return empty string for empty user list', () => {
      const sql = generator.generateUserInserts([]);
      expect(sql).toBe('');
    });

    it('should return empty string for empty session list', () => {
      const sql = generator.generateSessionInserts([]);
      expect(sql).toBe('');
    });

    it('should return empty string for empty response list', () => {
      const sql = generator.generateResponseInserts([]);
      expect(sql).toBe('');
    });

    it('should generate header and footer even with empty data', () => {
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

      const sql = generator.generate(data);
      expect(sql).toContain('Supabase Sample Data Migration');
      expect(sql).toContain('Seed file generation complete');
    });
  });

  // ============================================================================
  // Unit Tests - Multiple Records
  // ============================================================================

  describe('Multiple Records', () => {
    it('should properly format multiple user records with commas', () => {
      const users: UserProfile[] = [
        {
          id: 'user-1',
          email: 'test1@example.com',
          displayName: 'Test User 1',
          metadata: { userType: 'beginner' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'user-2',
          email: 'test2@example.com',
          displayName: 'Test User 2',
          metadata: { userType: 'intermediate' },
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const sql = generator.generateUserInserts(users);
      const lines = sql.split('\n');
      const valueLines = lines.filter(l => l.trim().startsWith('('));
      expect(valueLines).toHaveLength(2);
      // First record should have a trailing comma
      expect(valueLines[0]).toMatch(/\),$/);
      // Last record should not have a trailing comma
      expect(valueLines[1]).toMatch(/\)$/);
      expect(valueLines[1]).not.toMatch(/\),$/);
    });

    it('should handle multiple sessions with different statuses', () => {
      const sessions: AssessmentSession[] = [
        {
          id: 'session-1',
          userId: 'user-1',
          topic: 'Algebra',
          status: 'completed',
          totalQuestions: 10,
          correctCount: 8,
          currentDifficulty: 5,
          startedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-02'),
          statistics: { averageResponseTime: 2500, accuracyRate: 0.8 },
        },
        {
          id: 'session-2',
          userId: 'user-1',
          topic: 'Geometry',
          status: 'in_progress',
          totalQuestions: 10,
          correctCount: 5,
          currentDifficulty: 3,
          startedAt: new Date('2024-01-03'),
          statistics: { averageResponseTime: 2000, accuracyRate: 0.5 },
        },
      ];

      const sql = generator.generateSessionInserts(sessions);
      expect(sql).toContain('completed');
      expect(sql).toContain('in_progress');
    });
  });
});
