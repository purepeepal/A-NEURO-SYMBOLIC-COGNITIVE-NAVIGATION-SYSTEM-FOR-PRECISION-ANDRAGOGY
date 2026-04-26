/**
 * LLM Cost Tracker
 * 
 * Logs every LLM call to the `llm_call_logs` table for cost analysis,
 * performance monitoring, and parse success rate tracking.
 */
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'cost-tracker' })

export interface LLMCallLog {
    assessmentId?: string | null
    promptType: string
    inputTokens?: number | null
    outputTokens?: number | null
    totalTokens?: number | null
    model: string
    durationMs: number
    parseSuccess: boolean
    attemptCount?: number
}

export interface SessionCostSummary {
    totalCalls: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    firstPassParseRate: number
    avgDurationMs: number
    estimatedCostUsd: number
}

export interface GlobalCostStats {
    totalSessions: number
    avgCallsPerSession: number
    avgTokensPerSession: number
    avgCostPerSession: number
    parseSuccessRate: number
    promptTypeBreakdown: Record<string, { count: number; avgTokens: number; parseRate: number }>
}

// Gemini pricing (per 1M tokens, as of 2025)
const GEMINI_PRICING = {
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    default: { input: 0.10, output: 0.40 },
} as const

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = (GEMINI_PRICING as Record<string, { input: number; output: number }>)[model] || GEMINI_PRICING.default
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

class CostTracker {
    /**
     * Log an LLM call to the database.
     * Fire-and-forget — errors are logged but don't block the caller.
     */
    async logCall(log: LLMCallLog): Promise<void> {
        try {
            const supabase = await createClient()
            const { error } = await supabase
                .from('llm_call_logs')
                .insert({
                    assessment_id: log.assessmentId || null,
                    prompt_type: log.promptType,
                    input_tokens: log.inputTokens ?? null,
                    output_tokens: log.outputTokens ?? null,
                    total_tokens: log.totalTokens ?? null,
                    model: log.model,
                    duration_ms: log.durationMs,
                    parse_success: log.parseSuccess,
                    attempt_count: log.attemptCount ?? 1,
                })

            if (error) {
                logger.warn('[CostTracker] Failed to log LLM call:', { detail: error.message })
            }
        } catch (err) {
            // Never block the caller
            logger.warn('[CostTracker] Unexpected error logging LLM call:', { detail: String(err) })
        }
    }

    /**
     * Get cost summary for a specific assessment session.
     */
    async getSessionCost(assessmentId: string): Promise<SessionCostSummary> {
        const supabase = await createClient()
        const { data: logs, error } = await supabase
            .from('llm_call_logs')
            .select('input_tokens, output_tokens, total_tokens, duration_ms, parse_success, model')
            .eq('assessment_id', assessmentId)

        if (error || !logs) {
            logger.warn('[CostTracker] Failed to fetch session costs:', { detail: error?.message ?? 'unknown' })
            return {
                totalCalls: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalTokens: 0,
                firstPassParseRate: 0,
                avgDurationMs: 0,
                estimatedCostUsd: 0,
            }
        }

        const totalCalls = logs.length
        const totalInputTokens = logs.reduce((sum, l) => sum + (l.input_tokens || 0), 0)
        const totalOutputTokens = logs.reduce((sum, l) => sum + (l.output_tokens || 0), 0)
        const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0)
        const parsedCount = logs.filter(l => l.parse_success).length
        const totalDuration = logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0)

        // Estimate cost using the model from the first log entry
        const model = logs[0]?.model || 'default'
        const costUsd = estimateCost(model, totalInputTokens, totalOutputTokens)

        return {
            totalCalls,
            totalInputTokens,
            totalOutputTokens,
            totalTokens,
            firstPassParseRate: totalCalls > 0 ? parsedCount / totalCalls : 0,
            avgDurationMs: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
            estimatedCostUsd: costUsd,
        }
    }

    /**
     * Get aggregate cost statistics across all sessions.
     */
    async getGlobalStats(): Promise<GlobalCostStats> {
        const supabase = await createClient()
        const { data: logs, error } = await supabase
            .from('llm_call_logs')
            .select('assessment_id, prompt_type, input_tokens, output_tokens, total_tokens, parse_success, model')

        if (error || !logs) {
            logger.warn('[CostTracker] Failed to fetch global stats:', { detail: error?.message ?? 'unknown' })
            return {
                totalSessions: 0,
                avgCallsPerSession: 0,
                avgTokensPerSession: 0,
                avgCostPerSession: 0,
                parseSuccessRate: 0,
                promptTypeBreakdown: {},
            }
        }

        // Group by assessment
        const sessionMap = new Map<string, typeof logs>()
        for (const log of logs) {
            const key = log.assessment_id || 'untracked'
            if (!sessionMap.has(key)) sessionMap.set(key, [])
            sessionMap.get(key)!.push(log)
        }

        const totalSessions = sessionMap.size
        const totalCalls = logs.length
        const totalTokens = logs.reduce((sum, l) => sum + (l.total_tokens || 0), 0)
        const parsedCount = logs.filter(l => l.parse_success).length

        // Per-session cost
        let totalCostUsd = 0
        for (const sessionLogs of sessionMap.values()) {
            const model = sessionLogs[0]?.model || 'default'
            const inTokens = sessionLogs.reduce((s, l) => s + (l.input_tokens || 0), 0)
            const outTokens = sessionLogs.reduce((s, l) => s + (l.output_tokens || 0), 0)
            totalCostUsd += estimateCost(model, inTokens, outTokens)
        }

        // Prompt type breakdown
        const promptTypeMap = new Map<string, { count: number; totalTokens: number; parsed: number }>()
        for (const log of logs) {
            const key = log.prompt_type
            if (!promptTypeMap.has(key)) promptTypeMap.set(key, { count: 0, totalTokens: 0, parsed: 0 })
            const entry = promptTypeMap.get(key)!
            entry.count++
            entry.totalTokens += log.total_tokens || 0
            if (log.parse_success) entry.parsed++
        }

        const promptTypeBreakdown: Record<string, { count: number; avgTokens: number; parseRate: number }> = {}
        for (const [type, data] of promptTypeMap) {
            promptTypeBreakdown[type] = {
                count: data.count,
                avgTokens: data.count > 0 ? Math.round(data.totalTokens / data.count) : 0,
                parseRate: data.count > 0 ? data.parsed / data.count : 0,
            }
        }

        return {
            totalSessions,
            avgCallsPerSession: totalSessions > 0 ? Math.round(totalCalls / totalSessions) : 0,
            avgTokensPerSession: totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0,
            avgCostPerSession: totalSessions > 0 ? totalCostUsd / totalSessions : 0,
            parseSuccessRate: totalCalls > 0 ? parsedCount / totalCalls : 0,
            promptTypeBreakdown,
        }
    }
}

export const costTracker = new CostTracker()
