// ─── GraphML Parser & Curriculum Graph ──────────────────────────────
// Parses the CBSE Class X GraphML file into typed objects and provides
// query methods for assessment integration and visualization.
// 
// NOTE: This file is Edge Runtime compatible. It does NOT import 'fs' or 'path'
// at the top level. The parseGraphMLFile() helper uses dynamic require()
// and is only usable in Node.js server contexts.

import type {
    KGNode, KGEdge, CurriculumGraphData, NodeType, EdgeRelation,
    KGNodeDetailResponse, ContentSource
} from './types'

// ─── XML Parsing Helpers ────────────────────────────────────────────

function extractAttribute(line: string, attr: string): string {
    const regex = new RegExp(`${attr}="([^"]*)"`)
    const match = line.match(regex)
    return match ? match[1] : ''
}

function extractDataValue(block: string, key: string): string {
    const regex = new RegExp(`<data key="${key}">(.*?)</data>`, 's')
    const match = block.match(regex)
    return match ? decodeXmlEntities(match[1].trim()) : ''
}

function decodeXmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
}

// ─── Key Definition Parser ──────────────────────────────────────────

interface KeyDef {
    id: string
    for: 'node' | 'edge'
    name: string
    type: string
}

function parseKeyDefs(xml: string): { node: Record<string, string>, edge: Record<string, string> } {
    const keys: { node: Record<string, string>, edge: Record<string, string> } = { node: {}, edge: {} }
    const keyRegex = /<key\s+([^>]+)\/>/g
    let match
    while ((match = keyRegex.exec(xml)) !== null) {
        const attrs = match[1]
        const id = extractAttribute(attrs, 'id')
        const forAttr = extractAttribute(attrs, 'for') as 'node' | 'edge'
        const name = extractAttribute(attrs, 'attr.name')
        if (id && (forAttr === 'node' || forAttr === 'edge')) {
            keys[forAttr][id] = name
        }
    }
    return keys
}

// ─── Node & Edge Parsing ────────────────────────────────────────────

function parseNodes(xml: string, nodeKeys: Record<string, string>): KGNode[] {
    const nodes: KGNode[] = []
    // Match each <node ...>...</node> block
    const nodeRegex = /<node\s+id="([^"]+)">([\s\S]*?)<\/node>/g
    let match
    while ((match = nodeRegex.exec(xml)) !== null) {
        const id = match[1]
        const block = match[2]

        // Find which key id maps to which attribute name
        let label = '', type = '', subject = '', note = ''
        for (const [keyId, keyName] of Object.entries(nodeKeys)) {
            const value = extractDataValue(block, keyId)
            if (!value) continue
            switch (keyName) {
                case 'label': label = value; break
                case 'type': type = value; break
                case 'subject': subject = value; break
                case 'note': note = value; break
            }
        }

        nodes.push({
            id,
            label: label || id,
            type: (type || 'concept') as NodeType,
            subject: subject || undefined,
            note: note || undefined,
            source: 'seed' as ContentSource,
        })
    }
    return nodes
}

function parseEdges(xml: string, edgeKeys: Record<string, string>): KGEdge[] {
    const edges: KGEdge[] = []
    const edgeRegex = /<edge\s+id="([^"]+)"\s+source="([^"]+)"\s+target="([^"]+)">([\s\S]*?)<\/edge>/g
    // Also handle self-closing edges or edges with minimal content
    const edgeRegex2 = /<edge\s+id="([^"]+)"\s+source="([^"]+)"\s+target="([^"]+)"\s*\/>/g
    let match

    while ((match = edgeRegex.exec(xml)) !== null) {
        const id = match[1]
        const sourceId = match[2]
        const targetId = match[3]
        const block = match[4]

        let relation = '', weight: number | undefined, rationale = ''
        for (const [keyId, keyName] of Object.entries(edgeKeys)) {
            const value = extractDataValue(block, keyId)
            if (!value) continue
            switch (keyName) {
                case 'relation': relation = value; break
                case 'weight': weight = parseFloat(value) || undefined; break
                case 'rationale': rationale = value; break
            }
        }

        edges.push({
            id,
            sourceId,
            targetId,
            relation: (relation || 'contains') as EdgeRelation,
            weight,
            rationale: rationale || undefined,
            source: 'seed' as ContentSource,
        })
    }

    // Handle self-closing edge tags (no children)
    while ((match = edgeRegex2.exec(xml)) !== null) {
        // Skip if already matched by the first regex
        if (edges.find(e => e.id === match![1])) continue
        edges.push({
            id: match[1],
            sourceId: match[2],
            targetId: match[3],
            relation: 'contains' as EdgeRelation,
            source: 'seed' as ContentSource,
        })
    }

    return edges
}

// ─── CurriculumGraph Class ──────────────────────────────────────────

