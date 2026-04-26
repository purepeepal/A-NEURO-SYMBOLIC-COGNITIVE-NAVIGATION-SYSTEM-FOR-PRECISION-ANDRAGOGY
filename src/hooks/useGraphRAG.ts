'use client'
// ─── useGraphRAG Hook ───────────────────────────────────────────────
// Client hook for GraphRAG-powered KG data with hierarchical tree,
// subject separation, and enriched graph capabilities.

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { KGNode, KGEdge, CurriculumGraphData, NodeType, EdgeRelation, ContentSource } from '@/lib/kg/types'
import type { HierarchyNode } from '@/lib/kg/graphrag-service'

// ─── View Modes ─────────────────────────────────────────────────────

export type ViewMode = 'graph' | 'tree' | 'subject'

// ─── Vis.js Node/Edge (inherit from useKGData but extended) ─────────

export interface EnrichedVisNode {
    id: string
    label: string
    _type: NodeType
    _subject?: string
    _note?: string
    _source: ContentSource
    _conceptCount?: number
    _prerequisiteCount?: number
    size: number
    color: {
        background: string
        border: string
        highlight: { background: string; border: string }
        hover: { background: string; border: string }
    }
    font: { color: string; size: number; strokeWidth: number; strokeColor: string }
    borderWidth: number
    borderWidthSelected: number
    shape?: string
}

export interface EnrichedVisEdge {
    id?: string
    from: string
    to: string
    _relation: EdgeRelation
    _rationale?: string
    _weight?: number
    _source: ContentSource
    color: { color: string; highlight: string; hover: string }
    width: number
    dashes: boolean | number[]
    smooth: { type: string; roundness?: number }
    arrows: { to: { enabled: boolean; scaleFactor: number } }
    label?: string
}

// ─── Color System (brutalist-themed) ────────────────────────────────

const TYPE_COLORS: Record<NodeType | string, string> = {
    root: '#c9a227',
    subject: '#7c6aef',
    chapter: '#2196f3',
    concept: '#2e7d32',
    unit: '#e65100',
    domain: '#9c27b0',
}

const SUBJECT_COLORS: Record<string, string> = {
    Mathematics: '#2196f3',
    Science: '#2e7d32',
    'Social Science': '#e65100',
}

const SUBJECT_BG_COLORS: Record<string, string> = {
    Mathematics: 'bg-blue-50 border-blue-400',
    Science: 'bg-green-50 border-green-400',
    'Social Science': 'bg-orange-50 border-orange-400',
}

export function getNodeColor(type: string, subject?: string, source?: ContentSource): string {
    if (source === 'llm-generated') {
        // LLM-generated nodes get a subtle indicator — dimmed version
        const base = TYPE_COLORS[type] || '#888'
        return base + '99' // Add alpha for transparency
    }
    if (type === 'root') return TYPE_COLORS.root
    if (type === 'subject') return SUBJECT_COLORS[subject || ''] || TYPE_COLORS.subject
    if (subject && SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject]
    return TYPE_COLORS[type] || '#888'
}

export function getNodeSize(type: string): number {
    switch (type) {
        case 'root': return 36
        case 'subject': return 28
        case 'chapter': return 22
        case 'unit': return 20
        case 'domain': return 20
        case 'concept': return 14
        default: return 16
    }
}

function getNodeShape(type: NodeType, source: ContentSource): string {
    if (source === 'llm-generated') return 'diamond'
    switch (type) {
        case 'root': return 'star'
        case 'subject': return 'hexagon'
        case 'chapter': return 'box'
        case 'unit': return 'box'
        default: return 'dot'
    }
}

function getEdgeStyle(relation: EdgeRelation): {
    color: string; width: number; dashes: boolean
} {
    switch (relation) {
        case 'contains':
            return { color: 'rgba(0,0,0,0.12)', width: 1, dashes: false }
        case 'prerequisite':
            return { color: '#7c6aef', width: 2.5, dashes: false }
        case 'related_to':
            return { color: 'rgba(230, 81, 0, 0.6)', width: 1.5, dashes: true }
        case 'applies_to':
            return { color: 'rgba(156, 39, 176, 0.5)', width: 1.5, dashes: true }
        default:
            return { color: 'rgba(0,0,0,0.08)', width: 1, dashes: false }
    }
}

// ─── Transform Functions ────────────────────────────────────────────

function transformNodes(nodes: KGNode[]): EnrichedVisNode[] {
    return nodes.map(node => {
        const color = getNodeColor(node.type, node.subject, node.source)
        const shape = getNodeShape(node.type, node.source)
        return {
            id: node.id,
            label: node.label,
            _type: node.type,
            _subject: node.subject,
            _note: node.note,
            _source: node.source,
            size: getNodeSize(node.type),
            shape,
            color: {
                background: color,
                border: node.source === 'llm-generated' ? '#c9a227' : color,
                highlight: { background: '#111', border: color },
                hover: { background: color, border: '#111' },
            },
            font: {
                color: '#222',
                size: node.type === 'concept' ? 11 : node.type === 'root' ? 16 : 13,
                strokeWidth: 3,
                strokeColor: '#eeeee8',
            },
            borderWidth: node.source === 'llm-generated' ? 2 : 1.5,
            borderWidthSelected: 3,
        }
    })
}

