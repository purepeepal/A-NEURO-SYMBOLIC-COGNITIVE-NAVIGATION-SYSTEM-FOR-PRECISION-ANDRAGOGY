// src/lib/api/di.ts
// Dependency Injection Container for the API Routes
// Wires Unit 5 (Repos) + Unit 4 (LLM) → Unit 3 (Engine)

import { AssessmentEngine } from '@/lib/domain/assessment';
import { SupabaseSessionRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseSessionRepo';
import { SupabaseProfileRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseProfileRepo';
import { SupabaseContentRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseContentRepo';
import { SupabaseTelemetryRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseTelemetryRepo';
import { SupabaseKnowledgeRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseKnowledgeRepo';
import { GeminiLLMService, GroqLLMService } from '@/lib/llm';
import { LLM_CONFIG } from '@/lib/llm/config';

let engineInstance: AssessmentEngine | null = null;

/**
 * Factory function that creates and caches the AssessmentEngine singleton.
 * Configures LLM provider based on environment variable LLM_PROVIDER.
 */
export function getAssessmentEngine(): AssessmentEngine {
    if (!engineInstance) {
        // Select LLM provider based on config
        const llmService = LLM_CONFIG.provider === 'gemini'
            ? new GeminiLLMService()
            : new GroqLLMService();

        engineInstance = new AssessmentEngine(
            new SupabaseSessionRepo(),
            new SupabaseProfileRepo(),
            new SupabaseContentRepo(),
            new SupabaseTelemetryRepo(),
            new SupabaseKnowledgeRepo(),
            llmService,
        );
    }
    return engineInstance;
}

/**
 * Reset the cached engine (useful for testing or config changes)
 */
export function resetAssessmentEngine(): void {
    engineInstance = null;
}
