/**
 * Dynamic Cognitive Graph Profiler
 * 
 * Manages the lifecycle of a user's cognitive graph across sessions.
 * Loads from Supabase, applies LLM-generated mutations, persists back.
 * 
 * State machine operations: solidify, change, reconsider, fall back, double down.
 * The graph never breaks ΓÇö it evolves. Old opinions are never deleted, only
 * transitioned to new states with full audit trails.
 */

import { createClient } from '@/lib/supabase/server'
import { cognitiveGraphService } from './graph.service'
import { createLogger } from '@/lib/core/logger'
import type {
    CognitiveGraph,
    CognitiveNode,
    CognitiveEdge,
    CognitiveGraphMutation,
    CognitiveNodeState,
    GraphMutationResult,
    StateTransition,
} from './types'
import type {
    AssessmentSnapshot,
    UserPersona,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    InvestigativeReport,
} from '@/lib/llm/types'

const logger = createLogger({ requestId: 'cognitive-graph' })

export class DynamicCognitiveGraphProfiler {
    private graph: CognitiveGraph
    private userId: string | null = null

    constructor() {
        this.graph = this.createEmptyGraph()
    }

    // ΓöÇΓöÇΓöÇ Lifecycle ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    /**
     * Load the user's cognitive graph from Supabase, or create a new one.
     */
    async loadOrCreate(userId: string): Promise<void> {
        this.userId = userId
        try {
            const supabase = await createClient()
            const { data, error } = await supabase
                .from('cognitive_graphs')
                .select('graph_data')
                .eq('user_id', userId)
                .single()

            if (data?.graph_data && !error) {
                this.graph = data.graph_data as unknown as CognitiveGraph
                logger.info(`[CognitiveGraph] Loaded graph for user ${userId}: ${this.graph.nodes.length} nodes, ${this.graph.edges.length} edges`)
            } else {
                this.graph = this.createEmptyGraph()
                logger.info(`[CognitiveGraph] Created new graph for user ${userId}`)
            }
        } catch (err) {
            logger.warn('[CognitiveGraph] Failed to load graph, starting fresh:', { detail: String(err) })
            this.graph = this.createEmptyGraph()
        }
    }

    /**
     * Ingest session results by running a single LLM call for graph mutations,
     * then applying them to the local graph.
     */
    async ingestSessionResults(
        sessionId: string,
        assessmentId: string,
        state: AssessmentSnapshot,
        insights: InvestigativeInsight[],
        profile: CognitiveBehavioralProfile,
        report: InvestigativeReport,
        existingPersona: Partial<UserPersona> | null,
    ): Promise<GraphMutationResult | null> {
        try {
            const result = await cognitiveGraphService.generateMutations(
                sessionId,
                state,
                insights,
                profile,
                report,
                existingPersona,
                this.graph,
                assessmentId,
            )

            if (result?.mutations?.length) {
                this.applyMutations(result.mutations, sessionId)
                // Update meta
                this.graph.meta.sessionCount++
                this.graph.meta.lastSessionId = sessionId
                this.graph.meta.lastSessionTopic = state.topic
                this.graph.meta.graphVersion++
                this.graph.meta.lastUpdated = new Date().toISOString()

                logger.info(`[CognitiveGraph] Applied ${result.mutations.length} mutations: ${result.summary}`)
            }

            return result
        } catch (err) {
            logger.error('[CognitiveGraph] Failed to ingest session results:', err instanceof Error ? err : undefined)
            return null
        }
    }

    /**
     * Persist the graph to Supabase.
     */
    async save(): Promise<void> {
        if (!this.userId) {
            logger.warn('[CognitiveGraph] Cannot save: no userId set')
            return
        }

        try {
            const supabase = await createClient()
            await supabase
                .from('cognitive_graphs')
                .upsert({
                    user_id: this.userId,
                    graph_data: this.graph as any,
                    node_count: this.graph.nodes.length,
                    edge_count: this.graph.edges.length,
                    session_count: this.graph.meta.sessionCount,
                    last_session_id: this.graph.meta.lastSessionId,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })

            logger.info(`[CognitiveGraph] Saved graph for user ${this.userId}: ${this.graph.nodes.length} nodes`)
        } catch (err) {
            // Never crash the pipeline on graph save failure
            logger.error('[CognitiveGraph] Failed to save graph:', err instanceof Error ? err : undefined)
        }
    }

    /**
     * Get the current graph snapshot.
     */
    getSnapshot(): CognitiveGraph {
        return this.graph
    }

    // ΓöÇΓöÇΓöÇ Mutation Engine ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    private applyMutations(mutations: CognitiveGraphMutation[], sessionId: string): void {
        const now = new Date().toISOString()

