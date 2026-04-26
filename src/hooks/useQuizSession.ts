'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GeneratedQuestion } from '@/lib/llm/types'
import type { BiometricEvent } from '@/lib/domain/assessment/biometrics'
import { toast } from 'sonner'

// Inline BiometricsCapture since the original class doesn't exist in biometrics.ts
class BiometricsCapture {
    private events: BiometricEvent[] = [];
    private capturing = false;
    startCapture() { this.events = []; this.capturing = true; }
    stopCapture(): BiometricEvent[] { this.capturing = false; return this.events; }
    addEvent(e: BiometricEvent) { if (this.capturing) this.events.push(e); }
}

export interface QuizFeedback {
    correct: boolean
    explanation: string
    narrative?: string | null
    errorType?: string | null
}

export interface QuizProgress {
    current: number
    total: number
    confidence: number
}

export function useQuizSession(assessmentId: string) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [question, setQuestion] = useState<GeneratedQuestion & { id: string } | null>(null)
    const [feedback, setFeedback] = useState<QuizFeedback | null>(null)
    const [lastAnswer, setLastAnswer] = useState<string | null>(null)
    const startTimeRef = useRef<number>(Date.now())

    const [progress, setProgress] = useState<QuizProgress>({ current: 0, total: 20, confidence: 0 })
    const [showTerminateDialog, setShowTerminateDialog] = useState(false)
    const [terminateMessage, setTerminateMessage] = useState('')
    const [terminateVariant, setTerminateVariant] = useState<'default' | 'warning' | 'danger'>('default')
    const biometricsRef = useRef<BiometricsCapture>(new BiometricsCapture())
    const prefetchRef = useRef<Promise<any> | null>(null)

    // Fire a background prefetch for the next question
    const prefetchNext = () => {
        prefetchRef.current = fetch('/api/assessment/next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assessmentId })
        }).then(r => r.json()).catch(() => null)
    }

    const fetchNextCallback = async () => {
        try {
            setLoading(true)

            // Use prefetched result if available, otherwise fetch fresh
            let data: any = null
            if (prefetchRef.current) {
                data = await prefetchRef.current
                prefetchRef.current = null
            }
            if (!data) {
                const res = await fetch('/api/assessment/next', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assessmentId })
                })
                data = await res.json()
            }

            if (data.complete) {
                sessionStorage.removeItem(`streets_q_${assessmentId}`)
                router.push(`/assessment/${assessmentId}/results`)
                return
            }

            if (data.error) {
                toast.error(`Error loading question: ${data.error}`, {
                    description: data.details || undefined,
                })
                return
            }

            setQuestion(data.question)
            if (data.progress) {
                setProgress(data.progress)
            }
            setFeedback(null)
            setLastAnswer(null)
            startTimeRef.current = Date.now()
            biometricsRef.current.startCapture()

            try {
                sessionStorage.setItem(`streets_q_${assessmentId}`, JSON.stringify({
                    questionId: data.question.id,
                    questionData: data.question,
                    progress: data.progress,
                    timestamp: Date.now(),
                }))
            } catch { /* sessionStorage may be unavailable */ }
        } catch (e) {
            console.error(e)
            toast.error("Network error or server unreachable")
        } finally {
            setLoading(false)
        }
    }

    // Initial load with session recovery
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(`streets_q_${assessmentId}`)
            if (saved) {
                const parsed = JSON.parse(saved)
                const ageMs = Date.now() - parsed.timestamp
                if (ageMs < 30 * 60 * 1000 && parsed.questionData) {
                    setQuestion(parsed.questionData)
                    if (parsed.progress) setProgress(parsed.progress)
                    startTimeRef.current = Date.now()
                    biometricsRef.current.startCapture()
                    setLoading(false)
                    toast.info('Session resumed', { description: 'Your previous question has been restored.' })
                    return
                }
            }
        } catch { /* sessionStorage unavailable or corrupt */ }

        fetchNextCallback()
    }, [assessmentId]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleSubmit = async (answer: string, confidence: number = 2) => {
        if (!question) return
        setSubmitting(true)
        setLastAnswer(answer)

        const timeTaken = (Date.now() - startTimeRef.current) / 1000
        const biometrics = biometricsRef.current.stopCapture()

        try {
            try { sessionStorage.removeItem(`streets_q_${assessmentId}`) } catch { }

            await fetch('/api/assessment/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId,
                    questionId: question.id,
                    userAnswer: answer,
                    timeTakenSeconds: timeTaken,
                    confidenceLevel: confidence,
                    biometrics
                })
            })

            const evalRes = await fetch('/api/assessment/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId,
                    questionId: question.id,
                    fallbackAnswer: answer,
                    fallbackTime: timeTaken,
                    fallbackConfidence: confidence
                })
            })

            const data = await evalRes.json()

            setFeedback({
                correct: data.correct,
                explanation: data.explanation,
                narrative: data.narrative,
                errorType: data.errorType
            })

            // Prefetch next question while user reads feedback
            prefetchNext()

        } catch (e) {
            toast.error("Submission failed. Please try again.")
        } finally {
            setSubmitting(false)
        }
    }

    const requestTerminate = () => {
        let message = "Are you sure you want to end this session early?"
        let variant: 'default' | 'warning' | 'danger' = 'default'

        if (progress.confidence < 50) {
            message = "Warning: The S.Y.S.T.E.M has very low confidence (<50%) in your cognitive profile. Ending now will result in an incomplete report. Are you absolutely sure?"
            variant = 'danger'
        } else if (progress.confidence < 80) {
            message = "You have provided sufficient data for a basic report, but we recommend continuing until System Confidence reaches 80% for deeper insights. Do you still want to stop?"
            variant = 'warning'
        } else {
            message = "System Confidence is high enough for a robust analysis. Generating the report may take a moment. Proceed to report?"
        }

        setTerminateMessage(message)
        setTerminateVariant(variant)
        setShowTerminateDialog(true)
    }

    const confirmTerminate = async () => {
        setShowTerminateDialog(false)
        try {
            await fetch('/api/assessment/terminate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assessmentId })
            })
            router.push(`/assessment/${assessmentId}/results`)
        } catch (e) {
            toast.error("Failed to terminate session")
        }
    }

    const confidenceValue = progress.confidence !== undefined ? progress.confidence : (progress.current / progress.total) * 100

    return {
        loading, submitting, question, feedback, lastAnswer,
        progress, confidenceValue,
        showTerminateDialog, terminateMessage, terminateVariant,
        setShowTerminateDialog,
        handleSubmit, fetchNextCallback,
        requestTerminate, confirmTerminate,
    }
}
