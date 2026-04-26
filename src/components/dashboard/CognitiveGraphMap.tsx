'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
    type Node,
    type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
    CognitiveGraph,
    CognitiveNode,
    CognitiveEdge,
    CognitiveNodeState,
    CognitiveNodeType,
    CognitiveEdgeRelation,
} from '@/lib/cognitive-graph/types'

// ΓöÇΓöÇΓöÇ Styling Maps ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const STATE_STYLES: Record<CognitiveNodeState, { bg: string; border: string; text: string; badge: string }> = {
    tentative:      { bg: '#f8fafc', border: '#94a3b8', text: '#334155',  badge: 'bg-slate-200 text-slate-700' },
    solidified:     { bg: '#f0fdf4', border: '#16a34a', text: '#14532d',  badge: 'bg-green-200 text-green-800' },
    reconsidering:  { bg: '#fffbeb', border: '#d97706', text: '#92400e',  badge: 'bg-amber-200 text-amber-800' },
    revised:        { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a',  badge: 'bg-blue-200 text-blue-800' },
    doubled_down:   { bg: '#14532d', border: '#14532d', text: '#ffffff',  badge: 'bg-green-900 text-green-100' },
    fallen_back:    { bg: '#fff7ed', border: '#ea580c', text: '#7c2d12',  badge: 'bg-orange-200 text-orange-800' },
}

const TYPE_ICONS: Record<CognitiveNodeType, string> = {
    trait:       '≡ƒºá',
    strength:    'Γ£ª',
    gap:         'ΓÜá',
    hypothesis:  '?',
    observation: 'Γùï',
    opinion:     'Γùå',
}

const EDGE_STYLE: Record<CognitiveEdgeRelation, { stroke: string; strokeDasharray?: string; label: string }> = {
    supports:     { stroke: '#16a34a', label: 'supports' },
    contradicts:  { stroke: '#dc2626', strokeDasharray: '6 3', label: 'contradicts' },
    depends_on:   { stroke: '#2563eb', label: 'depends on' },
    evolves_into: { stroke: '#9333ea', label: 'evolves into' },
    related_to:   { stroke: '#94a3b8', label: 'related to' },
}

// ΓöÇΓöÇΓöÇ Custom Node ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface CogNodeData {
    node: CognitiveNode
    [key: string]: unknown
}

function CognitiveNodeComponent({ data }: { data: CogNodeData }) {
    const { node } = data
    const style = STATE_STYLES[node.state]
    const icon = TYPE_ICONS[node.type]

    return (
        <div
            className="relative min-w-[180px] max-w-[220px] shadow-[3px_3px_0px_0px_rgba(0,0,0,0.4)]"
            style={{
                background: style.bg,
                border: `2px solid ${style.border}`,
                borderRadius: 0,
            }}
        >
            <Handle type="target" position={Position.Top} style={{ background: style.border, width: 8, height: 8, borderRadius: 0 }} />

            {/* Type + State Header */}
            <div
                className="flex items-center justify-between px-2 py-1 border-b text-[10px] font-black uppercase tracking-widest"
                style={{ borderColor: style.border, background: `${style.border}22` }}
            >
                <span style={{ color: style.text }}>{icon} {node.type}</span>
                <span
                    className="px-1 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    style={{ background: style.border, color: node.state === 'doubled_down' ? '#fff' : '#fff' }}
                >
                    {node.state.replace('_', ' ')}
                </span>
            </div>

            {/* Label */}
            <div className="px-3 py-2">
                <p
                    className="font-black text-xs uppercase tracking-tight leading-tight"
                    style={{ color: style.text }}
                    title={node.label}
                >
                    {node.label}
                </p>

                {/* Confidence bar */}
                <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-black/10">
                        <div
                            className="h-full transition-all"
                            style={{
                                width: `${Math.round(node.confidence * 100)}%`,
                                background: style.border,
                            }}
                        />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: style.text }}>
                        {Math.round(node.confidence * 100)}%
                    </span>
                </div>

                {/* Evidence count */}
                {node.evidence.length > 0 && (
                    <p className="text-[10px] mt-1 opacity-60 font-medium" style={{ color: style.text }}>
                        {node.evidence.length} evidence point{node.evidence.length !== 1 ? 's' : ''}
                    </p>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} style={{ background: style.border, width: 8, height: 8, borderRadius: 0 }} />
        </div>
    )
}

