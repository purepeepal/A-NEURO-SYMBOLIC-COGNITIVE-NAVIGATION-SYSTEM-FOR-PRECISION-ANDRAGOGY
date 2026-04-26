'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrutalCard } from '@/components/ui/brutal-card'
import { BrutalButton } from '@/components/ui/brutal-button'
import { BrutalBadge } from '@/components/ui/brutal-badge'
import type { CognitiveGraph } from '@/lib/cognitive-graph/types'

// Lazy-load the graph map — ReactFlow uses browser-only APIs
const CognitiveGraphMap = dynamic(
    () => import('@/components/dashboard/CognitiveGraphMap').then(m => m.CognitiveGraphMap),
    { ssr: false, loading: () => (
        <div className="border-2 border-black h-48 flex items-center justify-center">
            <div className="text-center">
                <div className="w-6 h-6 border-4 border-black border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">Loading graph…</p>
            </div>
        </div>
    )}
)
const CognitiveGraphEmpty = dynamic(
    () => import('@/components/dashboard/CognitiveGraphMap').then(m => m.CognitiveGraphEmpty),
    { ssr: false }
)

interface AssessmentSummary {
    id: string
    topic: string
    status: 'in_progress' | 'completed' | 'abandoned'
    totalQuestions: number
    accuracy: number
    currentDifficulty: number
    startedAt: string
    completedAt: string | null
    duration: number | null
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadge(status: AssessmentSummary['status']) {
    switch (status) {
        case 'completed': return <BrutalBadge color="green">Completed</BrutalBadge>
        case 'in_progress': return <BrutalBadge color="yellow">In Progress</BrutalBadge>
        case 'abandoned': return <BrutalBadge color="red">Abandoned</BrutalBadge>
    }
}

export default function DashboardPage() {
    const [assessments, setAssessments] = useState<AssessmentSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [cognitiveGraph, setCognitiveGraph] = useState<CognitiveGraph | null>(null)
    const [graphSessionCount, setGraphSessionCount] = useState(0)
    const [graphLoading, setGraphLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function fetchHistory() {
            try {
                const res = await fetch('/api/user/assessments')
                if (!res.ok) {
                    if (res.status === 401) {
                        router.push('/auth/login')
                        return
                    }
                    throw new Error('Failed to fetch')
                }
                const data = await res.json()
                setAssessments(data.assessments || [])
            } catch (e) {
                setError('Could not load assessment history.')
            } finally {
                setLoading(false)
            }
        }
        fetchHistory()

        async function fetchCognitiveGraph() {
            try {
                const res = await fetch('/api/user/cognitive-graph')
                if (res.ok) {
                    const data = await res.json()
                    setCognitiveGraph(data.graph ?? null)
                    setGraphSessionCount(data.meta?.sessionCount ?? 0)
                }
            } catch {
                // silent — graph is a non-critical enhancement
            } finally {
                setGraphLoading(false)
            }
        }
        fetchCognitiveGraph()
    }, [router])

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <header className="border-b-4 border-black bg-white">
                <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
                    <div>
                        <Link href="/" className="text-3xl font-black tracking-tighter hover:underline">
                            STREETS
                        </Link>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">
                            Investigation Dashboard
                        </p>
                    </div>
                    <Link href="/assessment">
                        <BrutalButton variant="primary">
                            + New Investigation
                        </BrutalButton>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                {/* Stats Bar */}
                {!loading && assessments.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <BrutalCard hover={false} className="text-center !p-4">
                            <p className="text-3xl font-black">{assessments.length}</p>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                Total Sessions
                            </p>
                        </BrutalCard>
                        <BrutalCard hover={false} className="text-center !p-4">
                            <p className="text-3xl font-black">
                                {assessments.filter(a => a.status === 'completed').length}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                Completed
                            </p>
                        </BrutalCard>
                        <BrutalCard hover={false} className="text-center !p-4">
                            <p className="text-3xl font-black">
                                {assessments.length > 0
                                    ? Math.round(assessments.reduce((s, a) => s + a.accuracy, 0) / assessments.length)
                                    : 0}%
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                Avg Accuracy
                            </p>
                        </BrutalCard>
                        <BrutalCard hover={false} className="text-center !p-4">
                            <p className="text-3xl font-black">
                                {new Set(assessments.map(a => a.topic)).size}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                Topics Explored
                            </p>
                        </BrutalCard>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto mb-4" />
                            <p className="font-bold uppercase tracking-widest text-sm">Loading history...</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <BrutalCard hover={false} className="text-center py-12">
                        <p className="text-lg font-bold text-red-600 mb-4">{error}</p>
                        <BrutalButton variant="secondary" onClick={() => window.location.reload()}>
                            Retry
                        </BrutalButton>
                    </BrutalCard>
                )}

                {/* Empty State */}
                {!loading && !error && assessments.length === 0 && (
                    <BrutalCard hover={false} className="text-center py-16">
                        <p className="text-6xl mb-6">🔍</p>
                        <h2 className="text-2xl font-black mb-2">No investigations yet</h2>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                            Start your first adaptive assessment and discover how you really think.
                        </p>
                        <Link href="/assessment">
                            <BrutalButton>Start Your First Investigation</BrutalButton>
                        </Link>
                    </BrutalCard>
                )}

                {/* Assessment Table */}
                {!loading && !error && assessments.length > 0 && (
                    <div className="border-2 border-black bg-white">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 border-b-2 border-black bg-black text-white text-xs font-bold uppercase tracking-widest">
                            <div className="col-span-3">Topic</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1 text-center">Status</div>
                            <div className="col-span-1 text-center">Questions</div>
                            <div className="col-span-2 text-center">Accuracy</div>
                            <div className="col-span-1 text-center">Duration</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Table Rows */}
                        {assessments.map((a, i) => (
                            <div
                                key={a.id}
                                className={`grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 items-center border-b-2 border-black last:border-b-0 hover:bg-gray-50 transition-colors ${
                                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                }`}
                            >
                                {/* Topic */}
                                <div className="col-span-3">
                                    <p className="font-bold text-lg truncate">{a.topic}</p>
                                    <p className="text-xs text-gray-500 md:hidden">
                                        {formatDate(a.startedAt)} · {a.totalQuestions} questions
                                    </p>
                                </div>

                                {/* Date */}
                                <div className="hidden md:block col-span-2 text-sm">
                                    {formatDate(a.startedAt)}
                                </div>

                                {/* Status */}
                                <div className="hidden md:flex col-span-1 justify-center">
                                    {statusBadge(a.status)}
                                </div>

                                {/* Questions */}
                                <div className="hidden md:block col-span-1 text-center font-bold">
                                    {a.totalQuestions}
                                </div>

                                {/* Accuracy */}
                                <div className="hidden md:flex col-span-2 items-center gap-2 justify-center">
                                    <div className="w-16 h-2 bg-gray-200 border border-black">
                                        <div
                                            className={`h-full ${
                                                a.accuracy >= 70 ? 'bg-accent-green' :
                                                a.accuracy >= 40 ? 'bg-accent-yellow' : 'bg-accent-red'
                                            }`}
                                            style={{ width: `${a.accuracy}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-sm">{a.accuracy}%</span>
                                </div>

                                {/* Duration */}
                                <div className="hidden md:block col-span-1 text-center text-sm">
                                    {a.duration ? formatDuration(a.duration) : '—'}
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 flex justify-end gap-2 mt-2 md:mt-0">
                                    {a.status === 'in_progress' ? (
                                        <Link href={`/assessment/${a.id}`}>
                                            <BrutalButton variant="primary" className="!py-2 !px-4 !text-xs">
                                                Resume
                                            </BrutalButton>
                                        </Link>
                                    ) : (
                                        <Link href={`/assessment/${a.id}/results`}>
                                            <BrutalButton variant="secondary" className="!py-2 !px-4 !text-xs">
                                                View Results
                                            </BrutalButton>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Cognitive Graph Section */}
            <section className="max-w-6xl mx-auto px-6 pb-16">
                {!graphLoading && (
                    cognitiveGraph
                        ? <CognitiveGraphMap graph={cognitiveGraph} sessionCount={graphSessionCount} />
                        : <CognitiveGraphEmpty />
                )}
            </section>
        </div>
    )
}
