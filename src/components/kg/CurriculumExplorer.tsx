'use client'
// ─── Curriculum Explorer ────────────────────────────────────────────
// Full-viewport interactive knowledge graph using vis-network.
// Adapted and improved from the reference Visualizer.html.

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useKGData, type VisNode, type VisEdge } from '@/hooks/useKGData'
import { SubjectFilter } from './SubjectFilter'
import { KGNodeDetail } from './KGNodeDetail'
import type { NodeType } from '@/lib/kg/types'

// ─── Type Legend Items ──────────────────────────────────────────────

const TYPE_LEGEND = [
    { type: 'root', label: 'Root', color: '#f0c040' },
    { type: 'subject', label: 'Subject', color: '#7c6aef' },
    { type: 'chapter', label: 'Chapter', color: '#4fc3f7' },
    { type: 'unit', label: 'Unit', color: '#ff8a65' },
    { type: 'domain', label: 'Domain', color: '#ce93d8' },
    { type: 'concept', label: 'Concept', color: '#5ee0a0' },
]

const EDGE_LEGEND = [
    { relation: 'contains', label: 'Contains', style: 'solid', color: 'rgba(255,255,255,0.3)' },
    { relation: 'prerequisite', label: 'Prerequisite', style: 'solid', color: '#7c6aef' },
    { relation: 'related_to', label: 'Related', style: 'dashed', color: '#ff8a65' },
    { relation: 'applies_to', label: 'Applies To', style: 'dashed', color: '#ce93d8' },
]

interface SelectedNode {
    id: string
    label: string
    type: NodeType
    subject?: string
    note?: string
    source: string
}

