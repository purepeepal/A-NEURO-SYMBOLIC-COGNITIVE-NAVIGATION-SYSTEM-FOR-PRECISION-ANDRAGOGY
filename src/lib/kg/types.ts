// ─── KG Data Types ──────────────────────────────────────────────────
// All types for the curriculum knowledge graph integration.

export type NodeType = 'root' | 'subject' | 'chapter' | 'unit' | 'concept' | 'domain'
export type EdgeRelation = 'contains' | 'prerequisite' | 'related_to' | 'applies_to'
export type ContentSource = 'seed' | 'llm-generated'

export interface KGNode {
    id: string
    label: string
    type: NodeType
    subject?: string
    note?: string
    source: ContentSource
}

export interface KGEdge {
    id: string
    sourceId: string
    targetId: string
    relation: EdgeRelation
    weight?: number
    rationale?: string
    source: ContentSource
}

export interface CurriculumGraphData {
    nodes: KGNode[]
    edges: KGEdge[]
    metadata: {
        title: string
        nodeCount: number
        edgeCount: number
        subjects: string[]
    }
}

// ─── Client-side visualization types ────────────────────────────────

export interface KGVisNode {
    id: string
    label: string
    type: NodeType
    subject?: string
    note?: string
    source: ContentSource
    // Position (computed by layout)
    x?: number
    y?: number
    // Assessment overlay (Phase 4)
    mastery?: 'mastered' | 'partial' | 'gap' | 'untested'
    accuracy?: number
    questionsAsked?: number
}

export interface KGVisEdge {
    id: string
    source: string
    target: string
    relation: EdgeRelation
    weight?: number
    rationale?: string
    source_tag: ContentSource
}

// ─── API Response types ─────────────────────────────────────────────

export interface KGApiResponse {
    graph: CurriculumGraphData
    timestamp: string
}

export interface KGNodeDetailResponse {
    node: KGNode
    edges: KGEdge[]
    neighbors: KGNode[]
    ancestors: KGNode[]  // path to root
    concepts: KGNode[]   // concept-level descendants for assessment
}
