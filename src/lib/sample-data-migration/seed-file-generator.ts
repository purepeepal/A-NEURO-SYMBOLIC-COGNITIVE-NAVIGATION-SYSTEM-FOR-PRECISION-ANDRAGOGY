/**
 * Seed File Generator for Sample Data Migration
 * Converts generated data into idempotent SQL seed file
 */

import { GeneratedData, UserProfile, AssessmentSession, Response, KnowledgeGap, UserPersona, CognitiveGraph, LLMCallLog, AssessmentFeedback } from './types';

export class SeedFileGenerator {
  /**
   * Escape single quotes in SQL strings
   */
  private escapeSqlString(str: string): string {
    return str.replace(/'/g, "''");
  }

  /**
   * Format a value for SQL insertion
   */
  private formatSqlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${this.escapeSqlString(value)}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (typeof value === 'object') {
      return `'${this.escapeSqlString(JSON.stringify(value))}'::jsonb`;
    }
    return String(value);
  }

  /**
   * Generate complete seed file SQL
   */
  generate(data: GeneratedData): string {
    const sections: string[] = [];

    // Header
    sections.push(this.generateHeader());

    // User profiles
    if (data.users.length > 0) {
      sections.push(this.generateUserInserts(data.users));
    }

    // Assessment sessions
    if (data.assessmentSessions.length > 0) {
      sections.push(this.generateSessionInserts(data.assessmentSessions));
    }

    // Responses
    if (data.responses.length > 0) {
      sections.push(this.generateResponseInserts(data.responses));
    }

    // Knowledge gaps
    if (data.knowledgeGaps.length > 0) {
      sections.push(this.generateKnowledgeGapInserts(data.knowledgeGaps));
    }

    // User personas
    if (data.userPersonas.length > 0) {
      sections.push(this.generatePersonaInserts(data.userPersonas));
    }

    // Cognitive graphs
    if (data.cognitiveGraphs.length > 0) {
      sections.push(this.generateCognitiveGraphInserts(data.cognitiveGraphs));
    }

    // LLM call logs
    if (data.llmCallLogs.length > 0) {
      sections.push(this.generateLLMLogInserts(data.llmCallLogs));
    }

    // Assessment feedback
    if (data.assessmentFeedback.length > 0) {
      sections.push(this.generateFeedbackInserts(data.assessmentFeedback));
    }

    // Footer
    sections.push(this.generateFooter());

    return sections.join('\n\n');
  }

  /**
   * Generate seed file header with documentation
   */
  private generateHeader(): string {
    return `-- ============================================================================
-- Supabase Sample Data Migration
-- ============================================================================
-- This file contains idempotent INSERT statements that populate the streets-v3
-- database with realistic sample data for development and testing.
--
-- The file uses INSERT ... ON CONFLICT DO NOTHING to ensure idempotency.
-- It can be safely executed multiple times without creating duplicates.
--
-- Execution order respects foreign key constraints.
-- ============================================================================`;
  }

  /**
   * Generate seed file footer
   */
  private generateFooter(): string {
    return `-- ============================================================================
-- Seed file generation complete
-- ============================================================================
-- All sample data has been inserted with idempotent patterns.
-- The database is now populated with realistic sample data for development.`;
  }

