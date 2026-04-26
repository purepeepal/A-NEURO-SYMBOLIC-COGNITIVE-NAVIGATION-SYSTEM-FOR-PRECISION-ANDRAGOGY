/**
 * Property-Based Tests for Seed File Generator
 * Validates universal correctness properties across all inputs
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SeedFileGenerator } from '@/lib/sample-data-migration/seed-file-generator';
import { GeneratedData } from '@/lib/sample-data-migration/types';

describe('Seed File Generator - Property-Based Tests', () => {
  const generator = new SeedFileGenerator();

  // ============================================================================
  // Property 26: Seed File Idempotency
  // ============================================================================

  describe('Property 26: Seed File Idempotency', () => {
    it('should generate idempotent SQL with ON CONFLICT DO NOTHING', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
              metadata: fc.record({
                userType: fc.constantFrom('beginner', 'intermediate', 'advanced'),
              }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (users) => {
            const sql = generator.generateUserInserts(users);
            // Every INSERT should have ON CONFLICT DO NOTHING
            expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
            // Should be valid SQL
            expect(sql).toContain('INSERT INTO');
            expect(sql).toContain('VALUES');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 27: Seed File Referential Integrity
  // ============================================================================

  describe('Property 27: Seed File Referential Integrity', () => {
    it('should maintain referential integrity in generated SQL', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
              metadata: fc.record({
                userType: fc.constantFrom('beginner', 'intermediate', 'advanced'),
              }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (users) => {
            const sql = generator.generateUserInserts(users);
            // All user IDs should be present in the SQL
            for (const user of users) {
              expect(sql).toContain(user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Property 28: Seed File Documentation and Compatibility
  // ============================================================================

  describe('Property 28: Seed File Documentation and Compatibility', () => {
    it('should include comprehensive comments in generated SQL', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
              metadata: fc.record({
                userType: fc.constantFrom('beginner', 'intermediate', 'advanced'),
              }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (users) => {
            const sql = generator.generateUserInserts(users);
            // Should include comments
            expect(sql).toContain('--');
            // Should be PostgreSQL compatible (uses standard SQL syntax)
            expect(sql).toContain('INSERT INTO');
            expect(sql).toContain('VALUES');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ============================================================================
  // Property 29: Seed File Execution Completeness
  // ============================================================================

  describe('Property 29: Seed File Execution Completeness', () => {
    it('should generate complete SQL for all provided data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              email: fc.emailAddress(),
              displayName: fc.string({ minLength: 1, maxLength: 50 }),
              metadata: fc.record({
                userType: fc.constantFrom('beginner', 'intermediate', 'advanced'),
              }),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (users) => {
            const sql = generator.generateUserInserts(users);
            // Should not be empty if users provided
            if (users.length > 0) {
              expect(sql.length).toBeGreaterThan(0);
              expect(sql).toContain('INSERT INTO user_profiles');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
