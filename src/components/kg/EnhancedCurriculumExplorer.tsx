'use client'
// ─── Enhanced Curriculum Explorer ───────────────────────────────────
// Full-viewport interactive KG explorer with:
// - Tree view (hierarchical subject → chapter → concept navigation)
// - Graph view (vis-network, force-directed, wide layout)
// - Subject cards (overview with stats per subject)
// - Seamless switching between views
// - Integrated search, filtering, and assessment navigation
//
// Design: Brutalist — off-white surface, black ink, sharp edges,
// bold typography. Consistent with the STREETS design system.

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGraphRAG, type EnrichedVisNode, type EnrichedVisEdge, type ViewMode } from '@/hooks/useGraphRAG'
import { SubjectFilter } from './SubjectFilter'
import { SubjectCards } from './SubjectCards'
import { SubjectTreeNavigator } from './SubjectTreeNavigator'
import { EnhancedNodeDetail } from './EnhancedNodeDetail'
import { GraphRAGChat } from './GraphRAGChat'
import type { NodeType, ContentSource } from '@/lib/kg/types'

// ─── Legend Config ───────────────────────────────────────────────────

const TYPE_LEGEND = [
    { type: 'root', label: 'Root', color: '#c9a227', shape: '★' },
    { type: 'subject', label: 'Subject', color: '#7c6aef', shape: '⬡' },
    { type: 'chapter', label: 'Chapter', color: '#2196f3', shape: '■' },
    { type: 'unit', label: 'Unit', color: '#e65100', shape: '■' },
    { type: 'domain', label: 'Domain', color: '#9c27b0', shape: '■' },
    { type: 'concept', label: 'Concept', color: '#2e7d32', shape: '●' },
]

const EDGE_LEGEND = [
    { relation: 'contains', label: 'Contains', style: 'solid', color: '#999' },
    { relation: 'prerequisite', label: 'Prerequisite', style: 'solid', color: '#7c6aef' },
    { relation: 'related_to', label: 'Related', style: 'dashed', color: '#e65100' },
    { relation: 'applies_to', label: 'Applies To', style: 'dashed', color: '#9c27b0' },
]

// ─── Relation Labels ────────────────────────────────────────────────

const RELATION_VERBS: Record<string, string> = {
    contains: 'contains',
    prerequisite: 'is prerequisite for',
    related_to: 'is related to',
    applies_to: 'applies to',
}

interface SelectedNode {
    id: string
    label: string
    type: NodeType
    subject?: string
    note?: string
    source: ContentSource
}

// ─── View Mode Tabs ─────────────────────────────────────────────────

const VIEW_TABS: { mode: ViewMode; label: string; icon: string }[] = [
    { mode: 'tree', label: 'Browse', icon: '⊟' },
    { mode: 'graph', label: 'Arena', icon: '◎' },
    { mode: 'subject', label: 'Subjects', icon: '◫' },
]

// ─── Component ──────────────────────────────────────────────────────

