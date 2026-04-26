// ─── KG Enrichment ──────────────────────────────────────────────────
// Tags LLM-generated content and merges it with the seeded KG graph.

import type { KGNode, KGEdge, CurriculumGraphData, ContentSource } from './types'

/**
 * Merge assessment-discovered concepts with a KG subgraph.
 * - Existing KG nodes are tagged as 'seed'
 * - New concepts found by the LLM are tagged as 'llm-generated'
 */
export function enrichGraphWithAssessmentResults(
    kgGraph: CurriculumGraphData,
    assessedConcepts: { name: string; accuracy: number; questionsAsked: number }[],
    parentNodeId?: string
): CurriculumGraphData {
    const existingIds = new Set(kgGraph.nodes.map(n => n.id))
    const enrichedNodes = [...kgGraph.nodes]
    const enrichedEdges = [...kgGraph.edges]
    let llmNodeCounter = 0

    for (const concept of assessedConcepts) {
        // Check if this concept already exists in the KG by label match
        const existingNode = kgGraph.nodes.find(
            n => n.label.toLowerCase() === concept.name.toLowerCase()
        )

        if (!existingNode) {
            // This is an LLM-discovered concept — not in the seed KG
            llmNodeCounter++
            const newNode: KGNode = {
                id: `llm_${concept.name.replace(/\s+/g, '_').toLowerCase()}_${llmNodeCounter}`,
                label: concept.name,
                type: 'concept',
                source: 'llm-generated' as ContentSource,
            }
            enrichedNodes.push(newNode)

            // Connect to the parent if provided
            if (parentNodeId && existingIds.has(parentNodeId)) {
                enrichedEdges.push({
                    id: `llm_edge_${llmNodeCounter}`,
                    sourceId: parentNodeId,
                    targetId: newNode.id,
                    relation: 'contains',
                    source: 'llm-generated' as ContentSource,
                })
            }
        }
    }

    return {
        nodes: enrichedNodes,
        edges: enrichedEdges,
        metadata: {
            ...kgGraph.metadata,
            nodeCount: enrichedNodes.length,
            edgeCount: enrichedEdges.length,
        },
    }
}

/**
 * Build a knowledge tree for the report that merges KG structure
 * with assessment performance data.
 */
export function buildEnrichedKnowledgeTree(
    kgNodes: KGNode[],
    kgEdges: KGEdge[],
    conceptPerformance: Map<string, { correctCount: number; questionsAsked: number; accuracy: number }>
): { nodes: any[]; edges: any[] } {
    const nodes = kgNodes.map((kgNode, i) => {
        // Try to match performance data by label
        const perf = conceptPerformance.get(kgNode.label) ||
            conceptPerformance.get(kgNode.label.toLowerCase())

        let mastery = 'untested'
        let accuracy = 0
        if (perf && perf.questionsAsked > 0) {
            accuracy = perf.correctCount / perf.questionsAsked
            if (accuracy >= 0.8) mastery = 'mastered'
            else if (accuracy >= 0.5) mastery = 'partial'
            else mastery = 'gap'
        }

        return {
            id: kgNode.id,
            position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 140 },
            data: {
                label: kgNode.label,
                mastery,
                questionsAsked: perf?.questionsAsked || 0,
                accuracy: Math.round(accuracy * 100),
                source: kgNode.source,
                type: kgNode.type,
            },
            type: 'conceptNode',
        }
    })

    const edges = kgEdges
        .filter(e => {
            const sourceExists = nodes.find(n => n.id === e.sourceId)
            const targetExists = nodes.find(n => n.id === e.targetId)
            return sourceExists && targetExists
        })
        .map(e => ({
            id: e.id,
            source: e.sourceId,
            target: e.targetId,
            animated: e.relation === 'prerequisite',
            label: e.relation !== 'contains' ? e.relation.replace('_', ' ') : undefined,
            style: {
                stroke: e.source === 'llm-generated' ? '#eab308' : '#94a3b8',
                strokeWidth: e.relation === 'prerequisite' ? 2.5 : 1.5,
                strokeDasharray: e.relation === 'related_to' || e.relation === 'applies_to' ? '6 4' : undefined,
            },
        }))

    return { nodes, edges }
}
