'use client'
import type { AssessmentReport } from '@/lib/domain/assessment/report'

export function GapsStrengthsTab({ report }: { report: AssessmentReport }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Detailed Diagnostics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Strengths Column */}
                <div className="bg-white p-8 border-2 border-black shadow-brutal flex flex-col h-full">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 bg-green-600 text-white flex items-center justify-center text-sm">Γ£ô</span>
                        Strengths
                    </h3>
                    <div className="space-y-4 flex-1">
                        {report.conceptPerformance
                            .filter(c => (c.correctCount / c.questionsAsked) >= 0.7)
                            .map(c => (
                                <div key={c.concept} className="flex flex-col p-4 border-2 border-green-200 bg-green-50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-green-900">{c.concept}</span>
                                        <span className="text-sm font-black text-green-700 bg-white px-3 py-1 border-2 border-green-300">
                                            {Math.round((c.correctCount / c.questionsAsked) * 100)}%
                                        </span>
                                    </div>
                                    {c.confidence && (
                                        <div className="text-xs font-bold text-green-700 flex justify-between items-center opacity-80 mt-1" aria-label={`Confidence: ${c.confidence.label}`}>
                                            <span>{c.confidence.label.toUpperCase()}{c.confidence.uncertaintyRange ? ` (┬▒${c.confidence.uncertaintyRange}%)` : ''}</span>
                                            <span>({c.confidence.sampleSize} Q)</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        {report.conceptPerformance.filter(c => (c.correctCount / c.questionsAsked >= 0.7)).length === 0 && (
                            <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-gray-300 text-gray-500 font-medium text-center">
                                Keep exploring ΓÇö mastery builds over time.
                            </div>
                        )}
                    </div>
                </div>

                {/* Gaps Column */}
                <div className="bg-white p-8 border-2 border-black shadow-brutal flex flex-col h-full">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-3">
                        <span className="w-8 h-8 bg-red-500 text-white flex items-center justify-center text-sm">!</span>
                        Knowledge Gaps
                    </h3>
                    <div className="space-y-4 flex-1">
                        {report.knowledgeGaps.map((gap: any) => (
                            <div key={gap.concept} className="p-4 border-2 border-red-200 bg-red-50">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-black text-gray-900 leading-tight pr-2">{gap.concept}</span>
                                    <span className={`text-xs font-black px-2 py-1 uppercase tracking-widest ${gap.gap_severity === 'critical'
                                        ? 'bg-red-500 text-white'
                                        : 'bg-orange-400 text-white'
                                        }`}>
                                        {gap.gap_severity}
                                    </span>
                                </div>
                                <div className="w-full bg-white border border-gray-300 h-3 mb-3">
                                    <div
                                        className={`h-full ${gap.gap_severity === 'critical' ? 'bg-red-500' : 'bg-orange-400'}`}
                                        style={{ width: `${gap.mastery_score}%` }}
                                    />
                                </div>
                                {(() => {
                                    const perfData = report.conceptPerformance.find(p => p.concept === gap.concept)
                                    if (perfData?.confidence) {
                                        return (
                                            <div className="text-xs font-bold text-red-800 flex justify-between border-t border-red-200 pt-2 mt-2">
                                                <span className="uppercase">{perfData.confidence.label}{perfData.confidence.uncertaintyRange ? ` (┬▒${perfData.confidence.uncertaintyRange}%)` : ''}</span>
                                                {perfData.confidence.caveat && (
                                                    <span className="italic opacity-80">{perfData.confidence.caveat}</span>
                                                )}
                                            </div>
                                        )
                                    }
                                    return null
                                })()}
                            </div>
                        ))}
                        {report.knowledgeGaps.length === 0 && (
                            <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-green-300 text-green-600 font-bold text-center">
                                No significant gaps identified ΓÇö excellent work!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Patterns Analysis */}
            <div className="bg-white p-8 border-2 border-black shadow-brutal mt-8">
                <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">≡ƒôè</span>
                    Error Patterns
                </h3>
                <div className="space-y-4">
                    {report.conceptPerformance
                        .filter(c => c.questionsAsked >= 2)
                        .map(c => {
                            const total = Object.values(c.errorPatterns).reduce((a, b) => a + b, 0)
                            if (total === 0) return null

                            return (
                                <div key={c.concept} className="p-5 bg-gray-50 border-2 border-gray-200">
                                    <p className="font-black text-black mb-3">{c.concept}</p>
                                    <div className="flex h-5 overflow-hidden border-2 border-black">
                                        {c.errorPatterns.correct > 0 && (
                                            <div className="bg-green-500 h-full" style={{ width: `${(c.errorPatterns.correct / total) * 100}%` }} title={`Correct: ${c.errorPatterns.correct}`} />
                                        )}
                                        {c.errorPatterns.conceptual > 0 && (
                                            <div className="bg-red-500 h-full" style={{ width: `${(c.errorPatterns.conceptual / total) * 100}%` }} title={`Conceptual: ${c.errorPatterns.conceptual}`} />
                                        )}
                                        {c.errorPatterns.procedural > 0 && (
                                            <div className="bg-orange-500 h-full" style={{ width: `${(c.errorPatterns.procedural / total) * 100}%` }} title={`Procedural: ${c.errorPatterns.procedural}`} />
                                        )}
                                        {c.errorPatterns.careless > 0 && (
                                            <div className="bg-yellow-400 h-full" style={{ width: `${(c.errorPatterns.careless / total) * 100}%` }} title={`Careless: ${c.errorPatterns.careless}`} />
                                        )}
                                        {c.errorPatterns.prerequisite_gap > 0 && (
                                            <div className="bg-purple-500 h-full" style={{ width: `${(c.errorPatterns.prerequisite_gap / total) * 100}%` }} title={`Prerequisite: ${c.errorPatterns.prerequisite_gap}`} />
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                </div>
                <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t-2 border-gray-100 text-xs font-black uppercase tracking-widest">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 border border-black"></span>Correct</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-500 border border-black"></span>Conceptual</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 border border-black"></span>Procedural</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-400 border border-black"></span>Careless</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-500 border border-black"></span>Prerequisite</span>
                </div>
            </div>
        </div>
    )
}