export function EnhancedCurriculumExplorer() {
    const router = useRouter()
    const networkRef = useRef<HTMLDivElement>(null)
    const visNetworkRef = useRef<any>(null)

    const {
        nodes, edges, subjects, metadata,
        subjectStats, sourceBreakdown,
        hierarchyTree,
        loading, error,
        filterBySubject, search,
        currentSubject, viewMode, setViewMode,
        searchQuery, stats,
    } = useGraphRAG()

    const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)
    const [hoverInfo, setHoverInfo] = useState<{
        label: string; type: string; subject?: string; note?: string
        fromLabel?: string; toLabel?: string
        relation?: string; rationale?: string; weight?: number; source?: string
    } | null>(null)
    const [searchInputValue, setSearchInputValue] = useState('')
    const [showLegend, setShowLegend] = useState(true)
    const [chatOpen, setChatOpen] = useState(false)

    // ── Initialize vis-network (graph mode only) ───────────────────────

    useEffect(() => {
        if (loading || !networkRef.current || nodes.length === 0 || viewMode !== 'graph') return

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
                    scaling: { min: 10, max: 40 },
                },
                edges: {
                    selectionWidth: 2,
                    font: {
                        size: 10,
                        color: '#666',
                        strokeWidth: 3,
                        strokeColor: '#F4F4F0',
                    },
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
                    hideEdgesOnZoom: false,
                    zoomSpeed: 0.5,
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

            // Auto-fit after stabilization so the graph fills the viewport
            network.on('stabilizationIterationsDone', () => {
                network.fit({
                    animation: { duration: 800, easingFunction: 'easeInOutQuad' },
                })
            })

            // Click → select node
            network.on('click', (params: any) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0]
                    const nodeData = nodes.find(n => n.id === nodeId) as EnrichedVisNode | undefined
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

            // Hover → quick info (nodes)
            network.on('hoverNode', (params: any) => {
                const nodeData = nodes.find(n => n.id === params.node) as EnrichedVisNode | undefined
                if (nodeData) {
                    setHoverInfo({
                        label: nodeData.label,
                        type: nodeData._type,
                        subject: nodeData._subject,
                        note: nodeData._note,
                        source: nodeData._source,
                    })
                }
            })
            network.on('blurNode', () => setHoverInfo(null))

            // Hover → semantic edge description
            network.on('hoverEdge', (params: any) => {
                const edgeItem = (data.edges as any).get(params.edge)
                if (!edgeItem) return
                const orig = edges.find(e => e.from === edgeItem.from && e.to === edgeItem.to) as EnrichedVisEdge | undefined
                if (orig) {
                    const fromNode = nodes.find(n => n.id === orig.from) as EnrichedVisNode | undefined
                    const toNode = nodes.find(n => n.id === orig.to) as EnrichedVisNode | undefined
                    const verb = RELATION_VERBS[orig._relation] || orig._relation?.replace('_', ' ') || 'connects to'
                    setHoverInfo({
                        label: `${fromNode?.label || '?'} ${verb} ${toNode?.label || '?'}`,
                        type: 'relationship',
                        fromLabel: fromNode?.label,
                        toLabel: toNode?.label,
                        relation: orig._relation,
                        rationale: orig._rationale,
                        weight: orig._weight,
                        source: orig._source,
                    })
                }
            })
            network.on('blurEdge', () => setHoverInfo(null))

            // Double-click → start assessment
            network.on('doubleClick', (params: any) => {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0]
                    const nodeData = nodes.find(n => n.id === nodeId) as EnrichedVisNode | undefined
                    if (nodeData && ['concept', 'chapter', 'unit', 'domain'].includes(nodeData._type)) {
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
    }, [nodes, edges, loading, router, viewMode])

    // ── Focus on node ──────────────────────────────────────────────────

    const handleFocusNode = useCallback((nodeId: string) => {
        if (viewMode !== 'graph') {
            setViewMode('graph')
        }

        const nodeData = nodes.find(n => n.id === nodeId) as EnrichedVisNode | undefined
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

        setTimeout(() => {
            if (visNetworkRef.current) {
                visNetworkRef.current.focus(nodeId, {
                    scale: 1.5,
                    animation: { duration: 600, easingFunction: 'easeInOutQuad' },
                })
                visNetworkRef.current.selectNodes([nodeId])
            }
        }, 100)
    }, [nodes, viewMode, setViewMode])

    // ── Reset ──────────────────────────────────────────────────────────

    const handleReset = useCallback(() => {
        setSearchInputValue('')
        search('')
        filterBySubject(null)
        setSelectedNode(null)
        if (visNetworkRef.current) {
            visNetworkRef.current.fit({
                animation: { duration: 600, easingFunction: 'easeInOutQuad' },
            })
        }
    }, [search, filterBySubject])

    const handleSearchChange = useCallback((value: string) => {
        setSearchInputValue(value)
        search(value)
    }, [search])

    // ── Loading ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin" />
                <p className="text-black/60 text-sm font-bold uppercase tracking-widest">Loading Curriculum…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md">
                    <h2 className="text-xl font-black mb-3 uppercase">Something went wrong</h2>
                    <p className="text-gray-600">{error}</p>
                    <button onClick={() => window.location.reload()} className="brutalist-button mt-4">Retry</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col relative overflow-hidden">
            {/* ── Header Bar ─────────────────────────────────────────────── */}
            <header className="flex items-center gap-3 px-6 py-4 bg-white border-b-4 border-black flex-wrap z-10">
                {/* Title */}
                <h1 className="text-xl font-black uppercase tracking-tight text-black whitespace-nowrap">
                    EXPLORE
                </h1>

                {/* View Mode Toggle */}
                <div className="flex items-center border-2 border-black overflow-hidden">
                    {VIEW_TABS.map(tab => (
                        <button
                            key={tab.mode}
                            onClick={() => setViewMode(tab.mode)}
                            className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all border-r-2 border-black last:border-r-0
                                ${viewMode === tab.mode
                                    ? 'bg-black text-white'
                                    : 'bg-white text-black hover:bg-gray-100'
                                }
                            `}
                        >
                            <span className="mr-1.5">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Subject Filter (for graph mode) */}
                {viewMode === 'graph' && (
                    <SubjectFilter
                        subjects={subjects}
                        currentSubject={currentSubject}
                        onFilter={filterBySubject}
                    />
                )}

                {/* Search + Reset */}
                <div className="flex items-center gap-2 ml-auto">
                    <input
                        type="text"
                        placeholder="Search…"
                        value={searchInputValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="brutalist-input px-3 py-2 text-sm w-[200px] placeholder:text-gray-400"
                    />
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-white text-black border-2 border-black hover:bg-black hover:text-white transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </header>

            {/* ── Graph View ──────────────────────────────────────────────── */}
            {viewMode === 'graph' && (
                <div className="flex-1 relative w-full bg-[#eeeee8] overflow-hidden" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <div
                        ref={networkRef}
                        className="absolute inset-0 w-full h-full"
                    />

                    {/* Legend Sidebar */}
                    {showLegend && (
                        <div className="absolute top-20 right-4 w-[200px] bg-white border-2 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Legend</h3>
                                <button
                                    onClick={() => setShowLegend(false)}
                                    className="w-5 h-5 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white text-[10px] font-bold transition-colors"
                                >✕</button>
                            </div>
                            <div className="space-y-1.5">
                                {TYPE_LEGEND.map(item => (
                                    <div key={item.type} className="flex items-center gap-2 text-xs">
                                        <span className="text-sm w-4 text-center" style={{ color: item.color }}>{item.shape}</span>
                                        <span className="text-gray-600 font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <hr className="border-black/10 my-2" />
                            <div className="space-y-1.5">
                                {EDGE_LEGEND.map(item => (
                                    <div key={item.relation} className="flex items-center gap-2 text-xs">
                                        <div className="w-4 h-0 shrink-0" style={{ borderTop: `2px ${item.style} ${item.color}` }} />
                                        <span className="text-gray-600 font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <hr className="border-black/10 my-2" />
                            <p className="text-[10px] text-gray-400 leading-relaxed">
                                Click a topic for details. Double-click to start an assessment.
                            </p>
                        </div>
                    )}

                    {!showLegend && (
                        <button
                            onClick={() => setShowLegend(true)}
                            className="absolute top-20 right-4 px-3 py-1.5 text-[10px] font-black uppercase bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all z-10"
                        >Legend</button>
                    )}

                    {/* Hover Info Panel */}
                    {hoverInfo && !selectedNode && (
                        <div className="absolute bottom-16 left-4 max-w-[400px] bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 animate-slide-up">
                            <h4 className="text-sm font-black text-black mb-1">{hoverInfo.label}</h4>
                            {hoverInfo.type !== 'relationship' && (
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] bg-black text-white px-2 py-0.5 font-bold uppercase">
                                        {hoverInfo.type}
                                    </span>
                                    {hoverInfo.subject && <span className="text-[10px] text-gray-400 font-bold">{hoverInfo.subject}</span>}
                                </div>
                            )}
                            {hoverInfo.type === 'relationship' && hoverInfo.relation && (
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] bg-gray-800 text-white px-2 py-0.5 font-bold uppercase">
                                        {hoverInfo.relation.replace('_', ' ')}
                                    </span>
                                </div>
                            )}
                            {hoverInfo.note && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{hoverInfo.note}</p>}
                            {hoverInfo.rationale && <p className="text-xs text-gray-500 mt-1 leading-relaxed italic">{hoverInfo.rationale}</p>}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tree View ───────────────────────────────────────────────── */}
            {viewMode === 'tree' && hierarchyTree && (
                <div className="flex-1 overflow-y-auto" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <SubjectTreeNavigator
                        tree={hierarchyTree}
                        subject={currentSubject}
                        onNodeClick={handleFocusNode}
                    />
                </div>
            )}

            {/* ── Subject View ────────────────────────────────────────────── */}
            {viewMode === 'subject' && (
                <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 'calc(100vh - 80px)' }}>
                    <div className="max-w-4xl mx-auto space-y-6">
                        <SubjectCards
                            subjects={subjects}
                            stats={subjectStats}
                            sourceBreakdown={sourceBreakdown}
                            currentSubject={currentSubject}
                            onSelectSubject={(subj) => {
                                filterBySubject(subj)
                                if (subj) setViewMode('graph')
                            }}
                        />

                        {/* How to navigate guide */}
                        <div className="border-2 border-black bg-black text-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                            <h3 className="text-lg font-black uppercase tracking-tighter mb-3">How to Navigate</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-black">⊟ BROWSE</span>
                                    <p className="text-white/60 text-xs mt-1">
                                        Expand subjects, chapters, and concepts. Click any topic to start learning.
                                    </p>
                                </div>
                                <div>
                                    <span className="font-black">◎ ARENA</span>
                                    <p className="text-white/60 text-xs mt-1">
                                        Visual arena map of all topics and how they connect. Click for details, double-click to assess.
                                    </p>
                                </div>
                                <div>
                                    <span className="font-black">◫ SUBJECTS</span>
                                    <p className="text-white/60 text-xs mt-1">
                                        Overview of each subject. Click a subject to see its topics on the map.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Selected Node Detail Panel (visible in graph mode) ──────── */}
            {selectedNode && viewMode === 'graph' && (
                <EnhancedNodeDetail
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

            {/* ── GraphRAG Chat ────────────────────────────────────────── */}
            <GraphRAGChat isOpen={chatOpen} onClose={() => setChatOpen(false)} />

            {!chatOpen && (
                <button
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center z-40 group"
                    title="Ask about the curriculum"
                >
                    <div className="relative w-6 h-6 flex items-center justify-center">
                        <svg className="absolute inset-0 w-6 h-6 transition-opacity duration-200 opacity-100 group-hover:opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-200 opacity-0 group-hover:opacity-100 pb-1">💬</span>
                    </div>
                </button>
            )}

            {/* ── Bottom Nav ──────────────────────────────────────────────── */}
            <div className="absolute bottom-0 left-0 px-6 py-3 z-10">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="text-xs font-bold uppercase tracking-widest text-black/30 hover:text-black transition-colors"
                >
                    ← Dashboard
                </button>
            </div>
        </div>
    )
}
