/**
 * Cognitive Graph Service ΓÇö LLM-backed graph mutations
 * 
 * Single LLM call that takes compact session data + current graph snapshot
 * and returns graph mutations. Uses the existing provider infrastructure
 * (queue, retry, cost-tracking) via the analysis provider routing.
 */

import { z } from 'zod'
import { COGNITIVE_GRAPH_PROMPT } from './graph.prompt'
import { compactGraph } from './compactify'
import { PROMPT_TEMPERATURES, LLM_CONFIG } from '@/lib/llm/config'
import { llmQueue } from '@/lib/llm/queue'
import { validateWithRetry } from '@/lib/llm/call'
import { costTracker } from '@/lib/llm/cost-tracker'
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import type {
    AssessmentSnapshot,
    UserPersona,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
} from '@/lib/llm/types'
import type { CognitiveGraph, GraphMutationResult } from './types'

// ΓöÇΓöÇΓöÇ Zod Schema for LLM output validation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const MutationSchema = z.object({
    mutations: z.array(z.object({
        type: z.enum([
            'add_node', 'update_node', 'solidify', 'reconsider',
            'double_down', 'fall_back', 'revise',
            'add_edge', 'update_edge', 'remove_edge'
        ]),
        nodeId: z.string().optional(),
        node: z.object({
            type: z.enum(['opinion', 'observation', 'hypothesis', 'trait', 'strength', 'gap']).optional(),
            label: z.string().optional(),
            detail: z.string().optional(),
            confidence: z.number().min(0).max(1).optional(),
            domain: z.string().optional(),
        }).optional(),
        edgeId: z.string().optional(),
        edge: z.object({
            source: z.string().optional(),
            target: z.string().optional(),
            relation: z.enum(['supports', 'contradicts', 'depends_on', 'evolves_into', 'related_to']).optional(),
            weight: z.number().min(0).max(1).optional(),
            evidence: z.string().optional(),
        }).optional(),
        reason: z.string(),
        newEvidence: z.array(z.string()).optional(),
        confidenceDelta: z.number().optional(),
    })),
    summary: z.string(),
})

// ΓöÇΓöÇΓöÇ Service ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export class CognitiveGraphService {
    private model: GenerativeModel | null = null

    private initialize() {
        if (this.model) return

        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new Error('GEMINI_API_KEY is required for CognitiveGraphService')

        const genAI = new GoogleGenerativeAI(apiKey)
        this.model = genAI.getGenerativeModel({
            model: LLM_CONFIG.model,
            generationConfig: {
                ...LLM_CONFIG.generationConfig,
                // Tighter budget for graph mutations ΓÇö we want concise structured output
                maxOutputTokens: 4096,
                temperature: 0.3, // Low creativity, high precision
            },
        })
    }

    /**
     * Generate graph mutations from session results.
     * Single LLM call ΓÇö all graph reasoning happens here.
     */
    async generateMutations(
        sessionId: string,
        state: AssessmentSnapshot,
        insights: InvestigativeInsight[],
        profile: CognitiveBehavioralProfile,
        report: InvestigativeReport,
        existingPersona: Partial<UserPersona> | null,
        currentGraph: CognitiveGraph | null,
        assessmentId?: string,
    ): Promise<GraphMutationResult> {
        this.initialize()

        const prompt = COGNITIVE_GRAPH_PROMPT.template({
            state,
            insights,
            profile,
            report,
            existingPersona,
            currentGraph: compactGraph(currentGraph),
            sessionId,
        })

        const startTime = Date.now()
        let attemptCount = 0
        let parseSuccess = true
        let inputTokens: number | undefined
        let outputTokens: number | undefined

        return llmQueue.enqueue(async () => {
            try {
                const result: GraphMutationResult = await validateWithRetry<GraphMutationResult>(
                    async () => {
                        attemptCount++
                        const genResult = await this.model!.generateContent({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: {
                                ...LLM_CONFIG.generationConfig,
                                maxOutputTokens: 4096,
                                temperature: 0.3,
                            },
                        })

                        const usage = genResult.response.usageMetadata
                        if (usage) {
                            inputTokens = usage.promptTokenCount
                            outputTokens = usage.candidatesTokenCount
                        }

                        return genResult.response.text()
                    },
                    MutationSchema as any,
                    {
                        label: 'cognitive_graph_mutations',
                        maxRetries: 1,
                    }
                )
                return result
            } catch (error) {
                parseSuccess = false
                throw error
            } finally {
                // Fire-and-forget cost logging
                const durationMs = Date.now() - startTime
                if (assessmentId) {
                    costTracker.logCall({
                        assessmentId,
                        promptType: 'cognitive_graph',
                        inputTokens: inputTokens || 0,
                        outputTokens: outputTokens || 0,
                        totalTokens: (inputTokens || 0) + (outputTokens || 0),
                        model: LLM_CONFIG.model,
                        durationMs,
                        parseSuccess,
                        attemptCount,
                    }).catch(() => {/* swallow */ })
                }
            }
        }, 7) // Low priority ΓÇö runs after main report
    }
}

export const cognitiveGraphService = new CognitiveGraphService()