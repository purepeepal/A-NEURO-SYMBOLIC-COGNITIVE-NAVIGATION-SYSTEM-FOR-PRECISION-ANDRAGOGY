'use client'
// ─── Subject Cards ──────────────────────────────────────────────────
// Grid of subject cards for the subject-separated KG view.
// Each card shows subject stats, preview of chapters, and can be clicked
// to filter the graph/tree to that subject.

import type { ContentSource } from '@/lib/kg/types'

// ─── Types ──────────────────────────────────────────────────────────

interface SubjectStats {
    nodes: number
    chapters: number
    concepts: number
    edges: number
}

interface SubjectCardsProps {
    subjects: string[]
    stats: Record<string, SubjectStats>
    sourceBreakdown: { seed: number; llmGenerated: number }
    currentSubject: string | null
    onSelectSubject: (subject: string | null) => void
}

// ─── Constants ──────────────────────────────────────────────────────

const SUBJECT_CONFIG: Record<string, { icon: string; accent: string; bg: string; border: string; gradient: string }> = {
    Mathematics: {
        icon: '◈',
        accent: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        gradient: 'from-blue-500 to-blue-700',
    },
    Science: {
        icon: '◉',
        accent: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-500',
        gradient: 'from-green-500 to-green-700',
    },
    'Social Science': {
        icon: '◆',
        accent: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-500',
        gradient: 'from-orange-500 to-orange-700',
    },
}

const DEFAULT_CONFIG = {
    icon: '●',
    accent: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    gradient: 'from-gray-500 to-gray-700',
}

// ─── Component ──────────────────────────────────────────────────────

export function SubjectCards({ subjects, stats, sourceBreakdown, currentSubject, onSelectSubject }: SubjectCardsProps) {
    return (
        <div className="space-y-4">
            {/* Overview row */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black uppercase tracking-tighter text-black">Subjects</h2>
                    <span className="text-xs font-mono text-gray-400">
                        {subjects.length} subjects
                    </span>
                </div>
                {currentSubject && (
                    <button
                        onClick={() => onSelectSubject(null)}
                        className="px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-gray-800 transition-colors border-2 border-black"
                    >
                        ← SHOW ALL
                    </button>
                )}
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subjects.map(subject => {
                    const config = SUBJECT_CONFIG[subject] || DEFAULT_CONFIG
                    const s = stats[subject] || { nodes: 0, chapters: 0, concepts: 0, edges: 0 }
                    const isActive = currentSubject === subject

                    return (
                        <button
                            key={subject}
                            onClick={() => onSelectSubject(isActive ? null : subject)}
                            className={`
                                text-left p-5 border-2 transition-all group
                                ${isActive
                                    ? `${config.border} bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]`
                                    : `border-black ${config.bg} hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`
                                }
                            `}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-2xl ${isActive ? 'text-white' : config.accent}`}>
                                    {config.icon}
                                </span>
                                <span className={`text-lg font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-black'}`}>
                                    {subject}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <div className={`text-2xl font-black ${isActive ? 'text-white' : 'text-black'}`}>
                                        {s.chapters}
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                                        Chapters
                                    </div>
                                </div>
                                <div>
                                    <div className={`text-2xl font-black ${isActive ? 'text-white' : 'text-black'}`}>
                                        {s.concepts}
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                                        Concepts
                                    </div>
                                </div>
                                <div>
                                    <div className={`text-2xl font-black ${isActive ? 'text-white' : 'text-black'}`}>
                                        {s.edges}
                                    </div>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/60' : 'text-gray-400'}`}>
                                        Connections
                                    </div>
                                </div>
                            </div>

                            <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white/50' : 'text-gray-300 group-hover:text-gray-500'} transition-colors`}>
                                {isActive ? 'VIEWING' : 'CLICK TO EXPLORE →'}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
