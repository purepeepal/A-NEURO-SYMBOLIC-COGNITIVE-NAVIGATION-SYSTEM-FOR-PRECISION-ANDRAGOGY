/**
 * Cognitive Graph Module ΓÇö Barrel File
 * 
 * Isolated module for the Dynamic Cognitive Graph Profiler.
 * Only dependency on existing build: LLM provider infrastructure and Supabase client.
 */

// Core profiler
export { DynamicCognitiveGraphProfiler } from './profiler'

// Service (LLM-backed graph mutations)
export { cognitiveGraphService } from './graph.service'

// Compact utilities (token optimization)
export {
    compactPersona,
    compactInsights,
    compactProfile,
    compactPatterns,
    compactAnomalies,
    compactGraph,
    compactGraphToString,
} from './compactify'

// Types
export type {
    CognitiveGraph,
    CognitiveNode,
    CognitiveEdge,
    CognitiveGraphMutation,
    CognitiveNodeState,
    CognitiveNodeType,
    CognitiveEdgeRelation,
    GraphMutationResult,
    CompactGraphSnapshot,
    StateTransition,
    CognitiveGraphMeta,
    MutationType,
} from './types'