export class CurriculumGraph {
    private nodes: Map<string, KGNode> = new Map()
    private edges: KGEdge[] = []
    private childrenMap: Map<string, string[]> = new Map()     // parent → children (contains)
    private parentMap: Map<string, string> = new Map()          // child → parent (contains)
    private prerequisiteMap: Map<string, { nodeId: string, weight: number, rationale?: string }[]> = new Map()
    private relatedMap: Map<string, { nodeId: string, relation: EdgeRelation, weight: number, rationale?: string }[]> = new Map()
    private _subjects: string[] = []

    constructor(nodes: KGNode[], edges: KGEdge[]) {
        // Index nodes
        for (const node of nodes) {
            this.nodes.set(node.id, node)
        }

        this.edges = edges

        // Build adjacency indices
        for (const edge of edges) {
            if (edge.relation === 'contains') {
                if (!this.childrenMap.has(edge.sourceId)) this.childrenMap.set(edge.sourceId, [])
                this.childrenMap.get(edge.sourceId)!.push(edge.targetId)
                this.parentMap.set(edge.targetId, edge.sourceId)
            } else if (edge.relation === 'prerequisite') {
                if (!this.prerequisiteMap.has(edge.targetId)) this.prerequisiteMap.set(edge.targetId, [])
                this.prerequisiteMap.get(edge.targetId)!.push({
                    nodeId: edge.sourceId,
                    weight: edge.weight || 0,
                    rationale: edge.rationale,
                })
            } else {
                // related_to, applies_to
                if (!this.relatedMap.has(edge.sourceId)) this.relatedMap.set(edge.sourceId, [])
                this.relatedMap.get(edge.sourceId)!.push({
                    nodeId: edge.targetId,
                    relation: edge.relation,
                    weight: edge.weight || 0,
                    rationale: edge.rationale,
                })
                // Bidirectional for related_to
                if (!this.relatedMap.has(edge.targetId)) this.relatedMap.set(edge.targetId, [])
                this.relatedMap.get(edge.targetId)!.push({
                    nodeId: edge.sourceId,
                    relation: edge.relation,
                    weight: edge.weight || 0,
                    rationale: edge.rationale,
                })
            }
        }

        // Extract unique subjects
        this._subjects = [...new Set(
            nodes.filter(n => n.type === 'subject').map(n => n.label)
        )]
    }

    // ── Query Methods ──────────────────────────────────────────────────

    getNodeById(id: string): KGNode | undefined {
        return this.nodes.get(id)
    }

    getAllNodes(): KGNode[] {
        return Array.from(this.nodes.values())
    }

    getAllEdges(): KGEdge[] {
        return this.edges
    }

    getSubjects(): KGNode[] {
        return Array.from(this.nodes.values()).filter(n => n.type === 'subject')
    }

    getSubjectNames(): string[] {
        return this._subjects
    }

    getChildrenOf(nodeId: string): KGNode[] {
        const childIds = this.childrenMap.get(nodeId) || []
        return childIds.map(id => this.nodes.get(id)).filter(Boolean) as KGNode[]
    }

    getParentOf(nodeId: string): KGNode | undefined {
        const parentId = this.parentMap.get(nodeId)
        return parentId ? this.nodes.get(parentId) : undefined
    }

    getAncestors(nodeId: string): KGNode[] {
        const ancestors: KGNode[] = []
        let current = nodeId
        while (this.parentMap.has(current)) {
            current = this.parentMap.get(current)!
            const node = this.nodes.get(current)
            if (node) ancestors.push(node)
        }
        return ancestors
    }

    getPrerequisites(nodeId: string): { node: KGNode, weight: number, rationale?: string }[] {
        const prereqs = this.prerequisiteMap.get(nodeId) || []
        return prereqs
            .map(p => ({
                node: this.nodes.get(p.nodeId)!,
                weight: p.weight,
                rationale: p.rationale,
            }))
            .filter(p => p.node)
            .sort((a, b) => b.weight - a.weight)
    }

    getRelated(nodeId: string): { node: KGNode, relation: EdgeRelation, weight: number, rationale?: string }[] {
        const related = this.relatedMap.get(nodeId) || []
        return related
            .map(r => ({
                node: this.nodes.get(r.nodeId)!,
                relation: r.relation,
                weight: r.weight,
                rationale: r.rationale,
            }))
            .filter(r => r.node)
            .sort((a, b) => b.weight - a.weight)
    }

    /**
     * Get all concept-level nodes that are descendants of a given node.
     * Useful for generating assessments: pass a chapter/unit/subject and 
     * get back all testable concepts.
     */
    getConceptsForAssessment(nodeId: string): KGNode[] {
        const concepts: KGNode[] = []
        const visited = new Set<string>()

        const traverse = (id: string) => {
            if (visited.has(id)) return
            visited.add(id)

            const node = this.nodes.get(id)
            if (!node) return

            if (node.type === 'concept') {
                concepts.push(node)
            }

            const children = this.childrenMap.get(id) || []
            for (const childId of children) {
                traverse(childId)
            }
        }

        traverse(nodeId)
        return concepts
    }

