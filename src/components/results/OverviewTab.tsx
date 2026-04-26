'use client'
import type { AssessmentReport } from '@/lib/domain/assessment/report'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'

export function OverviewTab({ report }: { report: AssessmentReport }) {
    const inv = report.investigativeReport
    const accuracyColor = report.accuracy >= 80 ? 'text-green-600' : report.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 md:p-12 border-2 border-black shadow-brutal">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
                    <span className="text-4xl">≡ƒöÄ</span> Executive Summary
                </h2>
                {inv?.executiveSummary ? (
                    <p className="text-xl text-gray-800 leading-relaxed font-medium border-l-4 border-black pl-6">
                        {inv.executiveSummary}
                    </p>
                ) : (
                    <p className="text-xl text-gray-800 leading-relaxed font-medium border-l-4 border-black pl-6">
                        Across {report.totalQuestions} questions, you demonstrated a <strong className="uppercase">{report.accuracy >= 80 ? 'strong' : report.accuracy >= 50 ? 'developing' : 'foundational'}</strong> understanding
                        of {report.topic} with {report.knowledgeGaps.length} knowledge gap{report.knowledgeGaps.length !== 1 ? 's' : ''} identified.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Accuracy', value: <span className={`${accuracyColor}`}><AnimatedNumber value={Math.round(report.accuracy)} suffix="%" /></span> },
                    { label: 'Questions', value: <AnimatedNumber value={report.totalQuestions} /> },
                    { label: 'Gaps Found', value: <span className={report.knowledgeGaps.length > 0 ? 'text-red-500' : 'text-green-600'}><AnimatedNumber value={report.knowledgeGaps.length} /></span> },
                    { label: 'Duration', value: <span>{report.timeTakenSeconds < 60 ? `${report.timeTakenSeconds}s` : `${Math.floor(report.timeTakenSeconds / 60)}m ${report.timeTakenSeconds % 60}s`}</span> },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 border-2 border-black shadow-brutal-sm text-center flex flex-col justify-center">
                        <div className="text-4xl font-black mb-2">{stat.value}</div>
                        <div className="text-xs font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            {inv?.keyInsights && inv.keyInsights.length > 0 && (
                <div className="bg-white p-8 border-2 border-black shadow-brutal">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">≡ƒÆí</span>
                        Key Findings
                    </h3>
                    <div className="space-y-4">
                        {inv.keyInsights.map((insight: any, i: number) => (
                            <div key={i} className="p-5 bg-surface border-l-4 border-black transition-transform hover:-translate-y-1">
                                <div className="flex items-start gap-4">
                                    <span className="text-2xl mt-0.5">
                                        {insight.type === 'strength' ? 'Γ£à' : insight.type === 'gap' ? 'ΓÜá∩╕Å' : '≡ƒöì'}
                                    </span>
                                    <div>
                                        <p className="font-bold text-black text-lg">{insight.title || insight.insight}</p>
                                        {insight.evidence && (
                                            <p className="text-base text-gray-700 mt-2">{insight.evidence}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
