'use client'
// ─── useKGData Hook ─────────────────────────────────────────────────
// Fetches the curriculum KG from /api/kg and transforms it for vis rendering.

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { KGNode, KGEdge, CurriculumGraphData, NodeType, EdgeRelation } from '@/lib/kg/types'

// ─── Color Palettes (adapted from existing Visualizer.html) ─────────

const TYPE_COLORS: Record<NodeType | string, string> = {
    root: '#f0c040',
    subject: '#7c6aef',
    chapter: '#4fc3f7',
    concept: '#5ee0a0',
    unit: '#ff8a65',
    domain: '#ce93d8',
}

const SUBJECT_COLORS: Record<string, string> = {
    Mathematics: '#4fc3f7',
    Science: '#5ee0a0',
    'Social Science': '#ff8a65',
}

export function getNodeColor(type: string, subject?: string): string {
    if (type === 'root') return TYPE_COLORS.root
    if (type === 'subject') return SUBJECT_COLORS[subject || ''] || TYPE_COLORS.subject
    if (subject && SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject]
    return TYPE_COLORS[type] || '#888'
}

export function getNodeSize(type: string): number {
    switch (type) {
        case 'root': return 32
        case 'subject': return 26
        case 'chapter': return 20
        case 'unit': return 20
        case 'domain': return 20
        case 'concept': return 14
        default: return 16
    }
}

export function getEdgeStyle(relation: EdgeRelation): {
    color: string
    width: number
    dashes: boolean
    animated: boolean
} {
    switch (relation) {
        case 'contains':
            return { color: 'rgba(255,255,255,0.15)', width: 1, dashes: false, animated: false }
        case 'prerequisite':
            return { color: '#7c6aef', width: 2.5, dashes: false, animated: true }
        case 'related_to':
            return { color: 'rgba(255, 138, 101, 0.6)', width: 1.5, dashes: true, animated: false }
        case 'applies_to':
            return { color: 'rgba(206, 147, 216, 0.5)', width: 1.5, dashes: true, animated: false }
        default:
            return { color: 'rgba(255,255,255,0.1)', width: 1, dashes: false, animated: false }
    }
}

// ─── Vis.js compatible node/edge shapes ─────────────────────────────

export interface VisNode {
    id: string
    label: string
    _type: NodeType
    _subject?: string
    _note?: string
    _source: string
    // vis-network props
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
    title?: string
}

export interface VisEdge {
    id?: string
    from: string
    to: string
    _relation: EdgeRelation
    _rationale?: string
    _weight?: number
    color: { color: string; highlight: string; hover: string }
    width: number
    dashes: boolean | number[]
    smooth: { type: string; roundness?: number }
    arrows: { to: { enabled: boolean; scaleFactor: number } }
}

function transformNodes(nodes: KGNode[]): VisNode[] {
    return nodes.map(node => {
        const color = getNodeColor(node.type, node.subject)
        return {
            id: node.id,
            label: node.label,
            _type: node.type,
            _subject: node.subject,
            _note: node.note,
            _source: node.source,
            size: getNodeSize(node.type),
            color: {
                background: color,
                border: color,
                highlight: { background: '#fff', border: color },
                hover: { background: color, border: '#fff' },
            },
            font: {
                color: '#e0e0e6',
                size: node.type === 'concept' ? 11 : 13,
                strokeWidth: 2,
                strokeColor: '#0f0f13',
            },
            borderWidth: node.source === 'llm-generated' ? 1 : 1.5,
            borderWidthSelected: 3,
        }
    })
}

function transformEdges(edges: KGEdge[]): VisEdge[] {
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
            color: {
                color: style.color,
                highlight: '#7c6aef',
                hover: isCrossLink ? '#ff8a65' : 'rgba(255,255,255,0.3)',
            },
            width: style.width,
            dashes: style.dashes ? [6, 4] : false,
            smooth: isCrossLink
                ? { type: 'curvedCW', roundness: 0.2 }
                : { type: 'continuous' },
            arrows: { to: { enabled: true, scaleFactor: 0.5 } },
        }
    })
}

// ─── Hook ───────────────────────────────────────────────────────────

export interface KGDataResult {
    nodes: VisNode[]
    edges: VisEdge[]
    allNodes: VisNode[]
    allEdges: VisEdge[]
    subjects: string[]
    metadata: CurriculumGraphData['metadata'] | null
    loading: boolean
    error: string | null
    filterBySubject: (subject: string | null) => void
    searchNodes: (query: string) => void
    currentSubject: string | null
    searchQuery: string
    stats: { nodeCount: number; edgeCount: number }
}

export function useKGData(): KGDataResult {
    const [graphData, setGraphData] = useState<CurriculumGraphData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentSubject, setCurrentSubject] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Fetch full graph on mount
    useEffect(() => {
        const fetchGraph = async () => {
            try {
                setLoading(true)
                const res = await fetch('/api/kg')
                if (!res.ok) throw new Error('Failed to fetch knowledge graph')
                const data = await res.json()
                setGraphData(data.graph)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchGraph()
    }, [])

    // Transform all nodes/edges once
    const allNodes = useMemo(() => {
        if (!graphData) return []
        return transformNodes(graphData.nodes)
    }, [graphData])

    const allEdges = useMemo(() => {
        if (!graphData) return []
        return transformEdges(graphData.edges)
    }, [graphData])

    // Filtered nodes/edges based on subject and search
    const { nodes, edges } = useMemo(() => {
        let filteredNodes = allNodes
        let filteredEdges = allEdges

        // Subject filter
        if (currentSubject) {
            filteredNodes = allNodes.filter(n =>
                n._type === 'root' ||
                n._subject === currentSubject ||
                (n._type === 'subject' && n.label === currentSubject)
            )
            const nodeIds = new Set(filteredNodes.map(n => n.id))
            filteredEdges = allEdges.filter(e => nodeIds.has(e.from) && nodeIds.has(e.to))
        }

        // Search filter
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
    }, [allNodes, allEdges, currentSubject, searchQuery])

    const filterBySubject = useCallback((subject: string | null) => {
        setCurrentSubject(subject)
    }, [])

    const searchNodesCallback = useCallback((query: string) => {
        setSearchQuery(query)
    }, [])

    const subjects = useMemo(() => {
        return graphData?.metadata?.subjects || []
    }, [graphData])

    return {
        nodes,
        edges,
        allNodes,
        allEdges,
        subjects,
        metadata: graphData?.metadata || null,
        loading,
        error,
        filterBySubject,
        searchNodes: searchNodesCallback,
        currentSubject,
        searchQuery,
        stats: { nodeCount: nodes.length, edgeCount: edges.length },
    }
}
