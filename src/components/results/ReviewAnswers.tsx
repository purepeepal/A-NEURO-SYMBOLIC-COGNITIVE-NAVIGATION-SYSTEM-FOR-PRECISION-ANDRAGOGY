'use client'
import { useEffect, useState } from 'react'
import { BrutalBadge } from '@/components/ui/brutal-badge'
import { ResponseItem, ERROR_TYPE_CONFIG, DIFFICULTY_LABELS, formatTime } from './review-answers-utils'

export function ReviewAnswers({ assessmentId }: { assessmentId: string }) {
    const [responses, setResponses] = useState<ResponseItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all')

    useEffect(() => {
        async function fetchResponses() {
            try {
                const res = await fetch(`/api/assessment/${assessmentId}/responses`)
                if (!res.ok) throw new Error('Failed to load responses')
                const data = await res.json()
                setResponses(data.responses)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong')
            } finally {
                setLoading(false)
            }
        }
        fetchResponses()
    }, [assessmentId])

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const expandAll = () => {
        setExpandedIds(new Set(filteredResponses.map(r => r.id)))
    }

    const collapseAll = () => {
        setExpandedIds(new Set())
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto mb-4" />
                    <p className="font-bold uppercase tracking-wider text-gray-500 text-sm">Loading responses...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="border-2 border-red-500 bg-red-50 p-6 text-center">
                <p className="font-bold text-red-700 mb-2">Failed to load responses</p>
                <p className="text-sm text-red-600">{error}</p>
            </div>
        )
    }

    if (responses.length === 0) {
        return (
            <div className="border-2 border-gray-300 bg-gray-50 p-8 text-center">
                <div className="text-4xl mb-4">≡ƒô¡</div>
                <p className="font-bold text-gray-600">No responses recorded for this assessment.</p>
            </div>
        )
    }

    const correctCount = responses.filter(r => r.is_correct).length
    const incorrectCount = responses.filter(r => r.is_correct === false).length
    const filteredResponses = filter === 'all'
        ? responses
        : filter === 'correct'
            ? responses.filter(r => r.is_correct)
            : responses.filter(r => r.is_correct === false)

    return (
        <div className="space-y-6">
            {/* Summary Bar */}
            <div className="bg-white border-2 border-black p-4 shadow-brutal flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-2xl font-black">{responses.length}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-green-600">{correctCount}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Correct</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-red-600">{incorrectCount}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Incorrect</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter buttons */}
                    {(['all', 'correct', 'incorrect'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-colors ${filter === f
                                ? 'bg-black text-white'
                                : 'bg-white text-black hover:bg-gray-100'
                                }`}
                        >
                            {f}
                        </button>
                    ))}

                    <div className="w-px h-6 bg-gray-300 mx-1" />

                    <button
                        onClick={expandAll}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                    >
                        Expand All
                    </button>
                    <button
                        onClick={collapseAll}
                        className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-black transition-colors"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Question List */}
            <div className="space-y-3">
                {filteredResponses.map((r) => {
                    const isExpanded = expandedIds.has(r.id)
                    const errorConfig = r.error_type ? ERROR_TYPE_CONFIG[r.error_type] : null
                    const difficultyLabel = DIFFICULTY_LABELS[r.difficulty] || `Level ${r.difficulty}`

                    return (
                        <div
                            key={r.id}
                            className={`border-2 border-black bg-white transition-shadow ${isExpanded ? 'shadow-brutal' : 'shadow-sm hover:shadow-brutal'}`}
                        >
                            {/* Question Header (always visible) */}
                            <button
                                onClick={() => toggleExpand(r.id)}
                                className="w-full text-left p-4 flex items-start gap-4 focus:outline-none focus:ring-4 focus:ring-black/20"
                                aria-expanded={isExpanded}
                            >
                                {/* Question number + correctness indicator */}
                                <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center border-2 border-black font-black text-sm ${r.is_correct
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {r.is_correct ? 'Γ£ô' : 'Γ£ù'}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-black uppercase tracking-wider text-gray-400">Q{r.question_number}</span>
                                        <BrutalBadge color={r.is_correct ? 'green' : 'red'}>
                                            {r.concept}
                                        </BrutalBadge>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{difficultyLabel}</span>
                                        {r.time_taken_seconds !== null && (
                                            <span className="text-xs text-gray-400 font-mono">{formatTime(r.time_taken_seconds)}</span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-black leading-snug line-clamp-2">{r.question_text}</p>
                                </div>

                                <div className={`text-xs font-black transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                    Γû╝
                                </div>
                            </button>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="border-t-2 border-gray-100 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Answer Comparison */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className={`p-3 border-2 ${r.is_correct ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                            <div className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Your Answer</div>
                                            <p className={`font-bold ${r.is_correct ? 'text-green-700' : 'text-red-700'}`}>
                                                {r.question_type === 'mcq' && r.options && r.user_answer
                                                    ? `${r.user_answer.toUpperCase()}: ${(r.options as Record<string, string>)[r.user_answer] || r.user_answer}`
                                                    : r.user_answer || '(No answer)'
                                                }
                                            </p>
                                        </div>
                                        <div className="p-3 border-2 border-green-300 bg-green-50">
                                            <div className="text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Correct Answer</div>
                                            <p className="font-bold text-green-700">
                                                {r.question_type === 'mcq' && r.options && r.correct_answer
                                                    ? `${r.correct_answer.toUpperCase()}: ${(r.options as Record<string, string>)[r.correct_answer] || r.correct_answer}`
                                                    : r.correct_answer
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* MCQ Options (if applicable) */}
                                    {r.question_type === 'mcq' && r.options && (
                                        <div className="space-y-1.5">
                                            <div className="text-xs font-black uppercase tracking-wider text-gray-500">Options</div>
                                            {Object.entries(r.options as Record<string, string>).map(([key, value]) => {
                                                const isUserChoice = r.user_answer === key
                                                const isCorrectChoice = r.correct_answer === key
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`px-3 py-2 text-sm border-2 flex items-center gap-2 ${isCorrectChoice
                                                            ? 'border-green-400 bg-green-50 font-bold'
                                                            : isUserChoice && !r.is_correct
                                                                ? 'border-red-400 bg-red-50'
                                                                : 'border-gray-200 bg-white'
                                                            }`}
                                                    >
                                                        <span className="font-mono text-xs font-bold w-5">{key}.</span>
                                                        <span className="flex-1">{value}</span>
                                                        {isCorrectChoice && <span className="text-green-600 text-xs font-black">Γ£ô CORRECT</span>}
                                                        {isUserChoice && !r.is_correct && <span className="text-red-600 text-xs font-black">YOUR PICK</span>}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Error Type + Explanation */}
                                    {errorConfig && r.error_type !== 'correct' && (
                                        <div className={`p-3 border-2 ${errorConfig.bg}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-xs font-black uppercase tracking-wider ${errorConfig.color}`}>
                                                    {errorConfig.label}
                                                </span>
                                            </div>
                                            {r.error_explanation && (
                                                <p className="text-sm text-gray-700 leading-relaxed">{r.error_explanation}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Correct answer explanation (when correct) */}
                                    {r.is_correct && r.error_explanation && (
                                        <div className="p-3 border-2 border-green-200 bg-green-50">
                                            <div className="text-xs font-black uppercase tracking-wider text-green-600 mb-1">Explanation</div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{r.error_explanation}</p>
                                        </div>
                                    )}

                                    {/* Confidence indicator */}
                                    {r.confidence_level !== null && r.confidence_level !== undefined && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="font-black uppercase tracking-wider text-gray-400">Confidence:</span>
                                            <div className="w-24 bg-gray-200 h-2 border border-black">
                                                <div
                                                    className="h-full bg-black transition-all"
                                                    style={{ width: `${r.confidence_level * 100}%` }}
                                                />
                                            </div>
                                            <span className="font-mono font-bold">{Math.round(r.confidence_level * 100)}%</span>
                                        </div>
                                    )}

                                    {/* Metadata row */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-2 border-t border-gray-100">
                                        <span className="font-bold uppercase">Type: {r.question_type.replace('_', ' ')}</span>
                                        <span>ΓÇó</span>
                                        <span className="font-bold uppercase">Difficulty: {r.difficulty}/5</span>
                                        {r.objective && (
                                            <>
                                                <span>ΓÇó</span>
                                                <span className="font-bold uppercase">Objective: {r.objective}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Filter Empty State */}
            {filteredResponses.length === 0 && (
                <div className="border-2 border-gray-300 bg-gray-50 p-6 text-center">
                    <p className="font-bold text-gray-500">No {filter} responses to show.</p>
                    <button
                        onClick={() => setFilter('all')}
                        className="text-sm text-black underline mt-2 font-bold"
                    >
                        Show all responses
                    </button>
                </div>
            )}
        </div>
    )
}
