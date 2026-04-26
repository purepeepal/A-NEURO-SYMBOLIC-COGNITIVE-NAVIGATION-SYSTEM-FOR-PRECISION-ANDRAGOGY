'use client'
import { GeneratedQuestion } from '@/lib/llm/types'
import { useState, useEffect } from 'react'

export interface QuestionCardProps {
    question: GeneratedQuestion & { id?: string }
    onSubmit: (answer: string, confidence: number) => void
    submitting: boolean
}

const CONFIDENCE_OPTIONS = [
    { level: 1, emoji: '😐', label: 'Guessing', color: 'border-gray-400' },
    { level: 2, emoji: '🤔', label: 'Somewhat', color: 'border-yellow-500' },
    { level: 3, emoji: '😎', label: 'Very Sure', color: 'border-green-500' },
]

export function QuestionCard({ question, onSubmit, submitting }: QuestionCardProps) {
    const [answer, setAnswer] = useState('')
    const [selectedMcq, setSelectedMcq] = useState<string | null>(null)
    const [showConfidence, setShowConfidence] = useState(false)
    const [confidence, setConfidence] = useState<number | null>(null)

    const handleMcqSelect = (key: string) => {
        setSelectedMcq(key)
        setShowConfidence(true)
    }

    const handleTextSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!answer.trim()) return
        setShowConfidence(true)
    }

    const handleConfidenceSelect = (level: number) => {
        setConfidence(level)
        const finalAnswer = selectedMcq || answer
        onSubmit(finalAnswer, level)
        // We do NOT reset state here anymore. 
        // We let the parent handle the transition to the feedback screen.
        // We will reset when the question changes (handled by key prop in parent or useEffect).
    }

    // Reset when question changes
    useEffect(() => {
        setAnswer('')
        setSelectedMcq(null)
        setShowConfidence(false)
        setConfidence(null)
    }, [question.id])

    // Keyboard shortcuts for confidence (1/2/3)
    useEffect(() => {
        if (!showConfidence) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === '1') handleConfidenceSelect(1)
            if (e.key === '2') handleConfidenceSelect(2)
            if (e.key === '3') handleConfidenceSelect(3)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [showConfidence, selectedMcq, answer])

    return (
        <div className="brutalist-card p-8 max-w-3xl mx-auto mt-12 relative overflow-hidden">
            {/* Submitting Overlay — brutalist themed */}
            {submitting && (
                <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center animate-fade-in border-2 border-black">
                    <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin mb-6"></div>
                    <h2 className="text-xl font-black uppercase tracking-[0.2em] mb-2">Analyzing</h2>
                    <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Evaluating your response...</p>
                </div>
            )}

            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold uppercase tracking-widest bg-black text-white px-3 py-1 hover-glitch transition-all cursor-default">
                        {question.concept}
                    </span>
                    {/* Constant Stimulation: System Active Indicator */}
                    <div className="flex items-center gap-2 border-2 border-black px-2 py-1 bg-[#F4F4F0]">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Sync</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase">Difficulty</span>
                    <div className="flex gap-1 group">
                        {[...Array(10)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 w-2 border border-black transition-all duration-300 ${i < question.difficulty ? 'bg-black opacity-100 group-hover:animate-pulse group-hover:bg-fuchsia-500' : 'bg-transparent opacity-20'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <h3 className="text-3xl font-bold mb-10 leading-tight typewriter-text inline-block !whitespace-normal">
                {question.questionText}
            </h3>

            {/* Confidence Selector Overlay */}
            {showConfidence ? (
                <div className="animate-fade-in">
                    {/* Show selected answer */}
                    {selectedMcq && question.options && (
                        <div className="mb-6 p-4 bg-[#F4F4F0] border-2 border-black">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Your answer</span>
                            <span className="font-bold text-lg">
                                {selectedMcq.toUpperCase()}: {question.options[selectedMcq]}
                            </span>
                        </div>
                    )}
                    {!selectedMcq && answer && (
                        <div className="mb-6 p-4 bg-[#F4F4F0] border-2 border-black">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Your answer</span>
                            <span className="font-bold text-lg">{answer}</span>
                        </div>
                    )}

                    <div className="border-t-2 border-black pt-6">
                        <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">
                            How confident are you? <span className="text-xs text-gray-400 normal-case">(or press 1/2/3)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Select your confidence level">
                            {CONFIDENCE_OPTIONS.map(opt => (
                                <button
                                    key={opt.level}
                                    onClick={() => handleConfidenceSelect(opt.level)}
                                    disabled={submitting}
                                    aria-label={`Confidence: ${opt.label}`}
                                    className={`p-4 border-2 border-black bg-white hover-glitch transition-all duration-100 flex flex-col items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] ${confidence === opt.level ? 'bg-black text-white' : ''}`}
                                >
                                    <span className="text-2xl">{opt.emoji}</span>
                                    <span className="text-xs font-bold uppercase tracking-wider">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setShowConfidence(false)
                                setSelectedMcq(null)
                            }}
                            className="mt-4 text-sm text-gray-400 hover:text-black underline underline-offset-4 transition-colors font-medium"
                        >
                            ← change answer
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {question.questionType === 'mcq' && question.options ? (
                        <div className="space-y-4">
                            {Object.entries(question.options).map(([key, value]) => (
                                <button
                                    key={key}
                                    onClick={() => handleMcqSelect(key)}
                                    disabled={submitting || showConfidence}
                                    className={`w-full text-left p-4 border-2 border-black transition-all duration-0 flex items-center group relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white mb-2 ${showConfidence ? 'opacity-50 cursor-not-allowed' : 'hover-glitch'}`}
                                >
                                    <span className="inline-flex items-center justify-center w-8 h-8 border-2 border-black text-black font-bold mr-4 group-hover:bg-white group-hover:text-black">
                                        {key.toUpperCase()}
                                    </span>
                                    <span className="font-bold text-lg">{value}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <form onSubmit={handleTextSubmit}>
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={submitting}
                                className="brutalist-input w-full min-h-[150px] mb-6 text-xl"
                                placeholder="TYPE YOUR ANSWER HERE..."
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={submitting || !answer.trim()}
                                className="brutalist-button w-full text-xl py-4 hover-glitch shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {submitting ? 'CHECKING...' : 'SUBMIT ANSWER'}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    )
}
