/**
 * Data Generator for Sample Data Migration
 * Generates realistic sample data for all entity types
 */

import { v4 as uuidv4 } from 'uuid';
import { SampleDataConfig, GeneratedData, UserProfile, AssessmentSession, Response, KnowledgeGap, UserPersona, CognitiveGraph, LLMCallLog, AssessmentFeedback } from './types';

const FIRST_NAMES = ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Cameron', 'Avery', 'Quinn', 'Skyler'];
const LAST_NAMES = ['Chen', 'Smith', 'Williams', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
const USER_TYPES: Array<'beginner' | 'intermediate' | 'advanced'> = ['beginner', 'intermediate', 'advanced'];

export class DataGenerator {
  /**
   * Generate all sample data based on configuration
   */
  generate(config: SampleDataConfig): GeneratedData {
    // Generate users first
    const users = this.generateUsers(config.generation.numUsers, config);

    // Generate all other entities
    const assessmentSessions = this.generateSessions(users, config);
    const responses = this.generateResponses(assessmentSessions, config);
    const knowledgeGaps = this.generateKnowledgeGaps(users, config);
    const userPersonas = this.generatePersonas(users);
    const cognitiveGraphs = this.generateCognitiveGraphs(users, assessmentSessions);
    const llmCallLogs = this.generateLLMLogs(assessmentSessions, config);
    const assessmentFeedback = this.generateFeedback(users, assessmentSessions, config);

    return {
      users,
      assessmentSessions,
      responses,
      knowledgeGaps,
      userPersonas,
      cognitiveGraphs,
      llmCallLogs,
      assessmentFeedback,
    };
  }

  /**
   * Generate user profiles
   */
  generateUsers(count: number, config?: SampleDataConfig): UserProfile[] {
    const users: UserProfile[] = [];
    const emailDomain = config?.userDefaults?.emailDomain || 'example.com';
    const usedEmails = new Set<string>();

    for (let i = 0; i < count; i++) {
      // Generate unique email
      let email: string;
      let attempts = 0;
      do {
        email = `user${i + 1}@${emailDomain}`;
        attempts++;
      } while (usedEmails.has(email) && attempts < 10);

      usedEmails.add(email);

      // Generate display name
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const displayName = `${firstName} ${lastName}`;

      // Select user type
      const userType = USER_TYPES[i % USER_TYPES.length];

      const user: UserProfile = {
        id: uuidv4(),
        email,
        displayName,
        metadata: {
          userType,
          learningStyle: this.getRandomLearningStyle(),
          preferredLanguage: 'en',
        },
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date in last 90 days
        updatedAt: new Date(),
      };

      users.push(user);
    }

    return users;
  }

  /**
   * Generate assessment sessions
   */
  generateSessions(users: UserProfile[], config: SampleDataConfig): AssessmentSession[] {
    const sessions: AssessmentSession[] = [];
    const topics = ['Algebra Fundamentals', 'Geometry Basics', 'Trigonometry', 'Calculus Intro', 'Statistics'];
    const statuses: Array<'in_progress' | 'completed' | 'abandoned'> = ['in_progress', 'completed', 'abandoned'];

    for (const user of users) {
      for (let i = 0; i < config.generation.sessionsPerUser; i++) {
        const status = statuses[i % statuses.length];
        const startedAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const totalQuestions = Math.floor(Math.random() * 15) + 5;
        const correctCount = Math.floor(totalQuestions * (0.5 + Math.random() * 0.5));

        const session: AssessmentSession = {
          id: uuidv4(),
          userId: user.id,
          topic: topics[i % topics.length],
          status,
          totalQuestions,
          correctCount,
          currentDifficulty: Math.floor(Math.random() * 10) + 1,
          startedAt,
          completedAt: status === 'completed' ? new Date(startedAt.getTime() + Math.random() * 60 * 60 * 1000) : undefined,
          statistics: {
            averageResponseTime: Math.floor(Math.random() * 3000) + 1000,
            accuracyRate: correctCount / totalQuestions,
          },
        };

        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Generate responses
   */
  generateResponses(sessions: AssessmentSession[], config: SampleDataConfig): Response[] {
    const responses: Response[] = [];

    for (const session of sessions) {
      for (let i = 0; i < config.generation.responsesPerSession; i++) {
        const isCorrect = Math.random() > 0.35; // 65% correct

        const response: Response = {
          id: uuidv4(),
          assessmentId: session.id,
          questionId: `q-${Math.floor(Math.random() * 1000)}`,
          userAnswer: `answer-${i}`,
          isCorrect,
          difficulty: Math.floor(Math.random() * 10) + 1,
          deductionData: !isCorrect ? {
            analysis: 'The answer was incorrect',
            reasoning: 'The student did not apply the correct formula',
            suggestedConcepts: ['Quadratic Equations', 'Factoring'],
          } : undefined,
          createdAt: new Date(),
        };

        responses.push(response);
      }
    }

    return responses;
  }

  /**
   * Generate knowledge gaps
   */
  generateKnowledgeGaps(users: UserProfile[], config: SampleDataConfig): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const concepts = ['Quadratic Equations', 'Trigonometric Identities', 'Integration', 'Probability', 'Matrices'];

    for (const user of users) {
      for (let i = 0; i < config.generation.knowledgeGapsPerUser; i++) {
        const gap: KnowledgeGap = {
          id: uuidv4(),
          userId: user.id,
          concept: concepts[i % concepts.length],
          severity: Math.floor(Math.random() * 10) + 1,
          remediationSuggestions: {
            resources: ['Khan Academy', 'Textbook Chapter 5', 'Video Tutorial'],
            estimatedTime: Math.floor(Math.random() * 120) + 30,
            difficulty: Math.floor(Math.random() * 10) + 1,
          },
          identifiedAt: new Date(),
        };

        gaps.push(gap);
      }
    }

    return gaps;
  }

  /**
   * Generate user personas
   */
  generatePersonas(users: UserProfile[]): UserPersona[] {
    const personas: UserPersona[] = [];

    for (const user of users) {
      const persona: UserPersona = {
        id: uuidv4(),
        userId: user.id,
        cognitiveMetrics: {
          depth: Math.floor(Math.random() * 100),
          breadth: Math.floor(Math.random() * 100),
          creativity: Math.floor(Math.random() * 100),
          persistence: Math.floor(Math.random() * 100),
          curiosity: Math.floor(Math.random() * 100),
        },
        learningStyle: {
          preferredModality: this.getRandomModality(),
          processingStyle: this.getRandomProcessingStyle(),
        },
        explanationPreference: ['visual', 'interactive'],
        strongConcepts: ['Algebra', 'Geometry'],
        weakConcepts: ['Calculus'],
        prerequisiteGaps: ['Trigonometry'],
        engagementPattern: this.getRandomEngagementPattern(),
        statistics: {
          averageResponseTime: Math.floor(Math.random() * 3000) + 1000,
          consistencyScore: Math.floor(Math.random() * 100),
          totalSessions: Math.floor(Math.random() * 20) + 1,
          overallMastery: Math.floor(Math.random() * 100),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      personas.push(persona);
    }

    return personas;
  }

  /**
   * Generate cognitive graphs
   */
  generateCognitiveGraphs(users: UserProfile[], sessions: AssessmentSession[]): CognitiveGraph[] {
    const graphs: CognitiveGraph[] = [];

    for (const user of users) {
      const userSessions = sessions.filter(s => s.userId === user.id);
      const nodeCount = Math.floor(Math.random() * 15) + 5;
      const edgeCount = Math.floor(Math.random() * 20) + 5;

      const nodes = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        label: `Concept ${i}`,
        mastery: Math.floor(Math.random() * 100),
      }));

      const edges = Array.from({ length: edgeCount }, (_, i) => ({
        source: `node-${Math.floor(Math.random() * nodeCount)}`,
        target: `node-${Math.floor(Math.random() * nodeCount)}`,
        type: 'prerequisite',
      }));

      const graph: CognitiveGraph = {
        id: uuidv4(),
        userId: user.id,
        graphData: { nodes, edges },
        nodeCount,
        edgeCount,
        sessionCount: userSessions.length,
        lastSessionId: userSessions.length > 0 ? userSessions[userSessions.length - 1].id : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      graphs.push(graph);
    }

    return graphs;
  }

  /**
   * Generate LLM call logs
   */
  generateLLMLogs(sessions: AssessmentSession[], config: SampleDataConfig): LLMCallLog[] {
    const logs: LLMCallLog[] = [];
    const models = ['gemini-2.0-flash', 'llama-3.3-70b-versatile', 'gpt-4-turbo'];
    const promptTypes: Array<'question_generation' | 'answer_evaluation' | 'persona_synthesis' | 'feedback_generation'> = [
      'question_generation',
      'answer_evaluation',
      'persona_synthesis',
      'feedback_generation',
    ];

    for (const session of sessions) {
      for (let i = 0; i < config.generation.llmLogsPerSession; i++) {
        const inputTokens = Math.floor(Math.random() * 1500) + 100;
        const outputTokens = Math.floor(Math.random() * 800) + 50;

        const log: LLMCallLog = {
          id: uuidv4(),
          assessmentId: session.id,
          promptType: promptTypes[i % promptTypes.length],
          model: models[i % models.length],
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          durationMs: Math.floor(Math.random() * 4000) + 500,
          createdAt: new Date(),
        };

        logs.push(log);
      }
    }

    return logs;
  }

  /**
   * Generate assessment feedback
   */
  generateFeedback(users: UserProfile[], sessions: AssessmentSession[], config: SampleDataConfig): AssessmentFeedback[] {
    const feedback: AssessmentFeedback[] = [];
    const feedbackTypes: Array<'incorrect_answer' | 'unclear_question' | 'wrong_difficulty' | 'too_easy' | 'too_hard' | 'other'> = [
      'incorrect_answer',
      'unclear_question',
      'wrong_difficulty',
      'too_easy',
      'too_hard',
      'other',
    ];

    for (const user of users) {
      const userSessions = sessions.filter(s => s.userId === user.id);
      for (let i = 0; i < config.generation.feedbackPerUser; i++) {
        const resolved = Math.random() > 0.5;
        const session = userSessions[i % userSessions.length];

        const fb: AssessmentFeedback = {
          id: uuidv4(),
          userId: user.id,
          sessionId: session?.id || uuidv4(),
          feedbackType: feedbackTypes[i % feedbackTypes.length],
          feedbackText: 'This question was ' + feedbackTypes[i % feedbackTypes.length],
          resolved,
          resolvedAt: resolved ? new Date() : undefined,
          createdAt: new Date(),
        };

        feedback.push(fb);
      }
    }

    return feedback;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getRandomLearningStyle(): string {
    const styles = ['visual', 'auditory', 'kinesthetic', 'reading-writing'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private getRandomModality(): 'visual' | 'textual' | 'interactive' | 'mixed' {
    const modalities: Array<'visual' | 'textual' | 'interactive' | 'mixed'> = ['visual', 'textual', 'interactive', 'mixed'];
    return modalities[Math.floor(Math.random() * modalities.length)];
  }

  private getRandomProcessingStyle(): 'serialist' | 'holist' | 'mixed' {
    const styles: Array<'serialist' | 'holist' | 'mixed'> = ['serialist', 'holist', 'mixed'];
    return styles[Math.floor(Math.random() * styles.length)];
  }

  private getRandomEngagementPattern(): 'accelerating' | 'decelerating' | 'consistent' | 'erratic' | 'neutral' {
    const patterns: Array<'accelerating' | 'decelerating' | 'consistent' | 'erratic' | 'neutral'> = [
      'accelerating',
      'decelerating',
      'consistent',
      'erratic',
      'neutral',
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
}
