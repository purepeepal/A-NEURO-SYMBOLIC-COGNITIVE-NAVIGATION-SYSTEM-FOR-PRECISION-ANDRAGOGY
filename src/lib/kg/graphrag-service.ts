// ─── GraphRAG Service ────────────────────────────────────────────────
// Wraps CurriculumGraph with retrieval-augmented generation logic.
// Provides KG-backed context for question generation, prerequisite
// mapping, and assessment orchestration. LLM-generated content is
// always tagged and the KG seed data retains priority.

import type {
    KGNode, KGEdge, CurriculumGraphData, ContentSource,
    NodeType, EdgeRelation, KGNodeDetailResponse
} from './types'
import { CurriculumGraph } from './graphml-parser'

// ─── Types ──────────────────────────────────────────────────────────

export interface GraphRAGContext {
    /** The matched node in the KG (if found) */
    matchedNode: KGNode | null
    /** Breadcrumb path from root to the matched node */
    ancestorPath: KGNode[]
    /** Direct prerequisite concepts (ordered by weight) */
    prerequisites: { node: KGNode; weight: number; rationale?: string }[]
    /** Related concepts via cross-links */
    related: { node: KGNode; relation: EdgeRelation; weight: number; rationale?: string }[]
    /** All testable concept-level descendants */
    assessableConcepts: KGNode[]
    /** Siblings (same parent) for lateral context */
    siblings: KGNode[]
    /** The subject subgraph summary */
    subjectContext: { name: string; chapterCount: number; conceptCount: number } | null
    /** Whether this context came from KG seed or was synthesized */
    source: 'kg-seed' | 'kg-augmented' | 'llm-only'
}

export interface GraphRAGQuestionContext {
    concept: string
    conceptNote?: string
    prerequisites: string[]
    relatedTopics: string[]
    ancestorChain: string
    subjectArea: string
    source: ContentSource
    /** Structured prompt context for the LLM */
    promptSnippet: string
}

export interface GraphRAGAssessmentPlan {
    topic: string
    kgNodeId?: string
    concepts: {
        name: string
        nodeId: string
        difficulty: number
        prerequisites: string[]
        source: ContentSource
        note?: string
    }[]
    suggestedOrder: string[]  // concept names in recommended assessment order
    totalConcepts: number
    sourceBreakdown: { seed: number; llmGenerated: number }
}

export interface EnrichmentResult {
    node: KGNode
    edge: KGEdge
    isNew: boolean
}

// ─── GraphRAG Service Class ─────────────────────────────────────────

export class GraphRAGService {
    private graph: CurriculumGraph
    /** In-memory buffer for LLM-generated nodes added during this session */
    private llmNodes: Map<string, KGNode> = new Map()
    private llmEdges: KGEdge[] = []
    private llmNodeCounter = 0

    constructor(graph: CurriculumGraph) {
        this.graph = graph
    }

    // ── Context Retrieval ──────────────────────────────────────────────

    /**
     * Retrieve full GraphRAG context for a topic string.
     * This is the primary entry point for assessment integration.
     */
    getContext(topic: string): GraphRAGContext {
        const match = this.graph.findMatchingNode(topic)

        if (!match) {
            return {
                matchedNode: null,
                ancestorPath: [],
                prerequisites: [],
                related: [],
                assessableConcepts: [],
                siblings: [],
                subjectContext: null,
                source: 'llm-only',
            }
        }

        const ancestors = this.graph.getAncestors(match.id)
        const prerequisites = this.graph.getPrerequisites(match.id)
        const related = this.graph.getRelated(match.id)
        const concepts = this.graph.getConceptsForAssessment(match.id)

        // Get siblings (other children of same parent)
        const parent = this.graph.getParentOf(match.id)
        const siblings = parent
            ? this.graph.getChildrenOf(parent.id).filter(c => c.id !== match.id)
            : []

        // Subject context
        const subjectNode = ancestors.find(a => a.type === 'subject')
        let subjectContext = null
        if (subjectNode) {
            const subgraph = this.graph.getSubgraph(subjectNode.id)
            subjectContext = {
                name: subjectNode.label,
                chapterCount: subgraph.nodes.filter(n => n.type === 'chapter').length,
                conceptCount: subgraph.nodes.filter(n => n.type === 'concept').length,
            }
        }

        return {
            matchedNode: match,
            ancestorPath: ancestors,
            prerequisites,
            related,
            assessableConcepts: concepts,
            siblings,
            subjectContext,
            source: match.source === 'llm-generated' ? 'kg-augmented' : 'kg-seed',
        }
    }

