'use client'
// ─── Subject Tree Navigator ─────────────────────────────────────────
// Hierarchical tree view for each subject showing chapters → units →
// concepts. Brutalist-styled with interactive expand/collapse and
// "Start Assessment" buttons on assessable nodes.

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { HierarchyNode } from '@/lib/kg/graphrag-service'
import type { NodeType, ContentSource } from '@/lib/kg/types'

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_BADGES: Record<NodeType | string, { label: string; color: string; bg: string }> = {
    root: { label: 'ROOT', color: 'text-yellow-900', bg: 'bg-yellow-300' },
    subject: { label: 'SUBJECT', color: 'text-purple-900', bg: 'bg-purple-300' },
    chapter: { label: 'CHAPTER', color: 'text-blue-900', bg: 'bg-blue-200' },
    unit: { label: 'UNIT', color: 'text-orange-900', bg: 'bg-orange-200' },
    domain: { label: 'DOMAIN', color: 'text-pink-900', bg: 'bg-pink-200' },
    concept: { label: 'CONCEPT', color: 'text-green-900', bg: 'bg-green-200' },
}

const SUBJECT_ACCENTS: Record<string, string> = {
    Mathematics: 'border-l-blue-400',
    Science: 'border-l-green-400',
    'Social Science': 'border-l-orange-400',
}

// ─── TreeNode Component ─────────────────────────────────────────────

interface TreeNodeProps {
    node: HierarchyNode
    depth: number
    onStartAssessment: (nodeId: string, label: string) => void
    onNodeClick: (nodeId: string) => void
    expandedIds: Set<string>
    toggleExpand: (id: string) => void
}

function TreeNode({ node, depth, onStartAssessment, onNodeClick, expandedIds, toggleExpand }: TreeNodeProps) {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children.length > 0
    const canAssess = node.type === 'concept' || node.type === 'chapter' || node.type === 'unit' || node.type === 'domain'
    const badge = TYPE_BADGES[node.type] || TYPE_BADGES.concept
    const subjectAccent = node.subject ? SUBJECT_ACCENTS[node.subject] || 'border-l-gray-300' : 'border-l-gray-300'

    return (
        <div className="group">
            <div
                className={`
                    flex items-center gap-3 px-4 py-3 border-b border-black/10
                    hover:bg-black/5 transition-colors cursor-pointer
                    border-l-4 ${subjectAccent}
                `}
                style={{ paddingLeft: `${depth * 24 + 16}px` }}
                onClick={() => {
                    if (hasChildren) toggleExpand(node.id)
                    onNodeClick(node.id)
                }}
            >
                {/* Expand/Collapse indicator */}
                {hasChildren && (
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.id) }}
                        className="w-5 h-5 flex items-center justify-center text-xs font-black border-2 border-black bg-white hover:bg-black hover:text-white transition-all shrink-0"
                    >
                        {isExpanded ? '−' : '+'}
                    </button>
                )}
                {!hasChildren && <div className="w-5 h-5 shrink-0" />}

                {/* Badge */}
                <span className={`${badge.bg} ${badge.color} text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider shrink-0`}>
                    {badge.label}
                </span>

                {/* LLM-generated tag */}
                {node.source === 'llm-generated' && (
                    <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 uppercase border border-amber-400 shrink-0">
                        AI
                    </span>
                )}

                {/* Label */}
                <span className="font-bold text-sm text-black flex-1 min-w-0 truncate">
                    {node.label}
                </span>

                {/* Metadata chips */}
                <div className="flex items-center gap-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                    {node.conceptCount > 0 && node.type !== 'concept' && (
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 border border-gray-200">
                            {node.conceptCount} concepts
                        </span>
                    )}
                    {node.prerequisiteCount > 0 && (
                        <span className="text-[10px] font-mono text-purple-500 bg-purple-50 px-1.5 py-0.5 border border-purple-200">
                            {node.prerequisiteCount} prereqs
                        </span>
                    )}
                </div>

                {/* Start Assessment CTA */}
                {canAssess && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onStartAssessment(node.id, node.label)
                        }}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-black text-white hover:bg-blue-600 transition-all shrink-0 border-2 border-black hover:border-blue-600"
                    >
                        ASSESS →
                    </button>
                )}
            </div>

            {/* Note (expandable detail) */}
            {node.note && isExpanded && (
                <div
                    className="px-4 py-2 bg-gray-50 border-b border-black/10 text-xs text-gray-500 italic"
                    style={{ paddingLeft: `${depth * 24 + 60}px` }}
                >
                    {node.note}
                </div>
            )}

            {/* Children */}
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            onStartAssessment={onStartAssessment}
                            onNodeClick={onNodeClick}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────

interface SubjectTreeNavigatorProps {
    tree: HierarchyNode[]
    subject?: string | null
    onNodeClick?: (nodeId: string) => void
    onSwitchToGraph?: (nodeId: string) => void
}

export function SubjectTreeNavigator({ tree, subject, onNodeClick, onSwitchToGraph }: SubjectTreeNavigatorProps) {
    const router = useRouter()
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        // Auto-expand subjects
        const initial = new Set<string>()
        tree.forEach(node => {
            initial.add(node.id)
            node.children.forEach(child => initial.add(child.id))
        })
        return initial
    })
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const expandAll = useCallback(() => {
        const all = new Set<string>()
        const addAll = (nodes: HierarchyNode[]) => {
            nodes.forEach(n => {
                all.add(n.id)
                addAll(n.children)
            })
        }
        addAll(tree)
        setExpandedIds(all)
    }, [tree])

    const collapseAll = useCallback(() => {
        // Keep only subjects expanded
        const minimal = new Set<string>()
        tree.forEach(n => minimal.add(n.id))
        setExpandedIds(minimal)
    }, [tree])

    const handleStartAssessment = useCallback((nodeId: string, label: string) => {
        router.push(`/assessment/framing?topic=${encodeURIComponent(label)}&kgNode=${encodeURIComponent(nodeId)}`)
    }, [router])

    const handleNodeClick = useCallback((nodeId: string) => {
        setSelectedNodeId(nodeId)
        onNodeClick?.(nodeId)
    }, [onNodeClick])

    // Filter tree if subject is specified
    const displayTree = subject
        ? tree.filter(node => node.label === subject || node.type === 'root')
        : tree

    // Count total nodes
    const countNodes = (nodes: HierarchyNode[]): number => {
        return nodes.reduce((acc, n) => acc + 1 + countNodes(n.children), 0)
    }

    return (
        <div className="flex flex-col h-full bg-white border-2 border-black">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black text-white border-b-2 border-black">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-black uppercase tracking-tighter">
                        {subject || 'CURRICULUM TREE'}
                    </span>
                    <span className="text-xs font-mono text-white/50">
                        {countNodes(displayTree)} topics
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={expandAll}
                        className="px-2 py-1 text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-2 py-1 text-[10px] font-bold uppercase bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                    >
                        Collapse
                    </button>
                </div>
            </div>

            {/* Tree Content */}
            <div className="flex-1 overflow-y-auto">
                {displayTree.map(node => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        onStartAssessment={handleStartAssessment}
                        onNodeClick={handleNodeClick}
                        expandedIds={expandedIds}
                        toggleExpand={toggleExpand}
                    />
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 bg-gray-50 border-t-2 border-black text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Click a topic to view details · Hover to reveal assessment button
            </div>
        </div>
    )
}
