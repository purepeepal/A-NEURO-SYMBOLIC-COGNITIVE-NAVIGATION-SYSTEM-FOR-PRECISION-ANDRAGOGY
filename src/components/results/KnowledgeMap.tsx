import React, { useCallback, useState } from 'react'
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ConfidenceIndicator } from '@/lib/assessment/uncertainty'

// Typed interfaces (D9/Dr. Hassan directive — no more any[])
export interface KnowledgeNodeData {
    label: string
    mastery: 'mastered' | 'partial' | 'gap' | 'untested'
    questionsAsked: number
    accuracy: number
    confidence?: ConfidenceIndicator
    [key: string]: unknown // Index signature for React Flow Node compatibility
}

export interface KnowledgeNodeType {
    id: string
    type: 'conceptNode'
    position: { x: number, y: number }
    data: KnowledgeNodeData
}

export interface KnowledgeEdgeType {
    id: string
    source: string
    target: string
    style?: { stroke: string }
}

// Detail panel for clicked nodes (D8/Cognitive Modeler directive)
function NodeDetailPanel({ data, onClose }: { data: KnowledgeNodeData, onClose: () => void }) {
    return (
        <div className="absolute top-4 right-4 z-50 w-72 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-black text-sm uppercase tracking-tight">{data.label}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-black font-bold text-lg leading-none">&times;</button>
            </div>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-500">Mastery:</span>
                    <span className="font-bold capitalize">{data.mastery}</span>
                </div>
                {data.questionsAsked > 0 ? (
                    <>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Questions:</span>
                            <span className="font-bold">{data.questionsAsked}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Accuracy:</span>
                            <span className="font-bold">{data.accuracy}%</span>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-400 italic text-xs">No questions asked on this concept yet.</p>
                )}
                {data.confidence && (
                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">{data.confidence.label}</p>
                        {data.confidence.caveat && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ {data.confidence.caveat}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// Custom Node — brutalist styling (D6/Delight directive)
function ConceptNode({ data }: { data: KnowledgeNodeData }) {
    const masteryColors = {
        mastered: 'bg-green-50 border-green-600 text-green-900',
        partial: 'bg-yellow-50 border-yellow-600 text-yellow-900',
        gap: 'bg-red-50 border-red-600 text-red-900',
        untested: 'bg-gray-50 border-gray-400 text-gray-500'
    }

    const colorClass = masteryColors[data.mastery as keyof typeof masteryColors] || masteryColors.untested

    return (
        <div className={`px-4 py-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] border-2 ${colorClass} min-w-[150px]`}>
            <Handle type="target" position={Position.Top} className="w-2 h-2" />

            <div className="flex flex-col">
                <div className="font-black text-sm uppercase tracking-tight" title={data.label}>{data.label}</div>

                {data.questionsAsked > 0 ? (
                    <div className="text-xs mt-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center opacity-80">
                            <span>{data.accuracy}%</span>
                            <span>({data.questionsAsked} q)</span>
                        </div>
                        {data.confidence && data.confidence.caveat && (
                            <div className="text-[10px] bg-white/50 px-1 py-0.5 leading-tight text-center font-bold">
                                {data.confidence.label}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs mt-1 opacity-60 italic">Not yet explored</div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
        </div>
    )
}

const nodeTypes = {
    conceptNode: ConceptNode
}

// Accessibility text summary (D6/Accessibility CRITICAL directive)
function GraphAccessibilitySummary({ nodes }: { nodes: KnowledgeNodeType[] }) {
    const counts = { mastered: 0, partial: 0, gap: 0, untested: 0 }
    nodes.forEach(n => counts[n.data.mastery]++)
    return (
        <div className="sr-only" role="status" aria-live="polite">
            {nodes.length} concepts mapped: {counts.mastered} mastered,
            {counts.partial} partial understanding, {counts.gap} gaps identified,
            {counts.untested} not yet tested.
        </div>
    )
}

export function KnowledgeMap({ treeData }: { treeData?: { nodes: KnowledgeNodeType[], edges: KnowledgeEdgeType[] } }) {
    const [selectedNode, setSelectedNode] = useState<KnowledgeNodeData | null>(null)

    if (!treeData || !treeData.nodes || treeData.nodes.length === 0) {
        return null
    }

    // Format edges to include arrow heads
    const formattedEdges = treeData.edges.map(edge => ({
        ...edge,
        markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.style?.stroke || '#94a3b8',
        },
    }))

    const [nodes, setNodes, onNodesChange] = useNodesState(treeData.nodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(formattedEdges)

    return (
        <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-12 mb-12 flex flex-col h-[300px] md:h-[500px] relative">
            <GraphAccessibilitySummary nodes={treeData.nodes} />

            <div className="p-6 pb-4 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">🗺️</span>
                    Your Conceptual Landscape
                </h2>
                <div className="flex gap-3 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 inline-block"></span> Mastered</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 inline-block"></span> Partial</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 inline-block"></span> Gap</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-400 inline-block"></span> Untested</span>
                </div>
            </div>

            {selectedNode && (
                <NodeDetailPanel data={selectedNode} onClose={() => setSelectedNode(null)} />
            )}

            <div className="flex-1 w-full bg-slate-50">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    onNodeClick={(_, node) => setSelectedNode(node.data as unknown as KnowledgeNodeData)}
                    fitView
                    attributionPosition="bottom-right"
                    minZoom={0.5}
                    maxZoom={1.5}
                >
                    <Background color="#ccc" gap={16} />
                    <Controls showInteractive={false} />
                    <MiniMap zoomable pannable nodeColor={(n) => {
                        const mastery = n.data?.mastery;
                        if (mastery === 'mastered') return '#22c55e';
                        if (mastery === 'partial') return '#eab308';
                        if (mastery === 'gap') return '#ef4444';
                        return '#cbd5e1';
                    }} />
                </ReactFlow>
            </div>
        </div>
    )
}