function transformEdges(edges: KGEdge[]): EnrichedVisEdge[] {
    return edges.map(edge => {
        const isCrossLink = edge.relation !== 'contains'
        const style = getEdgeStyle(edge.relation)
        return {
            id: edge.id,
            from: edge.sourceId,
            to: edge.targetId,
            _relation: edge.relation,
            _rationale: edge.rationale,
            _weight: edge.weight,
            _source: edge.source,
            color: {
                color: style.color,
                highlight: '#7c6aef',
                hover: isCrossLink ? '#e65100' : 'rgba(0,0,0,0.25)',
            },
            width: style.width,
            dashes: style.dashes ? [6, 4] : false,
            smooth: isCrossLink
                ? { type: 'curvedCW', roundness: 0.2 }
                : { type: 'continuous' },
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
            label: isCrossLink ? edge.relation.replace('_', ' ') : undefined,
        }
    })
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useGraphRAG() {
    const [graphData, setGraphData] = useState<CurriculumGraphData | null>(null)
    const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentSubject, setCurrentSubject] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<ViewMode>('tree')
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch full enriched graph + hierarchy on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [graphRes, treeRes] = await Promise.all([
                    fetch('/api/kg?enriched=true'),
                    fetch('/api/kg/graphrag?tree=true'),
                ])

                if (!graphRes.ok) throw new Error('Failed to fetch knowledge graph')

                const graphJson = await graphRes.json()
                setGraphData(graphJson.graph)

                if (treeRes.ok) {
                    const treeJson = await treeRes.json()
                    setHierarchyTree(treeJson.tree)
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Transform all nodes/edges
    const allNodes = useMemo(() => {
        if (!graphData) return []
        return transformNodes(graphData.nodes)
    }, [graphData])

    const allEdges = useMemo(() => {
        if (!graphData) return []
        return transformEdges(graphData.edges)
    }, [graphData])

    // Subject-specific subgraphs
    const subjectGraphs = useMemo(() => {
        if (!graphData) return {}
        const subjects = graphData.metadata.subjects
        const result: Record<string, { nodes: EnrichedVisNode[]; edges: EnrichedVisEdge[] }> = {}

        for (const subject of subjects) {
            const subjectNodes = graphData.nodes.filter(n =>
                n.type === 'root' || n.subject === subject ||
                (n.type === 'subject' && n.label === subject)
            )
            const nodeIds = new Set(subjectNodes.map(n => n.id))
            const subjectEdges = graphData.edges.filter(e =>
                nodeIds.has(e.sourceId) && nodeIds.has(e.targetId)
            )
            result[subject] = {
                nodes: transformNodes(subjectNodes),
                edges: transformEdges(subjectEdges),
            }
        }

        return result
    }, [graphData])

    // Filtered view
    const { nodes, edges } = useMemo(() => {
        let filteredNodes = allNodes
        let filteredEdges = allEdges

        if (currentSubject && subjectGraphs[currentSubject]) {
            filteredNodes = subjectGraphs[currentSubject].nodes
            filteredEdges = subjectGraphs[currentSubject].edges
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filteredNodes = filteredNodes.filter(n =>
                n.label.toLowerCase().includes(q) ||
                (n._subject && n._subject.toLowerCase().includes(q)) ||
                (n._note && n._note.toLowerCase().includes(q))
            )
            const nodeIds = new Set(filteredNodes.map(n => n.id))
            filteredEdges = filteredEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
        }

        return { nodes: filteredNodes, edges: filteredEdges }
    }, [allNodes, allEdges, currentSubject, searchQuery, subjectGraphs])

    // Stats per subject
    const subjectStats = useMemo(() => {
        if (!graphData) return {}
        const stats: Record<string, { nodes: number; chapters: number; concepts: number; edges: number }> = {}
        for (const [subject, data] of Object.entries(subjectGraphs)) {
            stats[subject] = {
                nodes: data.nodes.length,
                chapters: data.nodes.filter(n => n._type === 'chapter').length,
                concepts: data.nodes.filter(n => n._type === 'concept').length,
                edges: data.edges.length,
            }
        }
        return stats
    }, [graphData, subjectGraphs])

    const sourceBreakdown = useMemo(() => {
        if (!graphData) return { seed: 0, llmGenerated: 0 }
        return {
            seed: graphData.nodes.filter(n => n.source === 'seed').length,
            llmGenerated: graphData.nodes.filter(n => n.source === 'llm-generated').length,
        }
    }, [graphData])

    const filterBySubject = useCallback((subject: string | null) => {
        setCurrentSubject(subject)
    }, [])

    const search = useCallback((query: string) => {
        setSearchQuery(query)
    }, [])

    return {
        // Primary data
        nodes,
        edges,
        allNodes,
        allEdges,
        subjectGraphs,
        hierarchyTree,

        // Metadata
        subjects: graphData?.metadata?.subjects || [],
        metadata: graphData?.metadata || null,
        subjectStats,
        sourceBreakdown,

        // State
        loading,
        error,
        currentSubject,
        viewMode,
        searchQuery,
        stats: { nodeCount: nodes.length, edgeCount: edges.length },

        // Actions
        filterBySubject,
        search,
        setViewMode,
    }
}
