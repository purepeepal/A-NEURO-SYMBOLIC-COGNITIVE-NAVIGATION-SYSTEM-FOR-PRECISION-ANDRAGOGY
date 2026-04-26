'use client'
// ─── Enhanced KG Node Detail Panel ──────────────────────────────────
// Slide-up panel showing full GraphRAG context for a node:
// ancestors, prerequisites with rationale, related concepts,
// assessable concept count, and assessment CTA.
// Now includes edge descriptions, source tags, and concept previews.

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { KGNode, NodeType, EdgeRelation, ContentSource } from '@/lib/kg/types'

// ─── Types ──────────────────────────────────────────────────────────

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

interface EnhancedNodeDetailProps {
    nodeId: string
    nodeLabel: string
    nodeType: NodeType
    nodeSubject?: string
    nodeNote?: string
    nodeSource: ContentSource
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

const RELATION_LABELS: Record<EdgeRelation, { label: string; icon: string; color: string }> = {
    contains: { label: 'Contains', icon: '▸', color: 'text-gray-400' },
    prerequisite: { label: 'Prerequisite', icon: '◆', color: 'text-purple-600' },
    related_to: { label: 'Related', icon: '↔', color: 'text-orange-500' },
    applies_to: { label: 'Applies To', icon: '→', color: 'text-pink-500' },
}

// ─── Component ──────────────────────────────────────────────────────

export function EnhancedNodeDetail({
    nodeId, nodeLabel, nodeType, nodeSubject, nodeNote, nodeSource,
    onClose, onFocusNode
}: EnhancedNodeDetailProps) {
    const router = useRouter()
    const [detail, setDetail] = useState<{
        ancestors: KGNode[]
        prerequisites: PrerequisiteInfo[]
        related: RelatedInfo[]
        concepts: KGNode[]
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState<'overview' | 'prereqs' | 'related' | 'concepts'>('overview')

    useEffect(() => {
        setLoading(true)
        setActiveSection('overview')
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
    const prereqCount = detail?.prerequisites.length || 0
    const relatedCount = detail?.related.length || 0

    const sections = [
        { key: 'overview' as const, label: 'Overview', count: null },
        { key: 'prereqs' as const, label: 'Prerequisites', count: prereqCount },
        { key: 'related' as const, label: 'Related', count: relatedCount },
        { key: 'concepts' as const, label: 'Concepts', count: conceptCount },
    ]

    return (
        <div className="absolute bottom-4 left-4 w-[400px] max-h-[calc(100vh-140px)] overflow-hidden bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-20 flex flex-col animate-slide-up">
            {/* Header */}
            <div className="bg-white border-b-2 border-black p-4 flex items-start justify-between gap-3 shrink-0">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`${badge.bg} text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-wider`}>
                            {badge.label}
                        </span>
                        {nodeSource === 'llm-generated' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 uppercase border border-amber-300">
                                AI-GENERATED
                            </span>
                        )}
                        {nodeSource === 'seed' && (
                            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 uppercase border border-green-300">
                                SEED
                            </span>
                        )}
                        {nodeSubject && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {nodeSubject}
                            </span>
                        )}
                    </div>
                    <h3 className="text-lg font-black text-black leading-tight">{nodeLabel}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white transition-colors text-lg font-black shrink-0"
                >
                    ✕
                </button>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b-2 border-black shrink-0">
                {sections.map(sec => (
                    <button
                        key={sec.key}
                        onClick={() => setActiveSection(sec.key)}
                        className={`flex-1 px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-colors
                            ${activeSection === sec.key
                                ? 'bg-black text-white'
                                : 'bg-white text-gray-500 hover:bg-gray-50'
                            }
                            ${sec.key !== 'concepts' ? 'border-r-2 border-black' : ''}
                        `}
                    >
                        {sec.label}
                        {sec.count !== null && sec.count > 0 && (
                            <span className={`ml-1 ${activeSection === sec.key ? 'text-white/60' : 'text-gray-300'}`}>
                                ({sec.count})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center p-8">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin" />
                </div>
            )}

            {/* Content */}
            {!loading && detail && (
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Overview section */}
                    {activeSection === 'overview' && (
                        <div className="space-y-4">
                            {/* Breadcrumb path */}
                            {detail.ancestors.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                        PATH IN CURRICULUM
                                    </h4>
                                    <div className="flex items-center flex-wrap gap-1 text-xs">
                                        {[...detail.ancestors].reverse().map((a, i) => (
                                            <span key={a.id} className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onFocusNode(a.id)}
                                                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                                >
                                                    {a.label}
                                                </button>
                                                {i < detail.ancestors.length - 1 && (
                                                    <span className="text-gray-300">→</span>
                                                )}
                                            </span>
                                        ))}
                                        <span className="text-gray-300">→</span>
                                        <span className="font-black text-black">{nodeLabel}</span>
                                    </div>
                                </div>
                            )}

                            {/* Note / Description */}
                            {nodeNote && (
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                        DESCRIPTION
                                    </h4>
                                    <p className="text-sm text-gray-600 leading-relaxed">{nodeNote}</p>
                                </div>
                            )}

                            {/* Quick stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="border-2 border-black p-2 text-center">
                                    <div className="text-xl font-black text-black">{prereqCount}</div>
                                    <div className="text-[9px] font-bold uppercase text-gray-400">Prerequisites</div>
                                </div>
                                <div className="border-2 border-black p-2 text-center">
                                    <div className="text-xl font-black text-black">{relatedCount}</div>
                                    <div className="text-[9px] font-bold uppercase text-gray-400">Related</div>
                                </div>
                                <div className="border-2 border-black p-2 text-center">
                                    <div className="text-xl font-black text-black">{conceptCount}</div>
                                    <div className="text-[9px] font-bold uppercase text-gray-400">Concepts</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Prerequisites section */}
                    {activeSection === 'prereqs' && (
                        <div className="space-y-2">
                            {prereqCount === 0 && (
                                <p className="text-sm text-gray-400 italic">No prerequisites mapped</p>
                            )}
                            {detail.prerequisites.map(p => (
                                <div
                                    key={p.id}
                                    className="border-2 border-black p-3 hover:bg-purple-50 transition-colors cursor-pointer group"
                                    onClick={() => onFocusNode(p.id)}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-purple-600 font-bold">◆</span>
                                            <span className="font-bold text-sm text-black truncate">{p.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[10px] font-mono text-gray-400">w:{p.weight}</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 ${TYPE_BADGES[p.type]?.bg || 'bg-gray-300'} text-white uppercase`}>
                                                {p.type}
                                            </span>
                                        </div>
                                    </div>
                                    {p.rationale && (
                                        <p className="text-xs text-gray-500 mt-1 italic ml-5">{p.rationale}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Related section */}
                    {activeSection === 'related' && (
                        <div className="space-y-2">
                            {relatedCount === 0 && (
                                <p className="text-sm text-gray-400 italic">No cross-links mapped</p>
                            )}
                            {detail.related.map(r => {
                                const relConfig = RELATION_LABELS[r.relation] || RELATION_LABELS.related_to
                                return (
                                    <div
                                        key={r.id}
                                        className="border-2 border-black p-3 hover:bg-orange-50 transition-colors cursor-pointer"
                                        onClick={() => onFocusNode(r.id)}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={relConfig.color}>{relConfig.icon}</span>
                                                <span className="font-bold text-sm text-black truncate">{r.label}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase ${relConfig.color}`}>
                                                {relConfig.label}
                                            </span>
                                        </div>
                                        {r.rationale && (
                                            <p className="text-xs text-gray-500 mt-1 italic ml-5">{r.rationale}</p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Concepts section */}
                    {activeSection === 'concepts' && (
                        <div className="space-y-1">
                            {conceptCount === 0 && (
                                <p className="text-sm text-gray-400 italic">No sub-concepts</p>
                            )}
                            {detail.concepts.map(c => (
                                <div
                                    key={c.id}
                                    className="flex items-center justify-between px-3 py-2 border border-black/10 hover:bg-green-50 transition-colors cursor-pointer"
                                    onClick={() => onFocusNode(c.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 shrink-0" />
                                        <span className="text-sm font-medium text-black">{c.label}</span>
                                    </div>
                                    {c.source === 'llm-generated' && (
                                        <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 font-bold uppercase">AI</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Assessment CTA (sticky bottom) */}
            {canAssess && (
                <div className="shrink-0 p-4 border-t-2 border-black bg-white">
                    <button
                        onClick={handleStartAssessment}
                        className="w-full py-3 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-colors border-2 border-black hover:border-blue-600"
                    >
                        START ASSESSMENT
                        {conceptCount > 0 && (
                            <span className="text-white/60 ml-2 font-mono text-xs">
                                ({conceptCount} concept{conceptCount !== 1 ? 's' : ''})
                            </span>
                        )}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1 text-center uppercase tracking-wider">
                        or double-click a node in the graph
                    </p>
                </div>
            )}
        </div>
    )
}