const nodeTypes = { cognitiveNode: CognitiveNodeComponent }

// ΓöÇΓöÇΓöÇ Detail Panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function NodeDetailPanel({ node, onClose }: { node: CognitiveNode; onClose: () => void }) {
    const style = STATE_STYLES[node.state]

    return (
        <div className="absolute top-4 right-4 z-50 w-80 bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: style.border }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-white text-sm">{TYPE_ICONS[node.type]}</span>
                    <span className="text-white text-xs font-black uppercase tracking-wider">
                        {node.type}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white font-black text-lg leading-none"
                    aria-label="Close panel"
                >
                    ├ù
                </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                {/* Label */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Opinion</p>
                    <p className="font-black text-sm uppercase tracking-tight">{node.label}</p>
                </div>

                {/* Detail */}
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Detail</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{node.detail}</p>
                </div>

                {/* State + Confidence */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">State</p>
                        <span
                            className="text-[10px] font-black uppercase tracking-widest px-2 py-1"
                            style={{ background: style.border, color: '#fff' }}
                        >
                            {node.state.replace('_', ' ')}
                        </span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Confidence</p>
                        <p className="font-black text-sm">{Math.round(node.confidence * 100)}%</p>
                    </div>
                </div>

                {/* Domain */}
                {node.domain && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Domain</p>
                        <p className="text-xs font-bold text-gray-600">{node.domain.replace(/_/g, ' ')}</p>
                    </div>
                )}

                {/* Evidence */}
                {node.evidence.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                            Evidence ({node.evidence.length})
                        </p>
                        <ul className="space-y-1">
                            {node.evidence.map((e, i) => (
                                <li
                                    key={i}
                                    className="text-[11px] text-gray-600 leading-relaxed pl-2 border-l-2 border-gray-200"
                                >
                                    {e}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* State History */}
                {node.stateHistory.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                            State History ({node.stateHistory.length})
                        </p>
                        <div className="space-y-1">
                            {node.stateHistory.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 text-[10px]">
                                    <span className="font-bold text-gray-500">{t.from}</span>
                                    <span className="text-gray-300">ΓåÆ</span>
                                    <span className="font-bold" style={{ color: STATE_STYLES[t.to].border }}>{t.to}</span>
                                    {t.sessionId && (
                                        <span className="text-gray-400 truncate max-w-[80px]">
                                            session:{t.sessionId.slice(-6)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dates */}
                <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                    <div>
                        <span className="block font-bold uppercase">Created</span>
                        <span>{new Date(node.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                        <span className="block font-bold uppercase">Updated</span>
                        <span>{new Date(node.lastUpdated).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ΓöÇΓöÇΓöÇ Layout Algorithm ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Group nodes by type into columns, spread vertically within each column.

const TYPE_COLUMN_ORDER: CognitiveNodeType[] = ['trait', 'observation', 'hypothesis', 'opinion', 'strength', 'gap']
const COLUMN_WIDTH = 280
const NODE_HEIGHT = 130

function computeLayout(nodes: CognitiveNode[]): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()
    const byType = new Map<CognitiveNodeType, CognitiveNode[]>()

    for (const type of TYPE_COLUMN_ORDER) {
        byType.set(type, [])
    }
    for (const node of nodes) {
        const col = byType.get(node.type)
        if (col) col.push(node)
        else byType.get('opinion')!.push(node)
    }

    TYPE_COLUMN_ORDER.forEach((type, colIdx) => {
        const colNodes = byType.get(type) ?? []
        colNodes.forEach((node, rowIdx) => {
            positions.set(node.id, {
                x: colIdx * COLUMN_WIDTH + 40,
                y: rowIdx * NODE_HEIGHT + 40,
            })
        })
    })

    return positions
}

// ΓöÇΓöÇΓöÇ Convert graph to ReactFlow nodes + edges ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function toFlowElements(graph: CognitiveGraph): { nodes: Node[]; edges: Edge[] } {
    const positions = computeLayout(graph.nodes)

    const nodes: Node[] = graph.nodes.map(node => ({
        id: node.id,
        type: 'cognitiveNode',
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        data: { node } as CogNodeData,
        draggable: true,
    }))

    const edges: Edge[] = graph.edges.map(edge => {
        const edgeStyle = EDGE_STYLE[edge.relation]
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edgeStyle.label,
            labelStyle: { fontSize: 10, fontWeight: 700, fill: edgeStyle.stroke },
            labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
            style: {
                stroke: edgeStyle.stroke,
                strokeWidth: Math.max(1, Math.round(edge.weight * 3)),
                strokeDasharray: edgeStyle.strokeDasharray,
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: edgeStyle.stroke,
                width: 12,
                height: 12,
            },
            data: { relation: edge.relation, weight: edge.weight, evidence: edge.evidence },
        }
    })

    return { nodes, edges }
}

// ΓöÇΓöÇΓöÇ Filter Bar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

type FilterState = 'all' | CognitiveNodeState
type FilterType  = 'all' | CognitiveNodeType

const STATE_FILTER_LABELS: { value: FilterState; label: string }[] = [
    { value: 'all', label: 'All States' },
    { value: 'tentative', label: 'Tentative' },
    { value: 'solidified', label: 'Solidified' },
    { value: 'reconsidering', label: 'Reconsidering' },
    { value: 'revised', label: 'Revised' },
    { value: 'doubled_down', label: 'Doubled Down' },
    { value: 'fallen_back', label: 'Fallen Back' },
]

const TYPE_FILTER_LABELS: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'trait', label: '≡ƒºá Traits' },
    { value: 'strength', label: 'Γ£ª Strengths' },
    { value: 'gap', label: 'ΓÜá Gaps' },
    { value: 'hypothesis', label: '? Hypotheses' },
    { value: 'observation', label: 'Γùï Observations' },
    { value: 'opinion', label: 'Γùå Opinions' },
]

// ΓöÇΓöÇΓöÇ Legend ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function GraphLegend() {
    return (
        <div className="absolute top-4 right-4 z-50 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 flex flex-col sm:flex-row gap-6 text-[10px] font-bold max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-auto">
            <div>
                <p className="uppercase tracking-widest text-gray-400 mb-1">Node Type</p>
                {TYPE_COLUMN_ORDER.map((type) => (
                    <div key={type} className="flex items-center gap-1 mb-0.5">
                        <span className="w-3 h-3 inline-flex items-center justify-center border border-black bg-white leading-none">
                            {TYPE_ICONS[type]}
                        </span>
                        <span className="capitalize">{type}</span>
                    </div>
                ))}
            </div>
            <div>
                <p className="uppercase tracking-widest text-gray-400 mb-1">Node State</p>
                {Object.entries(STATE_STYLES).map(([state, s]) => (
                    <div key={state} className="flex items-center gap-1 mb-0.5">
                        <span className="w-3 h-3 inline-block border" style={{ background: s.bg, borderColor: s.border }} />
                        <span className="capitalize">{state.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>
            <div>
                <p className="uppercase tracking-widest text-gray-400 mb-1">Edge Type</p>
                {Object.entries(EDGE_STYLE).map(([rel, s]) => (
                    <div key={rel} className="flex items-center gap-1 mb-0.5">
                        <span
                            className="inline-block"
                            style={{
                                width: 20,
                                height: 2,
                                background: s.stroke,
                                borderTop: s.strokeDasharray ? `2px dashed ${s.stroke}` : undefined,
                            }}
                        />
                        <span className="capitalize">{rel.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ΓöÇΓöÇΓöÇ Stats Bar ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function GraphStats({ graph, sessionCount }: { graph: CognitiveGraph; sessionCount: number }) {
    const stateCount = graph.nodes.reduce((acc, n) => {
        acc[n.state] = (acc[n.state] ?? 0) + 1
        return acc
    }, {} as Partial<Record<CognitiveNodeState, number>>)

    return (
        <div className="flex flex-wrap gap-3 px-6 py-3 border-b-2 border-black bg-black text-white text-xs font-black uppercase tracking-widest">
            <span>{graph.nodes.length} nodes</span>
            <span>┬╖</span>
            <span>{graph.edges.length} edges</span>
            <span>┬╖</span>
            <span>{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
            {stateCount.solidified ? <><span>┬╖</span><span className="text-green-400">{stateCount.solidified} solidified</span></> : null}
            {stateCount.reconsidering ? <><span>┬╖</span><span className="text-amber-400">{stateCount.reconsidering} reconsidering</span></> : null}
            {stateCount.doubled_down ? <><span>┬╖</span><span className="text-emerald-400">{stateCount.doubled_down} doubled down</span></> : null}
            {graph.meta.lastSessionTopic && (
                <>
                    <span>┬╖</span>
                    <span className="text-gray-300 font-medium">Last: {graph.meta.lastSessionTopic}</span>
                </>
            )}
        </div>
    )
}

// ΓöÇΓöÇΓöÇ Flow Canvas (isolated so useNodesState gets fresh initial values on filter change) ΓöÇΓöÇ

interface FlowCanvasProps {
    initialNodes: Node[]
    initialEdges: Edge[]
    onNodeClick: (e: React.MouseEvent, node: Node) => void
}

function FlowCanvas({ initialNodes, initialEdges, onNodeClick }: FlowCanvasProps) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes)
    const [edges, , onEdgesChange] = useEdgesState(initialEdges)

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            attributionPosition="bottom-right"
        >
            <Background color="#e2e8f0" gap={20} />
            <Controls showInteractive={false} />
            <MiniMap
                zoomable
                pannable
                style={{ border: '2px solid black', borderRadius: 0 }}
                nodeColor={n => {
                    const cogNode = (n.data as CogNodeData).node
                    return cogNode ? STATE_STYLES[cogNode.state].border : '#94a3b8'
                }}
            />
        </ReactFlow>
    )
}

// ΓöÇΓöÇΓöÇ Main Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface CognitiveGraphMapProps {
    graph: CognitiveGraph
    sessionCount?: number
}

function CognitiveGraphMapInner({ graph, sessionCount = 0 }: CognitiveGraphMapProps) {
    const [selectedNode, setSelectedNode] = useState<CognitiveNode | null>(null)
    const [stateFilter, setStateFilter] = useState<FilterState>('all')
    const [typeFilter, setTypeFilter] = useState<FilterType>('all')
    const [showLegend, setShowLegend] = useState(false)

    // Apply filters before computing flow elements
    const filteredGraph = useMemo<CognitiveGraph>(() => {
        const filteredNodes = graph.nodes.filter(n => {
            if (stateFilter !== 'all' && n.state !== stateFilter) return false
            if (typeFilter !== 'all' && n.type !== typeFilter) return false
            return true
        })
        const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
        const filteredEdges = graph.edges.filter(
            e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
        )
        return { ...graph, nodes: filteredNodes, edges: filteredEdges }
    }, [graph, stateFilter, typeFilter])

    const { nodes: initialNodes, edges: initialEdges } = useMemo(
        () => toFlowElements(filteredGraph),
        [filteredGraph]
    )

    const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        const cogNode = (node.data as CogNodeData).node
        setSelectedNode(prev => prev?.id === cogNode.id ? null : cogNode)
    }, [])

    return (
        <div className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {/* Section Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg">
                        Γ¼í
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Cognitive Graph</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                            Your evolving cognitive model ΓÇö across all sessions
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowLegend(v => !v)}
                    className="border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                >
                    {showLegend ? 'Hide' : 'Legend'}
                </button>
            </div>

            {/* Stats Bar */}
            <GraphStats graph={graph} sessionCount={sessionCount} />

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b-2 border-black bg-gray-50">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">State:</span>
                    <div className="flex flex-wrap gap-1">
                        {STATE_FILTER_LABELS.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setStateFilter(value)}
                                className={`text-[10px] px-2 py-0.5 font-black uppercase tracking-wider border transition-colors ${
                                    stateFilter === value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-black'
                                }`}
                                style={
                                    stateFilter !== value && value !== 'all'
                                        ? { borderColor: STATE_STYLES[value as CognitiveNodeState].border }
                                        : undefined
                                }
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Type:</span>
                    <div className="flex flex-wrap gap-1">
                        {TYPE_FILTER_LABELS.map(({ value, label }) => (
                            <button
                                key={value}
                                onClick={() => setTypeFilter(value)}
                                className={`text-[10px] px-2 py-0.5 font-black uppercase tracking-wider border transition-colors ${
                                    typeFilter === value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white text-gray-600 border-gray-300 hover:border-black hover:text-black'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Graph Canvas */}
            <div className="relative overflow-hidden" style={{ height: 560 }}>
                {showLegend && <GraphLegend />}
                {/* Accessibility summary */}
                <div className="sr-only" role="status" aria-live="polite">
                    Cognitive graph showing {filteredGraph.nodes.length} nodes and {filteredGraph.edges.length} connections.
                    {graph.nodes.filter(n => n.state === 'solidified').length} observations solidified.
                </div>

                {filteredGraph.nodes.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center">
                        <div>
                            <p className="text-4xl mb-3">Γêà</p>
                            <p className="font-black uppercase tracking-widest text-sm text-gray-500">
                                No nodes match the current filter
                            </p>
                            <button
                                onClick={() => { setStateFilter('all'); setTypeFilter('all') }}
                                className="mt-3 text-xs font-black uppercase tracking-widest underline hover:no-underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    </div>
                ) : (
                    // key forces FlowCanvas to remount with fresh useNodesState when filters change
                    <FlowCanvas
                        key={`${stateFilter}-${typeFilter}`}
                        initialNodes={initialNodes}
                        initialEdges={initialEdges}
                        onNodeClick={handleNodeClick}
                    />
                )}

                {selectedNode && (
                    <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
                )}
            </div>

            {/* Column Labels */}
            <div
                className="hidden md:grid border-t-2 border-black bg-gray-50 px-0"
                style={{ gridTemplateColumns: `repeat(${TYPE_COLUMN_ORDER.length}, ${COLUMN_WIDTH}px)` }}
            >
                {TYPE_COLUMN_ORDER.map(type => (
                    <div
                        key={type}
                        className="px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest border-r-2 border-black last:border-r-0"
                        style={{ color: '#555' }}
                    >
                        {TYPE_ICONS[type]} {type}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ΓöÇΓöÇΓöÇ Empty State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function CognitiveGraphEmpty() {
    return (
        <div className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 px-6 py-4 border-b-2 border-black">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg">Γ¼í</div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Cognitive Graph</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        Your evolving cognitive model ΓÇö across all sessions
                    </p>
                </div>
            </div>
            <div className="py-16 text-center px-6">
                <p className="text-5xl mb-4">Γ¼í</p>
                <h3 className="text-lg font-black uppercase tracking-tight mb-2">No Graph Built Yet</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Your cognitive graph is built automatically after each completed assessment.
                    Complete an investigation to see your cognitive model evolve here.
                </p>
            </div>
        </div>
    )
}

// ΓöÇΓöÇΓöÇ Public Export ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export { CognitiveGraphMapInner as CognitiveGraphMap, CognitiveGraphEmpty }