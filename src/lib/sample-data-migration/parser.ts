/**
 * Configuration Parser for Sample Data Migration
 * Parses and validates YAML/JSON configuration files
 */

import * as YAML from 'yaml';
import { SampleDataConfig, ParseResult } from './types';

const DEFAULT_CONFIG: Partial<SampleDataConfig> = {
  version: '1.0',
  generation: {
    numUsers: 5,
    sessionsPerUser: 3,
    responsesPerSession: 10,
    knowledgeGapsPerUser: 2,
    feedbackPerUser: 2,
    llmLogsPerSession: 5,
  },
};

export class ConfigurationParser {
  /**
   * Parse configuration from YAML or JSON string
   */
  parse(content: string): ParseResult {
    try {
      const errors: string[] = [];
      
      // Try to parse as JSON first, then YAML
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        // If JSON parsing fails, try YAML
        parsed = YAML.parse(content);
      }

      if (!parsed || typeof parsed !== 'object') {
        return {
          success: false,
          errors: ['Configuration must be a valid object'],
        };
      }

      const config = parsed as Record<string, unknown>;

      // Validate required fields
      if (!config.generation) {
        errors.push('Missing required field: generation');
      }

      if (!config.seedFilePath) {
        errors.push('Missing required field: seedFilePath');
      }

      // Validate generation object
      if (config.generation && typeof config.generation === 'object') {
        const gen = config.generation as Record<string, unknown>;
        
        const requiredFields = [
          'numUsers',
          'sessionsPerUser',
          'responsesPerSession',
          'knowledgeGapsPerUser',
          'feedbackPerUser',
          'llmLogsPerSession',
        ];

        for (const field of requiredFields) {
          if (!(field in gen)) {
            errors.push(`Missing required field: generation.${field}`);
          } else if (typeof gen[field] !== 'number') {
            errors.push(`Invalid type for generation.${field}: expected number, got ${typeof gen[field]}`);
          } else if ((gen[field] as number) < 1) {
            errors.push(`Invalid value for generation.${field}: must be >= 1, got ${gen[field]}`);
          }
        }
      }

      // Validate userDefaults if present
      if (config.userDefaults && typeof config.userDefaults === 'object') {
        const userDefaults = config.userDefaults as Record<string, unknown>;
        
        if (userDefaults.emailDomain && typeof userDefaults.emailDomain === 'string') {
          if (userDefaults.emailDomain.includes(' ')) {
            errors.push(`Invalid email domain format: '${userDefaults.emailDomain}' (must not contain spaces)`);
          }
        }
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Apply defaults and return config
      const finalConfig: SampleDataConfig = {
        version: (config.version as string) || DEFAULT_CONFIG.version!,
        generation: {
          numUsers: (config.generation as any).numUsers,
          sessionsPerUser: (config.generation as any).sessionsPerUser,
          responsesPerSession: (config.generation as any).responsesPerSession,
          knowledgeGapsPerUser: (config.generation as any).knowledgeGapsPerUser,
          feedbackPerUser: (config.generation as any).feedbackPerUser,
          llmLogsPerSession: (config.generation as any).llmLogsPerSession,
        },
        userDefaults: config.userDefaults as any,
        seedFilePath: config.seedFilePath as string,
      };

      return { success: true, config: finalConfig };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse configuration: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Pretty print configuration to YAML format
   */
  prettyPrint(config: SampleDataConfig): string {
    const obj = {
      version: config.version,
      generation: config.generation,
      ...(config.userDefaults && { userDefaults: config.userDefaults }),
      seedFilePath: config.seedFilePath,
    };

    return YAML.stringify(obj, { indent: 2 });
  }
}
