/**
 * Cognitive Graph Types ΓÇö Dynamic Graph Profiler
 * 
 * A graph that evolves across sessions. Each node represents a cognitive opinion
 * (trait, strength, gap, hypothesis) with confidence and state that can solidify,
 * change, reconsider, fall back, or double down based on new evidence.
 */

// ΓöÇΓöÇΓöÇ Node States (State Machine) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// tentative ΓåÆ solidified    (evidence accumulates, confidence > 0.8)
// tentative ΓåÆ revised       (contradicting evidence appears)
// solidified ΓåÆ reconsidering (new contradicting session data)
// reconsidering ΓåÆ doubled_down (re-confirmed after reconsideration)
// reconsidering ΓåÆ fallen_back  (original opinion was wrong, revert)
// reconsidering ΓåÆ revised       (change to new position)
export type CognitiveNodeState =
    | 'tentative'
    | 'solidified'
    | 'reconsidering'
    | 'revised'
    | 'doubled_down'
    | 'fallen_back'

export type CognitiveNodeType =
    | 'opinion'       // General cognitive opinion about the learner
    | 'observation'   // Direct observation from session data
    | 'hypothesis'    // Untested theory about cognitive behavior
    | 'trait'         // Identified cognitive trait (thinkingStyle, reasoning, etc.)
    | 'strength'      // Confirmed area of strength
    | 'gap'           // Confirmed knowledge or cognitive gap

export type CognitiveEdgeRelation =
    | 'supports'       // Node A provides evidence for Node B
    | 'contradicts'    // Node A provides counter-evidence to Node B
    | 'depends_on'     // Node A depends on Node B being true
    | 'evolves_into'   // Node A evolved into Node B over time
    | 'related_to'     // General relationship

// ΓöÇΓöÇΓöÇ Core Graph Structures ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface StateTransition {
    from: CognitiveNodeState
    to: CognitiveNodeState
    timestamp: string
    trigger: string        // What caused the transition (e.g., "session_abc: contradicting evidence")
    sessionId?: string
}

export interface CognitiveNode {
    id: string
    type: CognitiveNodeType
    label: string
    detail: string                    // Detailed description of the opinion/observation
    confidence: number                // 0-1, evolves over time
    evidence: string[]                // Grows as sessions add data
    state: CognitiveNodeState
    stateHistory: StateTransition[]   // Full audit trail
    domain?: string                   // e.g., "error_patterns", "learning_style", "knowledge_topology"
    createdAt: string
    lastUpdated: string
}

export interface CognitiveEdge {
    id: string
    source: string                    // Node ID
    target: string                    // Node ID
    relation: CognitiveEdgeRelation
    weight: number                    // 0-1, strength of relationship
    evidence?: string                 // Why this edge exists
}

export interface CognitiveGraphMeta {
    sessionCount: number
    lastSessionId: string
    lastSessionTopic: string
    graphVersion: number
    createdAt: string
    lastUpdated: string
}

export interface CognitiveGraph {
    nodes: CognitiveNode[]
    edges: CognitiveEdge[]
    meta: CognitiveGraphMeta
}

// ΓöÇΓöÇΓöÇ Mutation Types (LLM Output) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type MutationType =
    | 'add_node'
    | 'update_node'
    | 'solidify'         // tentative ΓåÆ solidified
    | 'reconsider'       // solidified ΓåÆ reconsidering
    | 'double_down'      // reconsidering ΓåÆ doubled_down
    | 'fall_back'        // reconsidering ΓåÆ fallen_back
    | 'revise'           // any ΓåÆ revised (with new label/detail)
    | 'add_edge'
    | 'update_edge'
    | 'remove_edge'

export interface CognitiveGraphMutation {
    type: MutationType
    nodeId?: string
    node?: Partial<CognitiveNode>     // For add_node / update_node / revise
    edgeId?: string
    edge?: Partial<CognitiveEdge>     // For add_edge / update_edge
    reason: string                     // Why this mutation is being applied
    newEvidence?: string[]             // Evidence supporting this mutation
    confidenceDelta?: number           // How much to adjust confidence (-1 to +1)
}

export interface GraphMutationResult {
    mutations: CognitiveGraphMutation[]
    summary: string                    // One-sentence summary of what changed
}

// ΓöÇΓöÇΓöÇ Compact Types (for prompt injection) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface CompactGraphSnapshot {
    nodeCount: number
    nodes: Array<{
        id: string
        type: CognitiveNodeType
        label: string
        confidence: number
        state: CognitiveNodeState
        domain?: string
    }>
    edges: Array<{
        source: string
        target: string
        relation: CognitiveEdgeRelation
    }>
    recentTransitions: Array<{
        nodeLabel: string
        from: CognitiveNodeState
        to: CognitiveNodeState
        trigger: string
    }>
}