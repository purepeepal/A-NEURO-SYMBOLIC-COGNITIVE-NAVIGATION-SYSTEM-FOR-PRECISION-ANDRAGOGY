'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AssessmentReport, ConceptPerformance, KnowledgeTreeNode, KnowledgeTreeEdge } from '@/lib/domain/assessment/report'
import type { CalibrationResult } from '@/lib/domain/assessment/self-assessment'
import type { ConfidenceCalibrationSummary } from '@/lib/domain/assessment/self-assessment'
import type { InvestigativeReport, ActionPlan } from '@/lib/llm/types'

// Expected SSE sections in delivery order
const EXPECTED_SECTIONS = [
    'stats',
    'conceptPerformance',
    'calibration',
    'confidenceCalibration',
    'knowledgeTree',
    'investigativeReport',
    'actionPlan',
    'recommendations',
] as const

type SectionName = typeof EXPECTED_SECTIONS[number]

interface StreamingState {
    /** Progressively assembled report ΓÇö null until first 'stats' section arrives */
    report: Partial<AssessmentReport> | null
    /** True once the 'complete' event fires or fallback finishes */
    isComplete: boolean
    /** Error message if SSE or fallback fails */
    error: string | null
    /** 0-100 progress based on sections received */
    progress: number
    /** Which sections have been received */
    receivedSections: Set<SectionName>
    /** Current loading phase message */
    loadingMessage: string
}

const LOADING_MESSAGES: Record<SectionName, string> = {
    stats: 'Crunching your numbers...',
    conceptPerformance: 'Mapping concept performance...',
    calibration: 'Analyzing self-perception...',
    confidenceCalibration: 'Checking confidence calibration...',
    knowledgeTree: 'Building knowledge topology...',
    investigativeReport: 'Writing the narrative case file...',
    actionPlan: 'Crafting your action plan...',
    recommendations: 'Finalizing recommendations...',
}

/**
 * Progressive SSE streaming hook for assessment reports.
 * Falls back to monolithic /report JSON fetch on error.
 */
export function useStreamingReport(assessmentId: string): StreamingState {
    const [state, setState] = useState<StreamingState>({
        report: null,
        isComplete: false,
        error: null,
        progress: 0,
        receivedSections: new Set(),
        loadingMessage: 'Connecting to analysis engine...',
    })

    // Prevent double-fire in StrictMode
    const startedRef = useRef(false)

    const fallbackFetch = useCallback(async () => {
        try {
            const res = await fetch(`/api/assessment/${assessmentId}/report`)
            if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`)
            const data: AssessmentReport = await res.json()
            setState(prev => ({
                ...prev,
                report: data,
                isComplete: true,
                progress: 100,
                loadingMessage: 'Report ready.',
                receivedSections: new Set(EXPECTED_SECTIONS),
            }))
        } catch (err) {
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : 'Failed to load report',
                isComplete: true,
            }))
        }
    }, [assessmentId])

    useEffect(() => {
        if (startedRef.current) return
        startedRef.current = true

        const controller = new AbortController()
        let receivedCount = 0
        const received = new Set<SectionName>()

        async function startStream() {
            try {
                const res = await fetch(
                    `/api/assessment/${assessmentId}/report/stream`,
                    { signal: controller.signal }
                )

                if (!res.ok || !res.body) {
                    console.warn('[SSE] Stream unavailable, falling back to monolithic fetch')
                    await fallbackFetch()
                    return
                }

                const reader = res.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    // Parse SSE events from buffer
                    const events = buffer.split('\n\n')
                    buffer = events.pop() || '' // Keep incomplete event in buffer

                    for (const event of events) {
                        const dataLine = event.split('\n').find(l => l.startsWith('data: '))
                        if (!dataLine) continue

                        try {
                            const parsed = JSON.parse(dataLine.slice(6)) as { section: string; data: unknown }
                            const { section, data } = parsed

                            if (section === 'complete') {
                                setState(prev => ({
                                    ...prev,
                                    isComplete: true,
                                    progress: 100,
                                    loadingMessage: 'Report ready.',
                                }))
                                return
                            }

                            if (section === 'error') {
                                console.warn('[SSE] Server error, falling back:', data)
                                await fallbackFetch()
                                return
                            }

                            received.add(section as SectionName)
                            receivedCount++
                            const progress = Math.min(95, Math.round((receivedCount / EXPECTED_SECTIONS.length) * 100))

                            setState(prev => {
                                const report = { ...(prev.report || {}) }
                                applySection(report, section, data)
                                return {
                                    ...prev,
                                    report,
                                    progress,
                                    receivedSections: new Set(received),
                                    loadingMessage: LOADING_MESSAGES[section as SectionName] || prev.loadingMessage,
                                }
                            })
                        } catch {
                            // Ignore malformed events
                        }
                    }
                }

                // Stream ended without 'complete' event ΓÇö mark complete
                setState(prev => ({
                    ...prev,
                    isComplete: true,
                    progress: 100,
                    loadingMessage: 'Report ready.',
                }))
            } catch (err) {
                if (controller.signal.aborted) return
                console.warn('[SSE] Stream failed, falling back:', err)
                await fallbackFetch()
            }
        }

        startStream()
        return () => controller.abort()
    }, [assessmentId, fallbackFetch])

    return state
}

// Apply a streamed section to the partial report
function applySection(report: Partial<AssessmentReport>, section: string, data: unknown): void {
    switch (section) {
        case 'stats': {
            const s = data as Record<string, unknown>
            Object.assign(report, {
                assessmentId: s.assessmentId,
                topic: s.topic,
                completedAt: s.completedAt ? new Date(s.completedAt as string) : new Date(),
                totalQuestions: s.totalQuestions,
                correctCount: s.correctCount,
                accuracy: s.accuracy,
                averageDifficulty: s.averageDifficulty,
                timeTakenSeconds: s.timeTakenSeconds,
                totalGaps: s.totalGaps,
                criticalGaps: s.criticalGaps,
                moderateGaps: s.moderateGaps,
                minorGaps: s.minorGaps,
                knowledgeGaps: s.knowledgeGaps || [],
            })
            break
        }
        case 'conceptPerformance':
            report.conceptPerformance = data as ConceptPerformance[]
            break
        case 'calibration': {
            const c = data as { data: CalibrationResult[]; insight?: { headline: string; detail: string } }
            report.calibrationData = c.data
            report.calibrationInsight = c.insight
            break
        }
        case 'confidenceCalibration':
            report.confidenceCalibration = data as ConfidenceCalibrationSummary
            break
        case 'investigativeReport':
            report.investigativeReport = data as InvestigativeReport
            break
        case 'actionPlan':
            report.actionPlan = data as ActionPlan
            break
        case 'knowledgeTree':
            report.knowledgeTree = data as { nodes: KnowledgeTreeNode[]; edges: KnowledgeTreeEdge[] }
            break
        case 'recommendations':
            report.recommendations = data as string[]
            break
    }
}
