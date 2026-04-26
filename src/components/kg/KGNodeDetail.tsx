'use client'
// ─── KG Node Detail Panel ───────────────────────────────────────────
// Slide-in panel showing node details with assessment CTA.

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { KGNode, NodeType, EdgeRelation } from '@/lib/kg/types'

interface PrerequisiteInfo {
    id: string
    label: string
    type: NodeType
    weight: number
    rationale?: string
}

interface RelatedInfo {
    id: string
    label: string
    type: NodeType
    relation: EdgeRelation
    weight: number
    rationale?: string
}

interface KGNodeDetailProps {
    nodeId: string
    nodeLabel: string
    nodeType: NodeType
    nodeSubject?: string
    nodeNote?: string
    nodeSource: string
    onClose: () => void
    onFocusNode: (nodeId: string) => void
}

const TYPE_BADGES: Record<NodeType | string, { label: string; bg: string }> = {
    root: { label: 'ROOT', bg: 'bg-yellow-500' },
    subject: { label: 'SUBJECT', bg: 'bg-purple-600' },
    chapter: { label: 'CHAPTER', bg: 'bg-blue-500' },
    unit: { label: 'UNIT', bg: 'bg-orange-500' },
    domain: { label: 'DOMAIN', bg: 'bg-pink-500' },
    concept: { label: 'CONCEPT', bg: 'bg-green-500' },
}

export function KGNodeDetail({
    nodeId, nodeLabel, nodeType, nodeSubject, nodeNote, nodeSource,
    onClose, onFocusNode
}: KGNodeDetailProps) {
    const router = useRouter()
    const [detail, setDetail] = useState<{
        ancestors: KGNode[]
        prerequisites: PrerequisiteInfo[]
        related: RelatedInfo[]
        concepts: KGNode[]
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/kg/node?id=${encodeURIComponent(nodeId)}`)
            .then(res => res.json())
            .then(data => {
                setDetail({
                    ancestors: data.ancestors || [],
                    prerequisites: data.prerequisites || [],
                    related: data.related || [],
                    concepts: data.concepts || [],
                })
            })
            .catch(err => console.error('Failed to load node detail:', err))
            .finally(() => setLoading(false))
    }, [nodeId])

    const handleStartAssessment = () => {
        router.push(
            `/assessment/framing?topic=${encodeURIComponent(nodeLabel)}&kgNode=${encodeURIComponent(nodeId)}`
        )
    }

    const badge = TYPE_BADGES[nodeType] || TYPE_BADGES.concept
    const canAssess = nodeType === 'concept' || nodeType === 'chapter' || nodeType === 'unit' || nodeType === 'domain'
    const conceptCount = detail?.concepts.length || 0

    return (
        <div className="absolute bottom-4 left-4 w-[380px] max-h-[calc(100vh-140px)] overflow-y-auto bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-20 animate-slide-up">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b-2 border-black p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className={`${badge.bg} text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider`}>
                            {badge.label}
                        </span>
                        {nodeSource === 'llm-generated' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 uppercase border border-amber-300">
                                AI
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-black text-black leading-tight truncate">{nodeLabel}</h3>
                    {nodeSubject && (
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{nodeSubject}</p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-black hover:text-white transition-colors font-black text-sm"
                    aria-label="Close panel"
                >
                    ✕
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Breadcrumb ancestors */}
                {detail?.ancestors && detail.ancestors.length > 0 && (
                    <div className="text-xs text-gray-400 font-medium">
                        {[...detail.ancestors].reverse().map((a, i) => (
                            <span key={a.id}>
                                <button
                                    onClick={() => onFocusNode(a.id)}
                                    className="hover:text-black hover:underline transition-colors"
                                >
                                    {a.label}
                                </button>
                                {i < detail.ancestors.length - 1 && <span className="mx-1">→</span>}
                            </span>
                        ))}
                        <span className="mx-1">→</span>
                        <span className="text-black font-bold">{nodeLabel}</span>
                    </div>
                )}

                {/* Note */}
                {nodeNote && (
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-200 p-3">
                        {nodeNote}
                    </p>
                )}

                {/* Prerequisites */}
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
                        Loading details...
                    </div>
                ) : (
                    <>
                        {detail?.prerequisites && detail.prerequisites.length > 0 && (
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">
                                    Prerequisites
                                </h4>
                                <ul className="space-y-1.5">
                                    {detail.prerequisites.map(p => (
                                        <li key={p.id} className="flex items-center gap-2">
                                            <button
                                                onClick={() => onFocusNode(p.id)}
                                                className="text-sm font-medium text-blue-600 hover:text-black hover:underline transition-colors truncate"
                                            >
                                                {p.label}
                                            </button>
                                            <span className="ml-auto text-[10px] text-gray-400 font-mono shrink-0">
                                                w:{p.weight.toFixed(1)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Related concepts */}
                        {detail?.related && detail.related.length > 0 && (
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-200 pb-1">
                                    Related
                                </h4>
                                <ul className="space-y-1.5">
                                    {detail.related.slice(0, 6).map(r => (
                                        <li key={r.id} className="flex items-center gap-2">
                                            <button
                                                onClick={() => onFocusNode(r.id)}
                                                className="text-sm font-medium text-orange-600 hover:text-black hover:underline transition-colors truncate"
                                            >
                                                {r.label}
                                            </button>
                                            <span className="ml-auto text-[10px] text-gray-400 font-mono shrink-0 uppercase">
                                                {r.relation.replace('_', ' ')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {/* Assessment CTA */}
                {canAssess && (
                    <div className="pt-2 border-t-2 border-black space-y-2">
                        {conceptCount > 0 && (
                            <p className="text-xs text-gray-500 font-medium">
                                {conceptCount} concept{conceptCount !== 1 ? 's' : ''} available for assessment
                            </p>
                        )}
                        <button
                            onClick={handleStartAssessment}
                            className="brutalist-button w-full text-sm py-3 group"
                        >
                            <span className="flex items-center justify-center gap-2">
                                START ASSESSMENT
                                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                            </span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
