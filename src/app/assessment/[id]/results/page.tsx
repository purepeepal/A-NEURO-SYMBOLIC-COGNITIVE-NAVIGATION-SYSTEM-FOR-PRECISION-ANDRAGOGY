'use client'
import { useEffect, useState, use } from 'react'
import { AssessmentReport } from '@/lib/domain/assessment/report'
import { useStreamingReport } from '@/hooks/useStreamingReport'
import Link from 'next/link'
import { KnowledgeMap } from '@/components/results/KnowledgeMap'
import { ReviewAnswers } from '@/components/results/ReviewAnswers'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { RevealSection } from '@/components/ui/RevealSection'
import { ResultsLoadingScreen } from '@/components/results/ResultsLoadingScreen'
import { ResultsSidebar } from '@/components/results/ResultsSidebar'
import { OverviewTab } from '@/components/results/OverviewTab'
import { CalibrationTab } from '@/components/results/CalibrationTab'
import { NarrativeTab } from '@/components/results/NarrativeTab'
import { GapsStrengthsTab } from '@/components/results/GapsStrengthsTab'
import { ActionPlanTab } from '@/components/results/ActionPlanTab'
import { MetaLearningTab } from '@/components/results/MetaLearningTab'

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: assessmentId } = use(params)
    const { report: streamedReport, isComplete, error, progress, loadingMessage } = useStreamingReport(assessmentId)
    const [activeTab, setActiveTab] = useState('overview')

    const report = streamedReport as AssessmentReport | null

    useEffect(() => {
        const hash = window.location.hash.replace('#', '')
        if (hash) setActiveTab(hash)
    }, [])

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId)
        window.history.replaceState(null, '', `#${tabId}`)
    }

    if (!report?.topic) {
        return <ResultsLoadingScreen progress={progress} loadingMessage={loadingMessage} error={error} />
    }

    if (error && !report?.topic) return (
        <div className="min-h-screen flex items-center justify-center bg-surface">
            <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="font-bold text-black">Failed to generate report.</p>
                <p className="text-sm text-red-600 mt-2">{error}</p>
                <Link href="/assessment" className="text-sm text-gray-500 underline mt-2 block">Try again</Link>
            </div>
        </div>
    )

    const inv = report.investigativeReport

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '🔎' },
        { id: 'review', label: 'Review Questions', icon: '📝' },
        { id: 'map', label: 'Knowledge Map', icon: '🗺️', show: report.knowledgeTree && report.knowledgeTree.nodes.length > 0 },
        { id: 'calibration', label: 'Self-Perception', icon: '🧠', show: (report.calibrationData && report.calibrationData.length > 0) || !!report.confidenceCalibration },
        { id: 'narrative', label: 'Narrative Case File', icon: '📋', show: !!inv?.narrativeAnalysis },
        { id: 'gaps', label: 'Strengths & Gaps', icon: '⚖️', show: !!report.conceptPerformance },
        { id: 'action', label: 'Action Plan', icon: '🎯', show: !!report.actionPlan },
        { id: 'metalearning', label: 'Perspective Shifts', icon: '🌌', show: !!report.enrichedReport }
    ].filter(t => t.show !== false)

    return (
        <div className="min-h-screen bg-surface flex flex-col md:flex-row font-sans">
            <ResultsSidebar
                topic={report.topic}
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isComplete={isComplete}
                progress={progress}
                loadingMessage={loadingMessage}
            />

            <div className="flex-1 p-6 md:p-12 lg:p-16 max-w-5xl overflow-y-auto">
                <ErrorBoundary context="results-viewer" onReset={() => window.location.reload()}>
                <RevealSection>
                    {activeTab === 'overview' && <OverviewTab report={report} />}

                    {activeTab === 'review' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                                <span className="text-4xl">📝</span> Review Questions
                            </h2>
                            <ReviewAnswers assessmentId={assessmentId} />
                        </div>
                    )}

                    {activeTab === 'map' && report.knowledgeTree && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[700px]">
                            <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Topology Map</h2>
                            <div className="h-full border-2 border-black shadow-brutal bg-white">
                                <KnowledgeMap treeData={report.knowledgeTree} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'calibration' && <CalibrationTab report={report} />}
                    {activeTab === 'narrative' && inv?.narrativeAnalysis && <NarrativeTab narrativeAnalysis={inv.narrativeAnalysis} />}
                    {activeTab === 'gaps' && <GapsStrengthsTab report={report} />}
                    {activeTab === 'action' && <ActionPlanTab report={report} />}
                    {activeTab === 'metalearning' && <MetaLearningTab report={report} />}
                </RevealSection>
                </ErrorBoundary>

                <div className="text-center text-xs font-bold uppercase tracking-widest text-gray-400 py-12 mt-12 border-t-2 border-gray-200">
                    <p>STREETS Assessment System • Investigation #{assessmentId.slice(0, 8)}</p>
                    <p className="mt-1">Generated {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    )
}

