'use client'
import { useState, useEffect } from 'react'

interface NarrativeMomentProps {
    /** Current question number (1-indexed) */
    questionNumber: number
    /** Whether the last answer was correct */
    wasCorrect: boolean
    /** Current consecutive correct streak */
    streak: number
    /** Assessment topic */
    topic: string
    /** Callback when narrative is dismissed */
    onContinue: () => void
}

// Narrative templates — detective investigation metaphor
const NARRATIVES = {
    // Milestone narratives (every 5 questions)
    milestone: [
        { emoji: '📋', text: 'Evidence is accumulating. The detective reviews the case file so far...' },
        { emoji: '🗺️', text: 'The investigation map grows clearer. New connections are forming...' },
        { emoji: '🔬', text: 'Deeper into the case. The patterns are starting to reveal themselves...' },
    ],
    // Streak narratives (3+ correct in a row)
    streak: [
        { emoji: '🔥', text: 'A breakthrough! The detective is on a hot trail...' },
        { emoji: '💡', text: 'The pieces are clicking into place. This line of inquiry is paying off...' },
        { emoji: '⚡', text: 'Rapid deductions. The detective\'s instincts are sharp today...' },
    ],
    // Recovery narratives (correct after incorrect)
    recovery: [
        { emoji: '🔄', text: 'A course correction. The detective recalibrates and finds a new angle...' },
        { emoji: '🧭', text: 'Back on track. Sometimes the wrong path reveals the right direction...' },
    ],
    // Struggle narratives (2+ incorrect)
    struggle: [
        { emoji: '🌫️', text: 'The trail goes cold for a moment. But every dead end narrows the search...' },
        { emoji: '🔍', text: 'A puzzling clue. The detective takes a step back to reassess...' },
    ],
    // Opening (question 1-2 transition)
    opening: [
        { emoji: '🚪', text: 'The investigation begins. First impressions can be deceiving...' },
        { emoji: '📂', text: 'Case file opened. The detective makes a first note...' },
    ],
}

function shouldShowNarrative(questionNumber: number, wasCorrect: boolean, streak: number): string | null {
    // Opening: after question 1
    if (questionNumber === 1) return 'opening'

    // Milestone: every 5 questions
    if (questionNumber % 5 === 0) return 'milestone'

    // Streak: 3+ correct
    if (wasCorrect && streak >= 3) return 'streak'

    // Struggle: after 2+ wrong (streak is negative for wrong)
    if (!wasCorrect && streak <= -2) return 'struggle'

    // Recovery: correct after being wrong (streak was negative, now 1)
    if (wasCorrect && streak === 1 && questionNumber > 3) return 'recovery'

    return null
}

export function NarrativeMoment({ questionNumber, wasCorrect, streak, topic, onContinue }: NarrativeMomentProps) {
    const [visible, setVisible] = useState(false)
    const [fading, setFading] = useState(false)

    const narrativeType = shouldShowNarrative(questionNumber, wasCorrect, streak)

    useEffect(() => {
        if (!narrativeType) {
            onContinue()
            return
        }

        // Fade in
        const showTimer = setTimeout(() => setVisible(true), 100)

        // Auto-dismiss after 3.5 seconds
        const dismissTimer = setTimeout(() => {
            setFading(true)
            setTimeout(onContinue, 500)
        }, 3500)

        return () => {
            clearTimeout(showTimer)
            clearTimeout(dismissTimer)
        }
    }, [narrativeType])

    if (!narrativeType) return null

    const pool = NARRATIVES[narrativeType as keyof typeof NARRATIVES]
    const narrative = pool[questionNumber % pool.length]

    return (
        <div className="max-w-2xl mx-auto flex items-center justify-center py-16">
            <div
                className={`text-center transition-all duration-500 ${visible && !fading
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-4 scale-95'
                    }`}
            >
                <div className="text-5xl mb-6 animate-bounce">{narrative.emoji}</div>
                <p className="text-lg font-bold text-gray-700 italic max-w-md mx-auto leading-relaxed">
                    &ldquo;{narrative.text}&rdquo;
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-4">
                    — The Detective&apos;s Log, {topic}
                </p>

                {/* Skip button */}
                <button
                    onClick={() => {
                        setFading(true)
                        setTimeout(onContinue, 300)
                    }}
                    className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
                >
                    skip →
                </button>
            </div>
        </div>
    )
}

// Re-export the check function for use in parent
export { shouldShowNarrative }
