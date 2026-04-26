/**
 * Tests for Data Generator
 * Validates generation of all entity types with correct properties
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DataGenerator } from '@/lib/sample-data-migration/generator';
import { SampleDataConfig } from '@/lib/sample-data-migration/types';

describe('Data Generator', () => {
  const generator = new DataGenerator();

  // ============================================================================
  // Unit Tests - User Profile Generation
  // ============================================================================

  describe('User Profile Generation', () => {
    it('should generate specified number of users', () => {
      const users = generator.generateUsers(5);
      expect(users).toHaveLength(5);
    });

    it('should generate users with unique UUIDs', () => {
      const users = generator.generateUsers(10);
      const ids = new Set(users.map(u => u.id));
      expect(ids.size).toBe(10);
    });

    it('should generate users with unique emails', () => {
      const users = generator.generateUsers(10);
      const emails = new Set(users.map(u => u.email));
      expect(emails.size).toBe(10);
    });

    it('should generate users with valid email format', () => {
      const users = generator.generateUsers(5);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const user of users) {
        expect(user.email).toMatch(emailRegex);
      }
    });

    it('should generate users with varied user types', () => {
      const users = generator.generateUsers(10);
      const userTypes = new Set(users.map(u => u.metadata.userType));
      expect(userTypes.size).toBeGreaterThan(1);
    });

    it('should generate users with display names', () => {
      const users = generator.generateUsers(5);
      for (const user of users) {
        expect(user.displayName).toBeTruthy();
        expect(user.displayName.split(' ').length).toBe(2);
      }
    });

    it('should generate users with timestamps', () => {
      const users = generator.generateUsers(5);
      for (const user of users) {
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  // ============================================================================
  // Unit Tests - Assessment Session Generation
  // ============================================================================

  describe('Assessment Session Generation', () => {
    it('should generate correct number of sessions per user', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 4,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      expect(sessions).toHaveLength(config.generation.numUsers * config.generation.sessionsPerUser);
    });

    it('should link sessions to valid users', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const userIds = new Set(users.map(u => u.id));
      for (const session of sessions) {
        expect(userIds.has(session.userId)).toBe(true);
      }
    });

    it('should generate sessions with varied status', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 6,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const statuses = new Set(sessions.map(s => s.status));
      expect(statuses.size).toBeGreaterThan(1);
    });

    it('should set completedAt only for completed sessions', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 3,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      for (const session of sessions) {
        if (session.status === 'completed') {
          expect(session.completedAt).toBeDefined();
        } else {
          expect(session.completedAt).toBeUndefined();
        }
      }
    });
  });

  // ============================================================================
  // Unit Tests - Response Generation
  // ============================================================================

  describe('Response Generation', () => {
    it('should generate correct number of responses per session', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 8,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const responses = generator.generateResponses(sessions, config);
      expect(responses).toHaveLength(sessions.length * config.generation.responsesPerSession);
    });

    it('should link responses to valid sessions', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 5,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const responses = generator.generateResponses(sessions, config);
      const sessionIds = new Set(sessions.map(s => s.id));
      for (const response of responses) {
        expect(sessionIds.has(response.assessmentId)).toBe(true);
      }
    });

    it('should generate responses with varied correctness', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 20,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const responses = generator.generateResponses(sessions, config);
      const correctCount = responses.filter(r => r.isCorrect).length;
      const incorrectCount = responses.filter(r => !r.isCorrect).length;
      expect(correctCount).toBeGreaterThan(0);
      expect(incorrectCount).toBeGreaterThan(0);
    });

    it('should generate responses with difficulty in valid range', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const responses = generator.generateResponses(sessions, config);
      for (const response of responses) {
        expect(response.difficulty).toBeGreaterThanOrEqual(1);
        expect(response.difficulty).toBeLessThanOrEqual(10);
      }
    });
  });

  // ============================================================================
  // Unit Tests - Knowledge Gap Generation
  // ============================================================================

  describe('Knowledge Gap Generation', () => {
    it('should generate correct number of gaps per user', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 3,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const gaps = generator.generateKnowledgeGaps(users, config);
      expect(gaps).toHaveLength(config.generation.numUsers * config.generation.knowledgeGapsPerUser);
    });

    it('should link gaps to valid users', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const gaps = generator.generateKnowledgeGaps(users, config);
      const userIds = new Set(users.map(u => u.id));
      for (const gap of gaps) {
        expect(userIds.has(gap.userId)).toBe(true);
      }
    });

    it('should generate gaps with severity in valid range', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 3,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const gaps = generator.generateKnowledgeGaps(users, config);
      for (const gap of gaps) {
        expect(gap.severity).toBeGreaterThanOrEqual(1);
        expect(gap.severity).toBeLessThanOrEqual(10);
      }
    });
  });

  // ============================================================================
  // Unit Tests - User Persona Generation
  // ============================================================================

  describe('User Persona Generation', () => {
    it('should generate one persona per user', () => {
      const users = generator.generateUsers(5);
      const personas = generator.generatePersonas(users);
      expect(personas).toHaveLength(users.length);
    });

    it('should link personas to valid users', () => {
      const users = generator.generateUsers(5);
      const personas = generator.generatePersonas(users);
      const userIds = new Set(users.map(u => u.id));
      for (const persona of personas) {
        expect(userIds.has(persona.userId)).toBe(true);
      }
    });

    it('should generate personas with cognitive metrics in valid range', () => {
      const users = generator.generateUsers(3);
      const personas = generator.generatePersonas(users);
      for (const persona of personas) {
        expect(persona.cognitiveMetrics.depth).toBeGreaterThanOrEqual(0);
        expect(persona.cognitiveMetrics.depth).toBeLessThanOrEqual(100);
        expect(persona.cognitiveMetrics.breadth).toBeGreaterThanOrEqual(0);
        expect(persona.cognitiveMetrics.breadth).toBeLessThanOrEqual(100);
        expect(persona.cognitiveMetrics.creativity).toBeGreaterThanOrEqual(0);
        expect(persona.cognitiveMetrics.creativity).toBeLessThanOrEqual(100);
        expect(persona.cognitiveMetrics.persistence).toBeGreaterThanOrEqual(0);
        expect(persona.cognitiveMetrics.persistence).toBeLessThanOrEqual(100);
        expect(persona.cognitiveMetrics.curiosity).toBeGreaterThanOrEqual(0);
        expect(persona.cognitiveMetrics.curiosity).toBeLessThanOrEqual(100);
      }
    });

    it('should generate personas with valid learning styles', () => {
      const users = generator.generateUsers(3);
      const personas = generator.generatePersonas(users);
      const validModalities = ['visual', 'textual', 'interactive', 'mixed'];
      const validProcessingStyles = ['serialist', 'holist', 'mixed'];
      for (const persona of personas) {
        expect(validModalities).toContain(persona.learningStyle.preferredModality);
        expect(validProcessingStyles).toContain(persona.learningStyle.processingStyle);
      }
    });
  });

  // ============================================================================
  // Unit Tests - Cognitive Graph Generation
  // ============================================================================

  describe('Cognitive Graph Generation', () => {
    it('should generate one cognitive graph per user', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 5,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const graphs = generator.generateCognitiveGraphs(users, sessions);
      expect(graphs).toHaveLength(users.length);
    });

    it('should link graphs to valid users', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const graphs = generator.generateCognitiveGraphs(users, sessions);
      const userIds = new Set(users.map(u => u.id));
      for (const graph of graphs) {
        expect(userIds.has(graph.userId)).toBe(true);
      }
    });

    it('should generate graphs with matching node and edge counts', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const graphs = generator.generateCognitiveGraphs(users, sessions);
      for (const graph of graphs) {
        expect(graph.nodeCount).toBe(graph.graphData.nodes.length);
        expect(graph.edgeCount).toBe(graph.graphData.edges.length);
      }
    });
  });

  // ============================================================================
  // Unit Tests - LLM Call Log Generation
  // ============================================================================

  describe('LLM Call Log Generation', () => {
    it('should generate correct number of logs per session', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 4,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const logs = generator.generateLLMLogs(sessions, config);
      expect(logs).toHaveLength(sessions.length * config.generation.llmLogsPerSession);
    });

    it('should link logs to valid sessions', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 3,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const logs = generator.generateLLMLogs(sessions, config);
      const sessionIds = new Set(sessions.map(s => s.id));
      for (const log of logs) {
        expect(sessionIds.has(log.assessmentId)).toBe(true);
      }
    });

    it('should generate logs with valid token counts', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 3,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const logs = generator.generateLLMLogs(sessions, config);
      for (const log of logs) {
        expect(log.totalTokens).toBe(log.inputTokens + log.outputTokens);
        expect(log.inputTokens).toBeGreaterThan(0);
        expect(log.outputTokens).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // Unit Tests - Assessment Feedback Generation
  // ============================================================================

  describe('Assessment Feedback Generation', () => {
    it('should generate correct number of feedback per user', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 3,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const feedback = generator.generateFeedback(users, sessions, config);
      expect(feedback).toHaveLength(config.generation.numUsers * config.generation.feedbackPerUser);
    });

    it('should link feedback to valid users and sessions', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const feedback = generator.generateFeedback(users, sessions, config);
      const userIds = new Set(users.map(u => u.id));
      const sessionIds = new Set(sessions.map(s => s.id));
      for (const fb of feedback) {
        expect(userIds.has(fb.userId)).toBe(true);
        expect(sessionIds.has(fb.sessionId)).toBe(true);
      }
    });

    it('should generate feedback with valid types', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const feedback = generator.generateFeedback(users, sessions, config);
      const validTypes = ['incorrect_answer', 'unclear_question', 'wrong_difficulty', 'too_easy', 'too_hard', 'other'];
      for (const fb of feedback) {
        expect(validTypes).toContain(fb.feedbackType);
      }
    });

    it('should set resolvedAt only for resolved feedback', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 2,
          sessionsPerUser: 2,
          responsesPerSession: 10,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 5,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const users = generator.generateUsers(config.generation.numUsers);
      const sessions = generator.generateSessions(users, config);
      const feedback = generator.generateFeedback(users, sessions, config);
      for (const fb of feedback) {
        if (fb.resolved) {
          expect(fb.resolvedAt).toBeDefined();
        } else {
          expect(fb.resolvedAt).toBeUndefined();
        }
      }
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Complete Data Generation', () => {
    it('should generate all data types with correct relationships', () => {
      const config: SampleDataConfig = {
        version: '1.0',
        generation: {
          numUsers: 3,
          sessionsPerUser: 2,
          responsesPerSession: 5,
          knowledgeGapsPerUser: 2,
          feedbackPerUser: 2,
          llmLogsPerSession: 3,
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const data = generator.generate(config);
      expect(data.users).toHaveLength(3);
      expect(data.assessmentSessions).toHaveLength(6);
      expect(data.responses).toHaveLength(30);
      expect(data.knowledgeGaps).toHaveLength(6);
      expect(data.userPersonas).toHaveLength(3);
      expect(data.cognitiveGraphs).toHaveLength(3);
      expect(data.llmCallLogs).toHaveLength(18);
      expect(data.assessmentFeedback).toHaveLength(6);
    });
  });
});
