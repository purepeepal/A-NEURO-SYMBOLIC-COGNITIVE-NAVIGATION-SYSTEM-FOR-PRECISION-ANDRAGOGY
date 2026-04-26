'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface KGContext {
    ancestors: { id: string; label: string; type: string }[]
    prerequisites: { id: string; label: string; weight: number; rationale?: string }[]
    concepts: { id: string; label: string }[]
    node: { id: string; label: string; type: string; subject?: string; note?: string }
}

function FramingContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const topic = searchParams.get('topic') || ''
    const kgNode = searchParams.get('kgNode') || ''
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)
    const [stepsVisible, setStepsVisible] = useState([false, false, false, false])
    const [kgContext, setKGContext] = useState<KGContext | null>(null)

    // Fetch KG context if kgNode is present
    useEffect(() => {
        if (!kgNode) return
        fetch(`/api/kg/node?id=${encodeURIComponent(kgNode)}`)
            .then(res => res.json())
            .then(data => setKGContext(data))
            .catch(err => console.error('Failed to load KG context:', err))
    }, [kgNode])

    // Respect prefers-reduced-motion
    const prefersReducedMotion = typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    // Staggered entrance animations (skip if reduced motion)
    useEffect(() => {
        if (prefersReducedMotion) {
            setVisible(true)
            setStepsVisible([true, true, true, true])
            return
        }
        const timers: NodeJS.Timeout[] = []
        timers.push(setTimeout(() => setVisible(true), 100))
        stepsVisible.forEach((_, i) => {
            timers.push(setTimeout(() => {
                setStepsVisible(prev => {
                    const next = [...prev]
                    next[i] = true
                    return next
                })
            }, 400 + i * 200))
        })
        return () => timers.forEach(t => clearTimeout(t))
    }, [])

    const handleBeginInvestigation = () => {
        if (!topic.trim()) {
            router.push('/assessment')
            return
        }
        // Route to self-assessment calibration page
        router.push(`/assessment/self-assess?topic=${encodeURIComponent(topic.trim())}`)
    }

    if (!topic) {
        // Show brief feedback before redirecting
        if (typeof window !== 'undefined') {
            alert('No topic selected. Redirecting to topic selection.')
        }
        router.push('/assessment')
        return null
    }

    const discoveries = [
        { icon: '◆', text: 'Where your understanding runs deep' },
        { icon: '◆', text: 'Where hidden gaps may be lurking' },
        { icon: '◆', text: 'How your self-perception compares to reality' },
        { icon: '◆', text: 'Your personalized next steps' },
    ]

    return (
        <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-4">
            <div
                className={`max-w-xl w-full bg-white p-10 md:p-14 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                style={{ willChange: 'transform, opacity' }}
            >
                {/* Header */}
                <div className="mb-10 border-b-4 border-black pb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🔍</span>
                        <h1 className="text-3xl md:text-4xl font-black text-black tracking-tighter leading-tight">
                            YOUR KNOWLEDGE INVESTIGATION
                        </h1>
                    </div>
                    <div className="mt-3 inline-block bg-black text-white px-4 py-2">
                        <span className="text-sm font-bold uppercase tracking-widest">{topic}</span>
                    </div>
                </div>

                {/* KG Curriculum Context */}
                {kgContext && (
                    <div className="mb-10 border-2 border-black p-5 bg-[#FAFAF5]">
                        {/* Breadcrumb path */}
                        {kgContext.ancestors && kgContext.ancestors.length > 0 && (
                            <div className="text-xs text-gray-400 font-medium mb-3">
                                {[...kgContext.ancestors].reverse().map((a, i) => (
                                    <span key={a.id}>
                                        {a.label}
                                        {i < kgContext.ancestors.length - 1 && <span className="mx-1">→</span>}
                                    </span>
                                ))}
                                <span className="mx-1">→</span>
                                <span className="text-black font-bold">{topic}</span>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {kgContext.prerequisites && kgContext.prerequisites.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                                    Prerequisites for this topic
                                </h4>
                                <ul className="space-y-1">
                                    {kgContext.prerequisites.map(p => (
                                        <li key={p.id} className="text-sm text-gray-600">
                                            <span className="font-semibold text-black">{p.label}</span>
                                            {p.rationale && (
                                                <span className="text-gray-400 ml-1">— {p.rationale}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Concept count */}
                        {kgContext.concepts && kgContext.concepts.length > 0 && (
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {kgContext.concepts.length} concept{kgContext.concepts.length !== 1 ? 's' : ''} will be assessed
                            </p>
                        )}

                        {/* Node note */}
                        {kgContext.node?.note && (
                            <p className="text-xs text-gray-500 mt-2 italic">{kgContext.node.note}</p>
                        )}
                    </div>
                )}

                {/* Promise Section */}
                <div className="mb-10">
                    <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-5">
                        In the next few minutes, you&apos;ll discover:
                    </p>
                    <div className="space-y-4">
                        {discoveries.map((item, i) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 transition-all duration-500 ${stepsVisible[i]
                                    ? 'opacity-100 translate-x-0'
                                    : 'opacity-0 -translate-x-4'
                                    }`}
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                <span className="text-blue-600 font-bold mt-0.5 text-lg">{item.icon}</span>
                                <span className="text-black font-medium text-lg leading-snug">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reframing Message */}
                <div className="mb-10 bg-[#F4F4F0] border-l-4 border-black p-5">
                    <p className="text-black font-medium leading-relaxed">
                        This isn&apos;t a test — it&apos;s a <strong>lens into how you think.</strong> Questions
                        adapt to your level, and there are no &quot;wrong&quot; answers — only signals that reveal
                        where you truly stand.
                    </p>
                </div>

                {/* CTA */}
                <button
                    onClick={handleBeginInvestigation}
                    disabled={loading}
                    className="brutalist-button w-full text-xl py-6 group relative overflow-hidden"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-3">
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            PREPARING YOUR INVESTIGATION...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            BEGIN YOUR INVESTIGATION
                            <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                        </span>
                    )}
                </button>

                {/* Meta Info */}
                <div className="mt-8 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>~5-15 minutes</span>
                    <span>Adaptive difficulty</span>
                </div>

                {/* Back Link */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/assessment')}
                        className="text-sm text-gray-400 hover:text-black underline underline-offset-4 transition-colors font-medium"
                    >
                        ← choose a different topic
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function FramingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F0]">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <FramingContent />
        </Suspense>
    )
}
