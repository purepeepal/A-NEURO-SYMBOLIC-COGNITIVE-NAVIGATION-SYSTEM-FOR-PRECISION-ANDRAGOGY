import { TelemetryRepository, TelemetryRecord, LLMCallLog } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseTelemetryRepo implements TelemetryRepository {
    async logBiometrics(telemetryRecord: TelemetryRecord): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('biometric_telemetry_buffer')
            .insert({
                session_id: telemetryRecord.session_id,
                event_type: telemetryRecord.event_type,
                payload: telemetryRecord.payload,
            });

        // Non-blocking sideband — log error but don't throw
        if (error) console.error('[Telemetry] Failed to write biometrics:', error.message);
    }

    async saveAnalytics(sessionId: string, analytics: Record<string, unknown>): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('session_analytics')
            .upsert({
                session_id: sessionId,
                ...analytics,
            }, { onConflict: 'session_id' });

        if (error) throw new Error(`Failed to save analytics: ${error.message}`);
    }

    async logLLMCall(logRecord: LLMCallLog): Promise<void> {
        try {
            const supabase = await createClient();
            // Fire and forget — don't block the request pipeline
            await supabase.from('llm_call_logs').insert({
                session_id: logRecord.session_id,
                user_id: logRecord.user_id,
                provider: logRecord.provider,
                model: logRecord.model,
                call_type: logRecord.call_type,
                prompt_tokens: logRecord.prompt_tokens,
                completion_tokens: logRecord.completion_tokens,
                total_tokens: logRecord.total_tokens,
                latency_ms: logRecord.latency_ms,
                success: logRecord.success,
                error_message: logRecord.error_message,
            });
        } catch (err) {
            // Non-blocking — LLM logging should never crash the main flow
            console.error('[Telemetry] LLM call log failed:', err);
        }
    }
}