    // ── Question Generation Context ────────────────────────────────────

    /**
     * Build enriched context for a single concept to feed into the
     * question generation LLM prompt. Includes prerequisite chain,
     * related topics, and hierarchical context.
     */
    getQuestionContext(conceptNameOrId: string): GraphRAGQuestionContext | null {
        const node = this.graph.getNodeById(conceptNameOrId)
            || this.graph.findMatchingNode(conceptNameOrId)

        if (!node) return null

        const ancestors = this.graph.getAncestors(node.id)
        const prereqs = this.graph.getPrerequisites(node.id)
        const related = this.graph.getRelated(node.id)
        const subjectNode = ancestors.find(a => a.type === 'subject')

        const ancestorChain = [...ancestors].reverse().map(a => a.label).join(' → ')

        const promptSnippet = this.buildPromptSnippet(node, ancestors, prereqs, related)

        return {
            concept: node.label,
            conceptNote: node.note,
            prerequisites: prereqs.map(p => p.node.label),
            relatedTopics: related.map(r => r.node.label),
            ancestorChain,
            subjectArea: subjectNode?.label || 'General',
            source: node.source,
            promptSnippet,
        }
    }

    /**
     * Build a structured prompt snippet that provides KG-grounded context
     * to the LLM for neuro-symbolic question generation.
     */
    private buildPromptSnippet(
        node: KGNode,
        ancestors: KGNode[],
        prereqs: { node: KGNode; weight: number; rationale?: string }[],
        related: { node: KGNode; relation: EdgeRelation; weight: number; rationale?: string }[]
    ): string {
        const lines: string[] = [
            `[CURRICULUM CONTEXT FROM KNOWLEDGE GRAPH]`,
            `Topic: ${node.label} (${node.type})`,
            `Subject: ${ancestors.find(a => a.type === 'subject')?.label || 'N/A'}`,
            `Hierarchy: ${[...ancestors].reverse().map(a => a.label).join(' → ')} → ${node.label}`,
        ]

        if (node.note) {
            lines.push(`Description: ${node.note}`)
        }

        if (prereqs.length > 0) {
            lines.push(`Prerequisites:`)
            prereqs.forEach(p => {
                lines.push(`  - ${p.node.label} (weight: ${p.weight}${p.rationale ? `, reason: ${p.rationale}` : ''})`)
            })
        }

        if (related.length > 0) {
            lines.push(`Related Topics:`)
            related.forEach(r => {
                lines.push(`  - ${r.node.label} (${r.relation}, weight: ${r.weight}${r.rationale ? `, reason: ${r.rationale}` : ''})`)
            })
        }

        lines.push(`[END CURRICULUM CONTEXT]`)
        return lines.join('\n')
    }

    // ── Assessment Plan ────────────────────────────────────────────────

    /**
     * Generate a KG-backed assessment plan for a topic.
     * Orders concepts by prerequisite dependency (topological sort).
     */
    getAssessmentPlan(topic: string): GraphRAGAssessmentPlan | null {
        const ctx = this.getContext(topic)
        if (!ctx.matchedNode || ctx.assessableConcepts.length === 0) return null

        // Topological sort by prerequisites
        const sorted = this.topologicalSort(ctx.assessableConcepts)

        const concepts = sorted.map(node => {
            const prereqs = this.graph.getPrerequisites(node.id)
            return {
                name: node.label,
                nodeId: node.id,
                difficulty: this.estimateDifficulty(node),
                prerequisites: prereqs.map(p => p.node.label),
                source: node.source,
                note: node.note,
            }
        })

        const seedCount = concepts.filter(c => c.source === 'seed').length
        const llmCount = concepts.filter(c => c.source === 'llm-generated').length

        return {
            topic: ctx.matchedNode.label,
            kgNodeId: ctx.matchedNode.id,
            concepts,
            suggestedOrder: sorted.map(n => n.label),
            totalConcepts: concepts.length,
            sourceBreakdown: { seed: seedCount, llmGenerated: llmCount },
        }
    }