    /**
     * Get the full subgraph for a subject (by subject id or name).
     * Returns all nodes belonging to that subject + their edges.
     */
    getSubgraph(subjectIdOrName: string): CurriculumGraphData {
        const subject = this.nodes.get(subjectIdOrName)
            || Array.from(this.nodes.values()).find(n => n.label === subjectIdOrName && n.type === 'subject')

        if (!subject) {
            return { nodes: [], edges: [], metadata: { title: '', nodeCount: 0, edgeCount: 0, subjects: [] } }
        }

        // Collect all descendant nodes
        const nodeIds = new Set<string>()
        const traverse = (id: string) => {
            nodeIds.add(id)
            const children = this.childrenMap.get(id) || []
            for (const childId of children) {
                traverse(childId)
            }
        }
        traverse(subject.id)

        const nodes = Array.from(nodeIds).map(id => this.nodes.get(id)!).filter(Boolean)
        const edges = this.edges.filter(e => nodeIds.has(e.sourceId) && nodeIds.has(e.targetId))

        return {
            nodes,
            edges,
            metadata: {
                title: subject.label,
                nodeCount: nodes.length,
                edgeCount: edges.length,
                subjects: [subject.label],
            }
        }
    }

    /**
     * Fuzzy search across all node labels. Returns matches sorted by relevance.
     */
    searchNodes(query: string): KGNode[] {
        const q = query.toLowerCase()
        return Array.from(this.nodes.values())
            .filter(n =>
                n.label.toLowerCase().includes(q) ||
                (n.subject && n.subject.toLowerCase().includes(q)) ||
                (n.note && n.note.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                // Exact label matches first
                const aExact = a.label.toLowerCase().startsWith(q) ? 0 : 1
                const bExact = b.label.toLowerCase().startsWith(q) ? 0 : 1
                if (aExact !== bExact) return aExact - bExact
                // Then by node type hierarchy
                const typeOrder: Record<string, number> = { subject: 0, chapter: 1, unit: 1, domain: 1, concept: 2, root: 3 }
                return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5)
            })
    }

    /**
     * Get detail for a single node including all contextual info.
     */
    getNodeDetail(nodeId: string): KGNodeDetailResponse | undefined {
        const node = this.nodes.get(nodeId)
        if (!node) return undefined

        const edges = this.edges.filter(e => e.sourceId === nodeId || e.targetId === nodeId)
        const neighborIds = new Set(edges.map(e => e.sourceId === nodeId ? e.targetId : e.sourceId))
        const neighbors = Array.from(neighborIds).map(id => this.nodes.get(id)!).filter(Boolean)
        const ancestors = this.getAncestors(nodeId)
        const concepts = this.getConceptsForAssessment(nodeId)

        return { node, edges, neighbors, ancestors, concepts }
    }

    /**
     * Check if a topic string matches any node in the KG.
     * Returns the best matching node or undefined.
     */
    findMatchingNode(topic: string): KGNode | undefined {
        const q = topic.toLowerCase().trim()
        // Exact label match first
        const exact = Array.from(this.nodes.values()).find(n => n.label.toLowerCase() === q)
        if (exact) return exact
        // Partial match
        const partial = this.searchNodes(topic)
        return partial.length > 0 ? partial[0] : undefined
    }

    /**
     * Check if a topic exists as a dependency, prerequisite, or association in the KG.
     * This is used for the fallback logic: allow free-text only if the topic
     * has been referenced in the KG.
     */
    isTopicInKGContext(topic: string): boolean {
        const match = this.findMatchingNode(topic)
        return !!match
    }

    /**
     * Export the full graph data for API responses.
     */
    toGraphData(): CurriculumGraphData {
        return {
            nodes: Array.from(this.nodes.values()),
            edges: this.edges,
            metadata: {
                title: 'CBSE Class X Curriculum (2025–26)',
                nodeCount: this.nodes.size,
                edgeCount: this.edges.length,
                subjects: this._subjects,
            }
        }
    }
}

// ─── Factory: Parse GraphML file ────────────────────────────────────

export function parseGraphMLFile(filePath: string): CurriculumGraph {
    // Dynamic require — only works in Node.js runtime, not Edge
    const fs = require('fs') as typeof import('fs')
    const xml = fs.readFileSync(filePath, 'utf-8')
    return parseGraphMLString(xml)
}

export function parseGraphMLString(xml: string): CurriculumGraph {
    const keys = parseKeyDefs(xml)
    const nodes = parseNodes(xml, keys.node)
    const edges = parseEdges(xml, keys.edge)
    return new CurriculumGraph(nodes, edges)
}
