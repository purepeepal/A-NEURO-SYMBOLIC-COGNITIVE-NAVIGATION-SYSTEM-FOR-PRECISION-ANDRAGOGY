'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const CONFIDENCE_LABELS = [
    { value: 1, emoji: '🔴', label: 'Never heard of this' },
    { value: 2, emoji: '🟠', label: 'Heard of it, can\'t explain' },
    { value: 3, emoji: '🟡', label: 'Can explain basics' },
    { value: 4, emoji: '🟢', label: 'Comfortable applying it' },
    { value: 5, emoji: '🔵', label: 'Could teach it to others' },
]

interface SubTopic {
    name: string
    rating: number | null
}

function SelfAssessmentContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const topic = searchParams.get('topic') || ''
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [subTopics, setSubTopics] = useState<SubTopic[]>([])
    const [visible, setVisible] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Fetch sub-topics from LLM
    useEffect(() => {
        if (!topic) {
            router.push('/assessment')
            return
        }

        setVisible(true)

        // Ask the API for sub-topics related to this topic
        fetch('/api/assessment/subtopics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        })
            .then(res => res.json())
            .then(data => {
                if (data.subtopics && data.subtopics.length > 0) {
                    setSubTopics(data.subtopics.map((name: string) => ({ name, rating: null })))
                } else {
                    // Fallback: generate generic sub-topics
                    setSubTopics([
                        { name: `Core concepts of ${topic}`, rating: null },
                        { name: `Applying ${topic} to problems`, rating: null },
                        { name: `Common misconceptions in ${topic}`, rating: null },
                        { name: `Advanced ${topic} techniques`, rating: null },
                        { name: `${topic} in the real world`, rating: null },
                    ])
                }
                setLoading(false)
            })
            .catch(() => {
                // Fallback on error
                setSubTopics([
                    { name: `Core concepts of ${topic}`, rating: null },
                    { name: `Applying ${topic} to problems`, rating: null },
                    { name: `Common misconceptions in ${topic}`, rating: null },
                    { name: `Advanced ${topic} techniques`, rating: null },
                    { name: `${topic} in the real world`, rating: null },
                ])
                setLoading(false)
            })
    }, [topic])

    const handleRate = (index: number, value: number) => {
        setSubTopics(prev => {
            const next = [...prev]
            next[index] = { ...next[index], rating: value }
            return next
        })
    }

    const allRated = subTopics.every(s => s.rating !== null)
    const averageRating = subTopics.reduce((sum, s) => sum + (s.rating || 0), 0) / (subTopics.length || 1)

    const handleProceed = async () => {
        if (!allRated) return
        setSubmitting(true)
        setError(null)

        try {
            // Create assessment session AND store self-assessment
            const res = await fetch('/api/assessment/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    selfAssessment: subTopics.map(s => ({
                        subtopic: s.name,
                        rating: s.rating
                    }))
                })
            })

            const data = await res.json()

            if (data.assessment) {
                router.push(`/assessment/${data.assessment.id}`)
            } else {
                setError(data.error || 'Failed to start investigation')
                setSubmitting(false)
            }
        } catch {
            setError('Network error — please try again')
            setSubmitting(false)
        }
    }

    const handleSkip = async () => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/assessment/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            })
            const data = await res.json()
            if (data.assessment) {
                router.push(`/assessment/${data.assessment.id}`)
            } else {
                setError(data.error || 'Failed to start')
                setSubmitting(false)
            }
        } catch {
            setError('Network error')
            setSubmitting(false)
        }
    }

    if (!topic) return null

    return (
        <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-4">
            <div
                className={`max-w-2xl w-full bg-white p-8 md:p-10 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
            >
                {/* Header */}
                <div className="mb-8 border-b-4 border-black pb-5">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🪞</span>
                        <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter">
                            BEFORE WE BEGIN
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mt-2">
                        Rate your confidence on each sub-topic. After the investigation, we&apos;ll compare your
                        self-perception to your actual performance — <strong>this is where the real insight lives.</strong>
                    </p>
                    <div className="mt-3 inline-block bg-black text-white px-3 py-1">
                        <span className="text-xs font-bold uppercase tracking-widest">{topic}</span>
                    </div>
                </div>

                {/* Loading */}
                {loading ? (
                    <div className="py-12 text-center">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Generating sub-topics...</p>
                    </div>
                ) : (
                    <>
                        {/* Sub-topic ratings */}
                        <div className="space-y-5 mb-8">
                            {subTopics.map((st, i) => (
                                <div key={i} className="p-4 bg-[#F4F4F0] border border-gray-300">
                                    <p className="font-bold text-black mb-3" id={`subtopic-label-${i}`}>{st.name}</p>
                                    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby={`subtopic-label-${i}`}>
                                        {CONFIDENCE_LABELS.map(cl => (
                                            <button
                                                key={cl.value}
                                                onClick={() => handleRate(i, cl.value)}
                                                role="radio"
                                                aria-checked={st.rating === cl.value}
                                                aria-label={`Rate ${st.name} as ${cl.label}`}
                                                className={`px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider transition-all duration-100
                                                    ${st.rating === cl.value
                                                        ? 'border-black bg-black text-white shadow-none'
                                                        : 'border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 active:shadow-none active:translate-x-[1px] active:translate-y-[1px]'
                                                    }`}
                                            >
                                                {cl.emoji} {cl.value}. {cl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary bar */}
                        {allRated && (() => {
                            const distribution = {
                                strong: subTopics.filter(s => (s.rating || 0) >= 4).length,
                                moderate: subTopics.filter(s => (s.rating || 0) === 3).length,
                                new: subTopics.filter(s => (s.rating || 0) <= 2).length,
                            }
                            return (
                                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 animate-fade-in">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Your Self-Assessment</p>
                                    <div className="flex items-center gap-4 text-sm font-bold">
                                        {distribution.strong > 0 && <span className="text-green-700">🟢 {distribution.strong} strong</span>}
                                        {distribution.moderate > 0 && <span className="text-yellow-700">🟡 {distribution.moderate} moderate</span>}
                                        {distribution.new > 0 && <span className="text-red-700">🔴 {distribution.new} new to you</span>}
                                    </div>
                                </div>
                            )
                        })()}

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm">
                                {error}
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={handleProceed}
                            disabled={!allRated || submitting}
                            className={`brutalist-button w-full text-lg py-5 ${!allRated ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    LAUNCHING INVESTIGATION...
                                </span>
                            ) : (
                                <span>
                                    {allRated ? 'BEGIN INVESTIGATION →' : `Rate all ${subTopics.length} sub-topics to continue`}
                                </span>
                            )}
                        </button>

                        {/* Skip */}
                        <div className="mt-4 text-center">
                            <button
                                onClick={handleSkip}
                                disabled={submitting}
                                className="text-sm text-gray-400 hover:text-black underline underline-offset-4 transition-colors font-medium"
                            >
                                skip self-assessment →
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default function SelfAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F0]">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <SelfAssessmentContent />
        </Suspense>
    )
}