        for (const mutation of mutations) {
            try {
                switch (mutation.type) {
                    case 'add_node':
                        this.addNode(mutation, now, sessionId)
                        break
                    case 'update_node':
                        this.updateNode(mutation, now, sessionId)
                        break
                    case 'solidify':
                        this.transitionNode(mutation.nodeId!, 'solidified', mutation.reason, now, sessionId, mutation.newEvidence)
                        break
                    case 'reconsider':
                        this.transitionNode(mutation.nodeId!, 'reconsidering', mutation.reason, now, sessionId, mutation.newEvidence)
                        break
                    case 'double_down':
                        this.transitionNode(mutation.nodeId!, 'doubled_down', mutation.reason, now, sessionId, mutation.newEvidence)
                        break
                    case 'fall_back':
                        this.transitionNode(mutation.nodeId!, 'fallen_back', mutation.reason, now, sessionId, mutation.newEvidence)
                        break
                    case 'revise':
                        this.reviseNode(mutation, now, sessionId)
                        break
                    case 'add_edge':
                        this.addEdge(mutation, now)
                        break
                    case 'update_edge':
                        this.updateEdge(mutation)
                        break
                    case 'remove_edge':
                        this.removeEdge(mutation.edgeId!)
                        break
                }
            } catch (err) {
                logger.warn(`[CognitiveGraph] Failed to apply mutation ${mutation.type}:`, { detail: String(err) })
            }
        }
    }

    private addNode(mutation: CognitiveGraphMutation, timestamp: string, sessionId: string): void {
        if (!mutation.nodeId || !mutation.node) return

        // Don't duplicate
        if (this.graph.nodes.find(n => n.id === mutation.nodeId)) {
            // Upgrade to update instead
            this.updateNode(mutation, timestamp, sessionId)
            return
        }

        const node: CognitiveNode = {
            id: mutation.nodeId,
            type: mutation.node.type || 'observation',
            label: mutation.node.label || 'Unnamed',
            detail: mutation.node.detail || '',
            confidence: mutation.node.confidence ?? 0.5,
            evidence: mutation.newEvidence || [],
            state: 'tentative',
            stateHistory: [{
                from: 'tentative' as CognitiveNodeState,
                to: 'tentative' as CognitiveNodeState,
                timestamp,
                trigger: `Created: ${mutation.reason}`,
                sessionId,
            }],
            domain: mutation.node.domain,
            createdAt: timestamp,
            lastUpdated: timestamp,
        }

        this.graph.nodes.push(node)
    }

    private updateNode(mutation: CognitiveGraphMutation, timestamp: string, sessionId: string): void {
        if (!mutation.nodeId) return
        const node = this.graph.nodes.find(n => n.id === mutation.nodeId)
        if (!node) return

        if (mutation.node?.label) node.label = mutation.node.label
        if (mutation.node?.detail) node.detail = mutation.node.detail
        if (mutation.node?.domain) node.domain = mutation.node.domain
        if (mutation.confidenceDelta != null) {
            node.confidence = Math.max(0, Math.min(1, node.confidence + mutation.confidenceDelta))
        } else if (mutation.node?.confidence != null) {
            node.confidence = mutation.node.confidence
        }
        if (mutation.newEvidence?.length) {
            node.evidence.push(...mutation.newEvidence)
        }
        node.lastUpdated = timestamp
    }

    private transitionNode(
        nodeId: string,
        toState: CognitiveNodeState,
        reason: string,
        timestamp: string,
        sessionId: string,
        newEvidence?: string[]
    ): void {
        const node = this.graph.nodes.find(n => n.id === nodeId)
        if (!node) return

        const transition: StateTransition = {
            from: node.state,
            to: toState,
            timestamp,
            trigger: reason,
            sessionId,
        }

        node.stateHistory.push(transition)
        node.state = toState
        node.lastUpdated = timestamp

        if (newEvidence?.length) {
            node.evidence.push(...newEvidence)
        }

        // Adjust confidence based on transition
        switch (toState) {
            case 'solidified':
                node.confidence = Math.max(node.confidence, 0.85)
                break
            case 'reconsidering':
                node.confidence = Math.min(node.confidence, 0.6)
                break
            case 'doubled_down':
                node.confidence = Math.min(1, node.confidence + 0.15)
                break
            case 'fallen_back':
                node.confidence = Math.max(0.2, node.confidence - 0.3)
                break
            case 'revised':
                node.confidence = 0.5 // Reset to neutral on revision
                break
        }
    }

    private reviseNode(mutation: CognitiveGraphMutation, timestamp: string, sessionId: string): void {
        if (!mutation.nodeId) return
        const node = this.graph.nodes.find(n => n.id === mutation.nodeId)
        if (!node) return

        // Record the transition
        this.transitionNode(mutation.nodeId, 'revised', mutation.reason, timestamp, sessionId, mutation.newEvidence)

        // Update content
        if (mutation.node?.label) node.label = mutation.node.label
        if (mutation.node?.detail) node.detail = mutation.node.detail
        if (mutation.node?.confidence != null) node.confidence = mutation.node.confidence
    }

    private addEdge(mutation: CognitiveGraphMutation, timestamp: string): void {
        if (!mutation.edge?.source || !mutation.edge?.target) return

        const edgeId = mutation.edgeId || `e-${mutation.edge.source}-${mutation.edge.target}-${Date.now()}`

        // Don't duplicate
        if (this.graph.edges.find(e => e.id === edgeId)) return

        const edge: CognitiveEdge = {
            id: edgeId,
            source: mutation.edge.source,
            target: mutation.edge.target,
            relation: mutation.edge.relation || 'related_to',
            weight: mutation.edge.weight ?? 0.5,
            evidence: mutation.edge.evidence,
        }

        this.graph.edges.push(edge)
    }

    private updateEdge(mutation: CognitiveGraphMutation): void {
        if (!mutation.edgeId) return
        const edge = this.graph.edges.find(e => e.id === mutation.edgeId)
        if (!edge) return

        if (mutation.edge?.relation) edge.relation = mutation.edge.relation
        if (mutation.edge?.weight != null) edge.weight = mutation.edge.weight
        if (mutation.edge?.evidence) edge.evidence = mutation.edge.evidence
    }

    private removeEdge(edgeId: string): void {
        this.graph.edges = this.graph.edges.filter(e => e.id !== edgeId)
    }

    // ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    private createEmptyGraph(): CognitiveGraph {
        return {
            nodes: [],
            edges: [],
            meta: {
                sessionCount: 0,
                lastSessionId: '',
                lastSessionTopic: '',
                graphVersion: 0,
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
            },
        }
    }
}