    /**
     * Topological sort of concept nodes based on prerequisite edges.
     * Concepts with no/fewer prerequisites come first.
     */
    private topologicalSort(nodes: KGNode[]): KGNode[] {
        const nodeIds = new Set(nodes.map(n => n.id))
        const inDegree = new Map<string, number>()
        const adjList = new Map<string, string[]>()

        for (const node of nodes) {
            inDegree.set(node.id, 0)
            adjList.set(node.id, [])
        }

        for (const node of nodes) {
            const prereqs = this.graph.getPrerequisites(node.id)
            for (const prereq of prereqs) {
                if (nodeIds.has(prereq.node.id)) {
                    adjList.get(prereq.node.id)!.push(node.id)
                    inDegree.set(node.id, (inDegree.get(node.id) || 0) + 1)
                }
            }
        }

        // Kahn's algorithm
        const queue: string[] = []
        for (const [id, deg] of inDegree) {
            if (deg === 0) queue.push(id)
        }

        const sorted: KGNode[] = []
        while (queue.length > 0) {
            const current = queue.shift()!
            sorted.push(nodes.find(n => n.id === current)!)

            for (const next of (adjList.get(current) || [])) {
                const newDeg = (inDegree.get(next) || 1) - 1
                inDegree.set(next, newDeg)
                if (newDeg === 0) queue.push(next)
            }
        }

        // Add any remaining nodes (cycles or unconnected)
        for (const node of nodes) {
            if (!sorted.find(s => s.id === node.id)) {
                sorted.push(node)
            }
        }

        return sorted
    }

    private estimateDifficulty(node: KGNode): number {
        const prereqs = this.graph.getPrerequisites(node.id)
        const ancestors = this.graph.getAncestors(node.id)
        const depth = ancestors.length
        const prereqCount = prereqs.length

        // Difficulty 1-10: more prereqs + deeper = harder
        return Math.min(10, Math.max(1,
            Math.round(depth * 1.5 + prereqCount * 2)
        ))
    }

    // ── LLM Content Enrichment ─────────────────────────────────────────

    /**
     * Add an LLM-generated concept to the KG.
     * Always tagged as 'llm-generated' so seed data retains priority.
     */
    addLLMGeneratedNode(
        label: string,
        type: NodeType,
        parentNodeId?: string,
        subject?: string,
        note?: string
    ): EnrichmentResult {
        // Check if already exists  
        const existing = this.graph.findMatchingNode(label)
        if (existing) {
            return {
                node: existing,
                edge: { id: '', sourceId: '', targetId: existing.id, relation: 'contains', source: 'seed' },
                isNew: false,
            }
        }

        this.llmNodeCounter++
        const nodeId = `llm_${label.replace(/\s+/g, '_').toLowerCase()}_${this.llmNodeCounter}`

        const newNode: KGNode = {
            id: nodeId,
            label,
            type,
            subject,
            note,
            source: 'llm-generated',
        }

        this.llmNodes.set(nodeId, newNode)

        let edge: KGEdge = {
            id: `llm_edge_${this.llmNodeCounter}`,
            sourceId: parentNodeId || '',
            targetId: nodeId,
            relation: 'contains',
            source: 'llm-generated',
        }

        if (parentNodeId) {
            this.llmEdges.push(edge)
        }

        return { node: newNode, edge, isNew: true }
    }

    /**
     * Add an LLM-discovered relationship between existing nodes.
     */
    addLLMGeneratedEdge(
        sourceId: string,
        targetId: string,
        relation: EdgeRelation,
        rationale?: string,
        weight?: number
    ): KGEdge | null {
        const source = this.graph.getNodeById(sourceId) || this.llmNodes.get(sourceId)
        const target = this.graph.getNodeById(targetId) || this.llmNodes.get(targetId)

        if (!source || !target) return null

        this.llmNodeCounter++
        const edge: KGEdge = {
            id: `llm_rel_${this.llmNodeCounter}`,
            sourceId,
            targetId,
            relation,
            weight,
            rationale,
            source: 'llm-generated',
        }

        this.llmEdges.push(edge)
        return edge
    }

    // ── KG Validation for Fallback ─────────────────────────────────────

