'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function V2AssessmentDashboard() {
    const [topic, setTopic] = useState('')
    const router = useRouter()

    const handleStart = (e: React.FormEvent) => {
        e.preventDefault()
        if (!topic.trim()) return

        // Route to the new V2 session view
        router.push(`/v2-assessment/session?objective=${encodeURIComponent(topic.trim())}`)
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
            <div className="max-w-xl w-full bg-white p-12 border-2 border-black shadow-brutal">
                <div className="text-left mb-12 border-b-4 border-black pb-6">
                    <h1 className="text-5xl font-black text-black mb-2 tracking-tighter">V2 INVESTIGATE</h1>
                    <p className="text-black font-medium uppercase tracking-widest text-sm">Powered by Unit 3 Domain Core</p>
                </div>

                <form onSubmit={handleStart} className="space-y-8">
                    <div>
                        <label className="block text-lg font-bold text-black mb-2 uppercase">Objective / Topic</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Linear Algebra..."
                            className="brutalist-input w-full text-2xl h-16"
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!topic.trim()}
                        className="brutalist-button w-full text-xl py-6"
                    >
                        START V2 ASSESSMENT →
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link
                        href="/dashboard"
                        className="text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-black underline-offset-4 hover:underline transition-colors"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
