'use client'
import { Suspense, useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAssessmentSession } from '@/hooks/useAssessmentSession'
import { useBiometricTelemetry } from '@/hooks/useBiometricTelemetry'

export default function V2AssessmentSessionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="animate-pulse text-2xl font-black uppercase tracking-widest">
                    Loading Assessment Protocol...
                </div>
            </div>
        }>
            <V2AssessmentSession />
        </Suspense>
    )
}

function V2AssessmentSession() {
    const searchParams = useSearchParams()
    const objectiveId = searchParams.get('objective')
    const router = useRouter()

    const {
        state,
        sessionId,
        currentQuestion,
        lastEvaluation,
        personaImpact,
        sessionPhase,
        learningSnippet,
        error,
        startSession,
        submitAnswer
    } = useAssessmentSession()

    // Attach tracking hook
    const trackingRef = useBiometricTelemetry(sessionId)
    const [userAnswer, setUserAnswer] = useState('')
    const [confidence, setConfidence] = useState(4)
    const [startTime, setStartTime] = useState(Date.now())

    useEffect(() => {
        if (objectiveId && state === 'idle') {
            startSession(objectiveId, 5) // Start with default 5 difficulty
        }
    }, [objectiveId, state, startSession])

    useEffect(() => {
        if (currentQuestion) {
            setStartTime(Date.now())
            setUserAnswer('')
        }
    }, [currentQuestion])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userAnswer.trim() || state === 'evaluating') return

        const timeTakenMs = Date.now() - startTime
        await submitAnswer(userAnswer, timeTakenMs, confidence)
    }

    if (!objectiveId) {
        return <div className="p-8 text-black font-bold uppercase">Error: No objective specified.</div>
    }

    if (state === 'idle' || state === 'loading') {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center p-4">
                <div className="animate-pulse text-2xl font-black uppercase tracking-widest">
                    Initializing V2 Neural Link...
                </div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
                <div className="bg-red-500 text-white p-8 border-4 border-black font-bold max-w-lg">
                    <h2 className="text-2xl mb-4">CRITICAL ERROR</h2>
                    <p>{error}</p>
                    <button onClick={() => router.push('/v2-assessment')} className="mt-8 bg-black text-white px-6 py-3 uppercase tracking-widest text-sm hover:bg-gray-800 border-2 border-white">
                        Abort Protocol
                    </button>
                </div>
            </div>
        )
    }

    if (state === 'complete') {
        return (
            <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4" ref={trackingRef}>
                <div className="max-w-xl w-full bg-white p-12 border-4 border-black shadow-brutal text-center">
                    <h1 className="text-4xl font-black mb-6 uppercase">Assessment Complete</h1>

                    <div className="mb-8 p-6 bg-gray-100 border-2 border-black text-left">
                        <h3 className="font-bold text-sm uppercase tracking-widest mb-4">Final 5D Persona Impact</h3>
                        <div className="space-y-2 font-mono text-sm">
                            <p>Analytical: {personaImpact?.analytical || 0}</p>
                            <p>Creative: {personaImpact?.creative || 0}</p>
                            <p>Practical: {personaImpact?.practical || 0}</p>
                            <p>Synthesizing: {personaImpact?.synthesizing || 0}</p>
                            <p>Evaluative: {personaImpact?.evaluative || 0}</p>
                        </div>
                    </div>

                    <button onClick={() => router.push('/dashboard')} className="brutalist-button w-full">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4" ref={trackingRef}>
            <div className="max-w-2xl w-full mb-8">
                <div className="flex justify-between items-end border-b-4 border-black pb-2 mb-8">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                        V2 Assessment Protocol
                    </h2>
                    <div className="flex gap-4 items-center">
                        <span className={`text-xs font-bold uppercase border-2 px-2 py-1 ${sessionPhase === 'warmup' ? 'text-blue-600 border-blue-600' : sessionPhase === 'calibration' ? 'text-purple-600 border-purple-600' : 'text-orange-600 border-orange-600'}`}>
                            Phase: {sessionPhase}
                        </span>
                        <span className="text-xs font-bold uppercase bg-black text-white px-2 py-1">
                            Session: {sessionId?.substring(0, 8)}
                        </span>
                    </div>
                </div>

                {lastEvaluation && (
                    <div className={`mb-8 p-6 border-4 border-black ${lastEvaluation.isCorrect ? 'bg-green-400' : 'bg-red-400'}`}>
                        <h3 className="font-black text-xl uppercase mb-2">
                            {lastEvaluation.isCorrect ? 'Correct Implementation' : 'Deviation Detected'}
                        </h3>
                        <p className="font-medium">{lastEvaluation.feedback}</p>
                        {lastEvaluation.detectedMisconception && (
                            <p className="mt-2 text-sm font-bold bg-white/50 p-2 border-l-4 border-black">
                                Misconception: {lastEvaluation.detectedMisconception}
                            </p>
                        )}
                        {/* If answer was wrong and more questions remain, we force them to click Next to clear the eval */}
                    </div>
                )}

                {learningSnippet && (
                    <div className="mb-8 p-6 bg-blue-50 border-4 border-blue-900 shadow-brutal animate-fade-in">
                        <h3 className="font-black text-xl text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span>🧠</span> Meta-Learning Insight
                        </h3>
                        <p className="font-medium text-lg text-gray-800 leading-relaxed break-words">
                            {learningSnippet.content}
                        </p>
                    </div>
                )}

                {currentQuestion && (
                    <div className="bg-white border-4 border-black shadow-brutal p-8">
                        <div className="mb-6 flex justify-between items-center bg-gray-100 p-2 border-2 border-dashed border-gray-400">
                            <span className="font-mono text-xs uppercase font-bold text-gray-600">Target Concept: {currentQuestion.concept}</span>
                            <span className="font-mono text-xs uppercase font-bold text-gray-600">Diff: {currentQuestion.difficulty}/10</span>
                        </div>

                        <h1 className="text-2xl font-bold mb-8 leading-snug">
                            {currentQuestion.text}
                        </h1>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {currentQuestion.type === 'mcq' && currentQuestion.options ? (
                                <div className="space-y-3">
                                    {currentQuestion.options.map((opt, i) => (
                                        <label key={i} className={`block p-4 border-2 border-black cursor-pointer hover:bg-gray-100 transition-colors ${userAnswer === opt ? 'bg-black text-white font-bold' : ''}`}>
                                            <input
                                                type="radio"
                                                name="answer"
                                                value={opt}
                                                checked={userAnswer === opt}
                                                onChange={(e) => setUserAnswer(e.target.value)}
                                                className="hidden"
                                            />
                                            <span className="mr-4 font-mono font-bold">{['A', 'B', 'C', 'D'][i] || '>'}</span>
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    className="brutalist-input w-full min-h-[150px] p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap"
                                    placeholder="Execute your answer sequence..."
                                    disabled={state === 'evaluating'}
                                />
                            )}

                            <div className="pt-6 border-t-2 border-dashed border-gray-300">
                                <label className="block text-sm font-bold uppercase tracking-widest mb-4">
                                    Self-Reported Confidence ({confidence}/4)
                                </label>
                                <input
                                    type="range"
                                    min="1" max="4"
                                    value={confidence}
                                    onChange={(e) => setConfidence(Number(e.target.value))}
                                    className="w-full accent-black"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={state === 'evaluating' || !userAnswer.trim()}
                                className="brutalist-button w-full text-xl mt-8 disabled:opacity-50"
                            >
                                {state === 'evaluating' ? 'ANALYZING...' : 'SUBMIT SEQUENCE →'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