    /**
     * Check if a topic is valid for assessment via the KG.
     * Returns true if:
     * 1. The topic directly matches a KG node, OR
     * 2. The topic is a dependency, prerequisite, or association in the KG
     * 
     * This gates the fallback chat: free-text topics are only allowed
     * if they exist in the KG context.
     */
    isTopicValidForAssessment(topic: string): {
        valid: boolean
        reason: string
        matchedNode?: KGNode
        matchType?: 'direct' | 'prerequisite' | 'related' | 'ancestor'
    } {
        // Direct match
        const directMatch = this.graph.findMatchingNode(topic)
        if (directMatch) {
            return {
                valid: true,
                reason: `Matched KG node: ${directMatch.label} (${directMatch.type})`,
                matchedNode: directMatch,
                matchType: 'direct',
            }
        }

        // Search all nodes' prerequisites and related for partial matches
        const q = topic.toLowerCase().trim()
        const allNodes = this.graph.getAllNodes()

        for (const node of allNodes) {
            const prereqs = this.graph.getPrerequisites(node.id)
            for (const p of prereqs) {
                if (p.node.label.toLowerCase().includes(q)) {
                    return {
                        valid: true,
                        reason: `Found as prerequisite of ${node.label}`,
                        matchedNode: p.node,
                        matchType: 'prerequisite',
                    }
                }
            }

            const related = this.graph.getRelated(node.id)
            for (const r of related) {
                if (r.node.label.toLowerCase().includes(q)) {
                    return {
                        valid: true,
                        reason: `Found as related concept of ${node.label}`,
                        matchedNode: r.node,
                        matchType: 'related',
                    }
                }
            }
        }

        return {
            valid: false,
            reason: `Topic "${topic}" not found in curriculum knowledge graph`,
        }
    }

    // ── Subgraph Retrieval (for visualizer) ────────────────────────────

    /**
     * Get the enriched subgraph (seed + LLM nodes) for a subject.
     */
    getEnrichedSubgraph(subject: string): CurriculumGraphData {
        const baseGraph = this.graph.getSubgraph(subject)

        // Merge LLM-generated nodes that belong to this subject
        const enrichedNodes = [...baseGraph.nodes]
        const enrichedEdges = [...baseGraph.edges]
        const existingIds = new Set(baseGraph.nodes.map(n => n.id))

        for (const [id, node] of this.llmNodes) {
            if (node.subject === subject && !existingIds.has(id)) {
                enrichedNodes.push(node)
                existingIds.add(id)
            }
        }

        for (const edge of this.llmEdges) {
            if (existingIds.has(edge.sourceId) && existingIds.has(edge.targetId)) {
                enrichedEdges.push(edge)
            }
        }

        return {
            nodes: enrichedNodes,
            edges: enrichedEdges,
            metadata: {
                ...baseGraph.metadata,
                nodeCount: enrichedNodes.length,
                edgeCount: enrichedEdges.length,
            },
        }
    }

    /**
     * Get the full enriched graph (seed + all LLM nodes).
     */
    getFullEnrichedGraph(): CurriculumGraphData {
        const baseGraph = this.graph.toGraphData()
        const enrichedNodes = [...baseGraph.nodes, ...Array.from(this.llmNodes.values())]
        const enrichedEdges = [...baseGraph.edges, ...this.llmEdges]

        return {
            nodes: enrichedNodes,
            edges: enrichedEdges,
            metadata: {
                ...baseGraph.metadata,
                nodeCount: enrichedNodes.length,
                edgeCount: enrichedEdges.length,
            },
        }
    }

    // ── Tree View (for hierarchical navigation) ────────────────────────

    /**
     * Get a hierarchical tree structure for visualization.
     * Returns subject → chapters → units/concepts with metadata.
     */
    getHierarchicalTree(subject?: string): HierarchyNode[] {
        const subjects = subject
            ? [this.graph.getAllNodes().find(n => n.label === subject && n.type === 'subject')!].filter(Boolean)
            : this.graph.getSubjects()

        return subjects.map(subj => this.buildHierarchyNode(subj))
    }

    private buildHierarchyNode(node: KGNode): HierarchyNode {
        const children = this.graph.getChildrenOf(node.id)
        const prereqs = this.graph.getPrerequisites(node.id)
        const related = this.graph.getRelated(node.id)

        return {
            id: node.id,
            label: node.label,
            type: node.type,
            subject: node.subject,
            note: node.note,
            source: node.source,
            prerequisiteCount: prereqs.length,
            relatedCount: related.length,
            conceptCount: this.graph.getConceptsForAssessment(node.id).length,
            children: children.map(child => this.buildHierarchyNode(child)),
        }
    }
}

export interface HierarchyNode {
    id: string
    label: string
    type: NodeType
    subject?: string
    note?: string
    source: ContentSource
    prerequisiteCount: number
    relatedCount: number
    conceptCount: number
    children: HierarchyNode[]
}

// ─── Factory ────────────────────────────────────────────────────────

let _service: GraphRAGService | null = null

export function getGraphRAGService(): GraphRAGService {
    if (!_service) {
        // Import dynamically to avoid circular dependencies
        const { getCurriculumGraph } = require('./index')
        const graph = getCurriculumGraph()
        _service = new GraphRAGService(graph)
    }
    return _service
}
