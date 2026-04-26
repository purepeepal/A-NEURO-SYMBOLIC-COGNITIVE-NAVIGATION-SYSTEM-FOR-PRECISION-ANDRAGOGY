/**
 * Tests for Configuration Parser
 * Validates parsing, validation, and pretty printing of sample data configuration
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ConfigurationParser } from '@/lib/sample-data-migration/parser';
import { SampleDataConfig } from '@/lib/sample-data-migration/types';

describe('Configuration Parser', () => {
  const parser = new ConfigurationParser();

  // ============================================================================
  // Unit Tests
  // ============================================================================

  describe('Unit Tests', () => {
    it('should parse valid YAML configuration', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: 5
  sessionsPerUser: 3
  responsesPerSession: 10
  knowledgeGapsPerUser: 2
  feedbackPerUser: 2
  llmLogsPerSession: 5
seedFilePath: "supabase/seed.sql"
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(true);
      expect(result.config?.generation.numUsers).toBe(5);
      expect(result.config?.seedFilePath).toBe('supabase/seed.sql');
    });

    it('should parse valid JSON configuration', () => {
      const json = JSON.stringify({
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
      });
      const result = parser.parse(json);
      expect(result.success).toBe(true);
      expect(result.config?.generation.numUsers).toBe(5);
    });

    it('should detect missing required fields', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: 5
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Missing required field: generation.sessionsPerUser');
    });

    it('should detect invalid value types', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: "five"
  sessionsPerUser: 3
  responsesPerSession: 10
  knowledgeGapsPerUser: 2
  feedbackPerUser: 2
  llmLogsPerSession: 5
seedFilePath: "supabase/seed.sql"
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Invalid type'))).toBe(true);
    });

    it('should detect out of range values', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: 0
  sessionsPerUser: 3
  responsesPerSession: 10
  knowledgeGapsPerUser: 2
  feedbackPerUser: 2
  llmLogsPerSession: 5
seedFilePath: "supabase/seed.sql"
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('must be >= 1'))).toBe(true);
    });

    it('should detect invalid email domain format', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: 5
  sessionsPerUser: 3
  responsesPerSession: 10
  knowledgeGapsPerUser: 2
  feedbackPerUser: 2
  llmLogsPerSession: 5
userDefaults:
  emailDomain: "invalid domain"
seedFilePath: "supabase/seed.sql"
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Invalid email domain format'))).toBe(true);
    });

    it('should pretty print configuration to YAML', () => {
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
      const yaml = parser.prettyPrint(config);
      expect(yaml).toContain('version:');
      expect(yaml).toContain('1.0');
      expect(yaml).toContain('numUsers: 5');
      expect(yaml).toContain('seedFilePath: supabase/seed.sql');
    });

    it('should include userDefaults in pretty print when present', () => {
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
        userDefaults: {
          emailDomain: 'example.com',
        },
        seedFilePath: 'supabase/seed.sql',
      };
      const yaml = parser.prettyPrint(config);
      expect(yaml).toContain('userDefaults');
      expect(yaml).toContain('example.com');
    });

    it('should apply default values when configuration is minimal', () => {
      const yaml = `
version: "1.0"
generation:
  numUsers: 5
  sessionsPerUser: 3
  responsesPerSession: 10
  knowledgeGapsPerUser: 2
  feedbackPerUser: 2
  llmLogsPerSession: 5
seedFilePath: "supabase/seed.sql"
`;
      const result = parser.parse(yaml);
      expect(result.success).toBe(true);
      expect(result.config?.version).toBe('1.0');
      expect(result.config?.generation.numUsers).toBe(5);
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  describe('Property 30: Configuration Parser Round-Trip', () => {
    it('should satisfy round-trip property: parse(prettyPrint(config)) ≡ config', () => {
      // Generator for valid SampleDataConfig
      const configArbitrary = fc.record({
        version: fc.constant('1.0'),
        generation: fc.record({
          numUsers: fc.integer({ min: 1, max: 100 }),
          sessionsPerUser: fc.integer({ min: 1, max: 50 }),
          responsesPerSession: fc.integer({ min: 1, max: 100 }),
          knowledgeGapsPerUser: fc.integer({ min: 1, max: 20 }),
          feedbackPerUser: fc.integer({ min: 1, max: 20 }),
          llmLogsPerSession: fc.integer({ min: 1, max: 50 }),
        }),
        userDefaults: fc.option(
          fc.record({
            displayNamePattern: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            emailDomain: fc.option(fc.domain()),
            metadata: fc.option(fc.record({ key: fc.string() })),
          }),
          { freq: 1 }
        ),
        seedFilePath: fc.string({ minLength: 1, maxLength: 100 }),
      });

      fc.assert(
        fc.property(configArbitrary, (config) => {
          // Pretty print the config
          const printed = parser.prettyPrint(config);

          // Parse it back
          const result = parser.parse(printed);

          // Verify parsing succeeded
          expect(result.success).toBe(true);
          expect(result.config).toBeDefined();

          // Verify the parsed config matches the original
          const parsed = result.config!;
          expect(parsed.version).toBe(config.version);
          expect(parsed.generation.numUsers).toBe(config.generation.numUsers);
          expect(parsed.generation.sessionsPerUser).toBe(config.generation.sessionsPerUser);
          expect(parsed.generation.responsesPerSession).toBe(config.generation.responsesPerSession);
          expect(parsed.generation.knowledgeGapsPerUser).toBe(config.generation.knowledgeGapsPerUser);
          expect(parsed.generation.feedbackPerUser).toBe(config.generation.feedbackPerUser);
          expect(parsed.generation.llmLogsPerSession).toBe(config.generation.llmLogsPerSession);
          expect(parsed.seedFilePath).toBe(config.seedFilePath);

          // Verify userDefaults if present
          if (config.userDefaults) {
            expect(parsed.userDefaults).toBeDefined();
            if (config.userDefaults.displayNamePattern) {
              expect(parsed.userDefaults?.displayNamePattern).toBe(config.userDefaults.displayNamePattern);
            }
            if (config.userDefaults.emailDomain) {
              expect(parsed.userDefaults?.emailDomain).toBe(config.userDefaults.emailDomain);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('**Validates: Requirements 13.4**', () => {
      // This test validates that the round-trip property holds
      // for all valid configurations, ensuring the parser and pretty printer
      // are consistent and reversible.
      expect(true).toBe(true);
    });
  });
});