  /**
   * Generate user profile INSERT statements
   */
  generateUserInserts(users: UserProfile[]): string {
    if (users.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 1: User Profiles',
      '-- ============================================================================',
      '-- Creates sample users with varied characteristics and metadata.',
      '-- These users serve as the foundation for all other sample data.',
      '',
      'INSERT INTO user_profiles (id, email, display_name, metadata, created_at, updated_at)',
      'VALUES',
    ];

    const values = users.map((user, index) => {
      const metadata = JSON.stringify(user.metadata);
      const line = `  (${this.formatSqlValue(user.id)}, ${this.formatSqlValue(user.email)}, ${this.formatSqlValue(user.displayName)}, ${this.formatSqlValue(metadata)}, ${this.formatSqlValue(user.createdAt)}, ${this.formatSqlValue(user.updatedAt)})`;
      return index === users.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate assessment session INSERT statements
   */
  generateSessionInserts(sessions: AssessmentSession[]): string {
    if (sessions.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 2: Assessment Sessions',
      '-- ============================================================================',
      '-- Creates sample assessment sessions linked to sample users.',
      '-- Sessions demonstrate different states: in_progress, completed, abandoned.',
      '',
      'INSERT INTO assessments (id, user_id, topic, status, total_questions, correct_count, current_difficulty, started_at, completed_at, statistics, created_at, updated_at)',
      'VALUES',
    ];

    const values = sessions.map((session, index) => {
      const statistics = JSON.stringify(session.statistics);
      const completedAt = session.completedAt ? this.formatSqlValue(session.completedAt) : 'NULL';
      const line = `  (${this.formatSqlValue(session.id)}, ${this.formatSqlValue(session.userId)}, ${this.formatSqlValue(session.topic)}, ${this.formatSqlValue(session.status)}, ${session.totalQuestions}, ${session.correctCount}, ${session.currentDifficulty}, ${this.formatSqlValue(session.startedAt)}, ${completedAt}, ${this.formatSqlValue(statistics)}, NOW(), NOW())`;
      return index === sessions.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate response INSERT statements
   */
  generateResponseInserts(responses: Response[]): string {
    if (responses.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 3: Responses',
      '-- ============================================================================',
      '-- Creates sample responses to assessment questions.',
      '-- Responses demonstrate correct and incorrect answers with varied difficulty.',
      '',
      'INSERT INTO responses (id, assessment_id, question_id, user_answer, is_correct, difficulty, deduction_data, created_at)',
      'VALUES',
    ];

    const values = responses.map((response, index) => {
      const deductionData = response.deductionData ? this.formatSqlValue(response.deductionData) : 'NULL';
      const line = `  (${this.formatSqlValue(response.id)}, ${this.formatSqlValue(response.assessmentId)}, ${this.formatSqlValue(response.questionId)}, ${this.formatSqlValue(response.userAnswer)}, ${response.isCorrect}, ${response.difficulty}, ${deductionData}, ${this.formatSqlValue(response.createdAt)})`;
      return index === responses.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate knowledge gap INSERT statements
   */
  generateKnowledgeGapInserts(gaps: KnowledgeGap[]): string {
    if (gaps.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 4: Knowledge Gaps',
      '-- ============================================================================',
      '-- Creates sample knowledge gaps for users.',
      '-- Knowledge gaps represent identified learning deficiencies.',
      '',
      'INSERT INTO knowledge_gaps (id, user_id, concept, severity, remediation_suggestions, identified_at)',
      'VALUES',
    ];

    const values = gaps.map((gap, index) => {
      const remediationSuggestions = gap.remediationSuggestions ? this.formatSqlValue(gap.remediationSuggestions) : 'NULL';
      const line = `  (${this.formatSqlValue(gap.id)}, ${this.formatSqlValue(gap.userId)}, ${this.formatSqlValue(gap.concept)}, ${gap.severity}, ${remediationSuggestions}, ${this.formatSqlValue(gap.identifiedAt)})`;
      return index === gaps.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate user persona INSERT statements
   */
  generatePersonaInserts(personas: UserPersona[]): string {
    if (personas.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 5: User Personas',
      '-- ============================================================================',
      '-- Creates sample user personas with cognitive metrics and learning styles.',
      '-- Personas represent learner characteristics and adaptation profiles.',
      '',
      'INSERT INTO user_personas (id, user_id, cognitive_metrics, learning_style, explanation_preference, strong_concepts, weak_concepts, prerequisite_gaps, engagement_pattern, statistics, created_at, updated_at)',
      'VALUES',
    ];

    const values = personas.map((persona, index) => {
      const cognitiveMetrics = JSON.stringify(persona.cognitiveMetrics);
      const learningStyle = JSON.stringify(persona.learningStyle);
      const explanationPreference = JSON.stringify(persona.explanationPreference);
      const strongConcepts = JSON.stringify(persona.strongConcepts);
      const weakConcepts = JSON.stringify(persona.weakConcepts);
      const prerequisiteGaps = JSON.stringify(persona.prerequisiteGaps);
      const statistics = JSON.stringify(persona.statistics);
      const line = `  (${this.formatSqlValue(persona.id)}, ${this.formatSqlValue(persona.userId)}, ${this.formatSqlValue(cognitiveMetrics)}, ${this.formatSqlValue(learningStyle)}, ${this.formatSqlValue(explanationPreference)}, ${this.formatSqlValue(strongConcepts)}, ${this.formatSqlValue(weakConcepts)}, ${this.formatSqlValue(prerequisiteGaps)}, ${this.formatSqlValue(persona.engagementPattern)}, ${this.formatSqlValue(statistics)}, ${this.formatSqlValue(persona.createdAt)}, ${this.formatSqlValue(persona.updatedAt)})`;
      return index === personas.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate cognitive graph INSERT statements
   */
  generateCognitiveGraphInserts(graphs: CognitiveGraph[]): string {
    if (graphs.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 6: Cognitive Graphs',
      '-- ============================================================================',
      '-- Creates sample cognitive graphs representing knowledge structures.',
      '-- Graphs contain nodes and edges representing concepts and relationships.',
      '',
      'INSERT INTO cognitive_graphs (id, user_id, graph_data, node_count, edge_count, session_count, last_session_id, created_at, updated_at)',
      'VALUES',
    ];

    const values = graphs.map((graph, index) => {
      const graphData = JSON.stringify(graph.graphData);
      const lastSessionId = graph.lastSessionId ? this.formatSqlValue(graph.lastSessionId) : 'NULL';
      const line = `  (${this.formatSqlValue(graph.id)}, ${this.formatSqlValue(graph.userId)}, ${this.formatSqlValue(graphData)}, ${graph.nodeCount}, ${graph.edgeCount}, ${graph.sessionCount}, ${lastSessionId}, ${this.formatSqlValue(graph.createdAt)}, ${this.formatSqlValue(graph.updatedAt)})`;
      return index === graphs.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate LLM call log INSERT statements
   */
  generateLLMLogInserts(logs: LLMCallLog[]): string {
    if (logs.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 7: LLM Call Logs',
      '-- ============================================================================',
      '-- Creates sample LLM call logs tracking API usage.',
      '-- Logs record prompt types, models, token counts, and execution duration.',
      '',
      'INSERT INTO llm_call_logs (id, assessment_id, prompt_type, model, input_tokens, output_tokens, total_tokens, duration_ms, created_at)',
      'VALUES',
    ];

    const values = logs.map((log, index) => {
      const line = `  (${this.formatSqlValue(log.id)}, ${this.formatSqlValue(log.assessmentId)}, ${this.formatSqlValue(log.promptType)}, ${this.formatSqlValue(log.model)}, ${log.inputTokens}, ${log.outputTokens}, ${log.totalTokens}, ${log.durationMs}, ${this.formatSqlValue(log.createdAt)})`;
      return index === logs.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }

  /**
   * Generate assessment feedback INSERT statements
   */
  generateFeedbackInserts(feedback: AssessmentFeedback[]): string {
    if (feedback.length === 0) return '';

    const lines: string[] = [
      '-- ============================================================================',
      '-- Section 8: Assessment Feedback',
      '-- ============================================================================',
      '-- Creates sample assessment feedback records.',
      '-- Feedback captures user input on question quality and difficulty.',
      '',
      'INSERT INTO assessment_feedback (id, user_id, session_id, feedback_type, feedback_text, resolved, resolved_at, created_at)',
      'VALUES',
    ];

    const values = feedback.map((fb, index) => {
      const resolvedAt = fb.resolvedAt ? this.formatSqlValue(fb.resolvedAt) : 'NULL';
      const feedbackText = fb.feedbackText ? this.formatSqlValue(fb.feedbackText) : 'NULL';
      const line = `  (${this.formatSqlValue(fb.id)}, ${this.formatSqlValue(fb.userId)}, ${this.formatSqlValue(fb.sessionId)}, ${this.formatSqlValue(fb.feedbackType)}, ${feedbackText}, ${fb.resolved}, ${resolvedAt}, ${this.formatSqlValue(fb.createdAt)})`;
      return index === feedback.length - 1 ? line : line + ',';
    });

    lines.push(...values);
    lines.push('ON CONFLICT (id) DO NOTHING;');

    return lines.join('\n');
  }
}
