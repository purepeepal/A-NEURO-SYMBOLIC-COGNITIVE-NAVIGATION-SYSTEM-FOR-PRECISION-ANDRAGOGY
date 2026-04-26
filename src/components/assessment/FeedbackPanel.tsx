'use client'
import { useState } from 'react'
import type { QuizFeedback } from '@/hooks/useQuizSession'

interface FeedbackPanelProps {
    feedback: QuizFeedback
    onNext: () => void
}

export function FeedbackPanel({ feedback, onNext }: FeedbackPanelProps) {
    const [loadingNext, setLoadingNext] = useState(false)

    const handleNext = () => {
        if (loadingNext) return
        setLoadingNext(true)
        onNext()
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-fade-in">
            {feedback.narrative && (
                <div className="mb-8 p-5 bg-[#F4F4F0] border-l-4 border-black italic text-gray-700 font-serif text-lg leading-relaxed">
                    &ldquo;{feedback.narrative}&rdquo;
                </div>
            )}

            <div className={`w-16 h-16 mx-auto border-2 border-black flex items-center justify-center mb-6 ${feedback.correct ? 'bg-green-100' : 'bg-amber-100'}`}>
                {feedback.correct ? (
                    <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : (
                    <svg className="w-8 h-8 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                )}
            </div>

            <h3 className={`text-2xl font-black mb-4 text-center ${feedback.correct ? 'text-green-700' : 'text-amber-700'}`}>
                {feedback.correct
                    ? "That's right!"
                    : feedback.errorType === 'careless'
                        ? 'Almost there — a small slip'
                        : feedback.errorType === 'prerequisite_gap'
                            ? "There's a building block worth revisiting"
                            : "Let's explore this differently"}
            </h3>

            <p className="text-gray-600 mb-8 text-lg leading-relaxed text-center">
                {feedback.explanation}
            </p>

            <button
                onClick={handleNext}
                disabled={loadingNext}
                className={`w-full border-2 border-black px-8 py-4 font-black uppercase tracking-wider text-lg transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${loadingNext
                        ? 'bg-gray-200 text-gray-500 cursor-wait'
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
            >
                {loadingNext ? (
                    <span className="flex items-center justify-center gap-3">
                        <span className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                        Generating Next Question...
                    </span>
                ) : (
                    <span>Next Question &rarr;</span>
                )}
            </button>

            <div className="mt-4 text-xs text-gray-400 text-center">
                Disagree with this result? Use the chat button to dispute.
            </div>
        </div>
    )
}
