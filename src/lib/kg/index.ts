// ─── Curriculum Knowledge Graph — Barrel Export ─────────────────────
// Provides both server (Node.js) and edge-compatible access to the KG.

export type { CurriculumGraph } from './graphml-parser'
export { parseGraphMLString } from './graphml-parser'
export * from './types'
export { GraphRAGService, getGraphRAGService } from './graphrag-service'
export type { GraphRAGContext, GraphRAGQuestionContext, GraphRAGAssessmentPlan, HierarchyNode } from './graphrag-service'

import { CurriculumGraph, parseGraphMLString } from './graphml-parser'

// Module-level singleton — parsed once, cached for the lifetime of the server.
let _graph: CurriculumGraph | null = null

/**
 * Get the curriculum graph instance. 
 * 
 * In Node.js runtime (API routes), reads from the filesystem.
 * In Edge runtime, the graph must be pre-loaded via loadCurriculumGraphFromString().
 */
export function getCurriculumGraph(): CurriculumGraph {
    if (!_graph) {
        // Attempt Node.js file read (will fail gracefully in Edge)
        try {
            // Dynamic require to avoid bundling fs/path in Edge
            const fs = require('fs')
            const path = require('path')
            const graphmlPath = path.join(process.cwd(), 'public', 'data', 'cbse_classx_knowledge_graph_2025_26.graphml')
            const xml = fs.readFileSync(graphmlPath, 'utf-8')
            _graph = parseGraphMLString(xml)
        } catch {
            throw new Error(
                '[KG] Cannot load KG in Edge Runtime. Use loadCurriculumGraphFromString() or call from a Node.js API route.'
            )
        }
    }
    return _graph
}

/**
 * Load the KG from a pre-fetched XML string.
 * Use this in Edge-compatible contexts where fs is not available.
 */
export function loadCurriculumGraphFromString(xml: string): CurriculumGraph {
    _graph = parseGraphMLString(xml)
    return _graph
}

/**
 * Check if the graph is already loaded.
 */
export function isGraphLoaded(): boolean {
    return _graph !== null
}