export function CurriculumExplorer() {
    const router = useRouter()
    const networkRef = useRef<HTMLDivElement>(null)
    const visNetworkRef = useRef<any>(null)
    const {
        nodes, edges, subjects, metadata,
        loading, error,
        filterBySubject, searchNodes,
        currentSubject, searchQuery, stats,
    } = useKGData()

    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
    const [hoverInfo, setHoverInfo] = useState<{
        label: string
        type: string
        subject?: string
        note?: string
        relation?: string
        rationale?: string
        weight?: number
    } | null>(null)
    const [searchInputValue, setSearchInputValue] = useState('')
    const [showLegend, setShowLegend] = useState(true)

    // ── Initialize vis-network ──────────────────────────────────────────

    useEffect(() => {
        if (loading || !networkRef.current || nodes.length === 0) return

        // Dynamic import vis-network (client-side only)
        const initNetwork = async () => {
            const vis = await import('vis-network/standalone')

            const container = networkRef.current!
            const data = {
                nodes: new vis.DataSet(nodes as any[]),
                edges: new vis.DataSet(edges as any[]),
            }

            const options: any = {
                nodes: {
                    shape: 'dot',
                    scaling: { min: 8, max: 36 },
                },
                edges: {
                    selectionWidth: 2,
                },
                physics: {
                    solver: 'forceAtlas2Based',
                    forceAtlas2Based: {
                        gravitationalConstant: -200,
                        centralGravity: 0.005,
                        springLength: 250,
                        springConstant: 0.05,
                        damping: 0.4,
                        avoidOverlap: 1,
                    },
                    stabilization: { iterations: 400, updateInterval: 25 },
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 100,
                    hideEdgesOnDrag: true,
                    hideEdgesOnZoom: true,
                    zoomSpeed: 0.6,
                },
                layout: {
                    improvedLayout: true,
                },
            }

            if (visNetworkRef.current) {
                visNetworkRef.current.destroy()
            }

            const network = new vis.Network(container, data, options)
            visNetworkRef.current = network

            // ── Click to select node ──────────────────────────────────────────
            network.on('click', (params: any) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0]
                    const nodeData = nodes.find(n => n.id === nodeId) as VisNode | undefined
                    if (nodeData) {
                        setSelectedNode({
                            id: nodeData.id,
                            label: nodeData.label,
                            type: nodeData._type,
                            subject: nodeData._subject,
                            note: nodeData._note,
                            source: nodeData._source,
                        })
                        network.focus(nodeId, {
                            scale: 1.5,
                            animation: { duration: 600, easingFunction: 'easeInOutQuad' },
                        })
                    }
                } else {
                    setSelectedNode(null)
                }
            })

            // ── Hover for quick info ──────────────────────────────────────────
            network.on('hoverNode', (params: any) => {
                const nodeData = nodes.find(n => n.id === params.node) as VisNode | undefined
                if (nodeData) {
                    setHoverInfo({
                        label: nodeData.label,
                        type: nodeData._type,
                        subject: nodeData._subject,
                        note: nodeData._note,
                    })
                }
            })
            network.on('blurNode', () => setHoverInfo(null))

            network.on('hoverEdge', (params: any) => {
                const edgeItem = (data.edges as any).get(params.edge)
                if (!edgeItem) return
                const orig = edges.find(e => e.from === edgeItem.from && e.to === edgeItem.to) as VisEdge | undefined
                if (orig && orig._rationale) {
                    setHoverInfo({
                        label: orig._relation || 'Edge',
                        type: 'edge',
                        relation: orig._relation,
                        rationale: orig._rationale,
                        weight: orig._weight,
                    })
                }
            })
            network.on('blurEdge', () => setHoverInfo(null))

            // ── Double-click to start assessment ──────────────────────────────
            network.on('doubleClick', (params: any) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0]
                    const nodeData = nodes.find(n => n.id === nodeId) as VisNode | undefined
                    if (nodeData && (nodeData._type === 'concept' || nodeData._type === 'chapter' || nodeData._type === 'unit')) {
                        router.push(
                            `/assessment/framing?topic=${encodeURIComponent(nodeData.label)}&kgNode=${encodeURIComponent(nodeData.id)}`
                        )
                    }
                }
            })
        }

        initNetwork()

        return () => {
            if (visNetworkRef.current) {
                visNetworkRef.current.destroy()
                visNetworkRef.current = null
            }
        }
    }, [nodes, edges, loading, router])

    // ── Focus on node (called from detail panel) ──────────────────────

    const handleFocusNode = useCallback((nodeId: string) => {
        const nodeData = nodes.find(n => n.id === nodeId) as VisNode | undefined
        if (nodeData) {
            setSelectedNode({
                id: nodeData.id,
                label: nodeData.label,
                type: nodeData._type,
                subject: nodeData._subject,
                note: nodeData._note,
                source: nodeData._source,
            })
        }
        if (visNetworkRef.current) {
            visNetworkRef.current.focus(nodeId, {
                scale: 1.5,
                animation: { duration: 600, easingFunction: 'easeInOutQuad' },
            })
            visNetworkRef.current.selectNodes([nodeId])
        }
    }, [nodes])

    // ── Reset view ────────────────────────────────────────────────────

    const handleReset = useCallback(() => {
        setSearchInputValue('')
        searchNodes('')
        filterBySubject(null)
        setSelectedNode(null)
        if (visNetworkRef.current) {
            visNetworkRef.current.fit({
                animation: { duration: 600, easingFunction: 'easeInOutQuad' },
            })
        }
    }, [searchNodes, filterBySubject])

    // ── Search handler ────────────────────────────────────────────────

    const handleSearchChange = useCallback((value: string) => {
        setSearchInputValue(value)
        searchNodes(value)
    }, [searchNodes])

    // ── Loading state ─────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-[#7c6aef] border-t-transparent animate-spin" />
                <p className="text-white/60 text-sm font-bold uppercase tracking-widest">Loading Knowledge Graph…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                    <h2 className="text-xl font-black mb-3 uppercase">Error</h2>
                    <p className="text-gray-600">{error}</p>
                    <button onClick={() => window.location.reload()} className="brutalist-button mt-4">
                        Retry
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f0f13] flex flex-col relative overflow-hidden">
            {/* ── Header Bar ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-[#16161d] to-[#1a1a24] border-b border-white/5 flex-wrap z-10">
                <h1 className="text-lg font-black bg-gradient-to-r from-[#7c6aef] to-[#4fc3f7] bg-clip-text text-transparent whitespace-nowrap">
                    EXPLORE
                </h1>

                <SubjectFilter
                    subjects={subjects}
                    currentSubject={currentSubject}
                    onFilter={filterBySubject}
                />

                <div className="flex items-center gap-2 ml-auto">
                    <input
                        type="text"
                        placeholder="Search nodes…"
                        value={searchInputValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="px-3 py-2 text-sm bg-[#1e1e28] text-white/80 border border-white/10 font-medium focus:border-[#7c6aef] focus:outline-none w-[200px] placeholder:text-white/30"
                    />
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#2a2a36] text-white/60 border border-white/10 hover:bg-[#333340] hover:text-white/80 transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className={`text-xs font-mono whitespace-nowrap ${stats.nodeCount > 0 ? 'text-[#5ee0a0]' : 'text-white/30'}`}>
                    {stats.nodeCount} nodes · {stats.edgeCount} edges
                </div>
            </div>

            {/* ── Network Canvas ──────────────────────────────────────────── */}
            <div className="flex-1 relative w-full overflow-hidden" style={{ minHeight: 'calc(100vh - 130px)' }}>
                <div ref={networkRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* ── Legend Sidebar ───────────────────────────────────────────── */}
            {showLegend && (
                <div className="absolute top-16 right-4 w-[200px] bg-[#16161d]/90 backdrop-blur-xl border border-white/5 p-3 z-10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-white/40">Legend</h3>
                        <button
                            onClick={() => setShowLegend(false)}
                            className="text-white/30 hover:text-white/60 text-xs"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        {TYPE_LEGEND.map(item => (
                            <div key={item.type} className="flex items-center gap-2 text-xs">
                                <div className="w-2.5 h-2.5 shrink-0" style={{ background: item.color, borderRadius: 0 }} />
                                <span className="text-white/60">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="border-white/5 my-2" />
                    <div className="space-y-1.5">
                        {EDGE_LEGEND.map(item => (
                            <div key={item.relation} className="flex items-center gap-2 text-xs">
                                <div className="w-4 h-0 shrink-0" style={{
                                    borderTop: `2px ${item.style} ${item.color}`,
                                }} />
                                <span className="text-white/60">{item.label}</span>
                            </div>
                        ))}
                    </div>
                    <hr className="border-white/5 my-2" />
                    <p className="text-[10px] text-white/30 leading-relaxed">
                        Click a node for details. Double-click to start assessment.
                    </p>
                </div>
            )}

            {!showLegend && (
                <button
                    onClick={() => setShowLegend(true)}
                    className="absolute top-16 right-4 px-3 py-1.5 text-[10px] font-bold uppercase bg-[#16161d]/90 text-white/40 border border-white/5 hover:text-white/60 z-10"
                >
                    Legend
                </button>
            )}

            {/* ── Hover Info Panel ─────────────────────────────────────────── */}
            {hoverInfo && !selectedNode && (
                <div className="absolute bottom-4 left-4 max-w-[360px] bg-[#16161d]/95 backdrop-blur-xl border border-white/5 p-4 z-10">
                    <h4 className="text-sm font-bold text-white/90 mb-1">{hoverInfo.label}</h4>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] bg-[#7c6aef]/20 text-[#a99ef5] px-2 py-0.5 font-bold uppercase">
                            {hoverInfo.type}
                        </span>
                        {hoverInfo.subject && (
                            <span className="text-[10px] text-white/40">{hoverInfo.subject}</span>
                        )}
                    </div>
                    {hoverInfo.note && (
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">{hoverInfo.note}</p>
                    )}
                    {hoverInfo.rationale && (
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">{hoverInfo.rationale}</p>
                    )}
                    {hoverInfo.weight !== undefined && (
                        <span className="text-[10px] text-white/30 font-mono mt-1 block">weight: {hoverInfo.weight}</span>
                    )}
                </div>
            )}

            {/* ── Selected Node Detail Panel ───────────────────────────────── */}
            {selectedNode && (
                <KGNodeDetail
                    nodeId={selectedNode.id}
                    nodeLabel={selectedNode.label}
                    nodeType={selectedNode.type}
                    nodeSubject={selectedNode.subject}
                    nodeNote={selectedNode.note}
                    nodeSource={selectedNode.source}
                    onClose={() => setSelectedNode(null)}
                    onFocusNode={handleFocusNode}
                />
            )}

            {/* ── Bottom Bar ───────────────────────────────────────────────── */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-gradient-to-t from-[#0f0f13] to-transparent pointer-events-none z-10">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors pointer-events-auto"
                >
                    ← View Past Assessments
                </button>
                {metadata && (
                    <span className="text-[10px] text-white/20 font-mono">
                        {metadata.title}
                    </span>
                )}
            </div>
        </div>
    )
}
