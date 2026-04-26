'use client'
import type { AssessmentReport } from '@/lib/domain/assessment/report'

interface MetaLearningTabProps {
    report: AssessmentReport
}

export function MetaLearningTab({ report }: MetaLearningTabProps) {
    const enriched = report.enrichedReport

    if (!enriched) return null

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-blue-900 border-b-4 border-blue-900 pb-2">
                    The Metacognitive Mirror
                </h2>
                <p className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-6">
                    Stage: <span className="text-blue-600">{enriched.learnerStageAssessment}</span>
                </p>
                <div className="bg-white p-6 border-4 border-black shadow-brutal mb-8">
                    <p className="font-medium text-lg italic text-gray-800 border-l-4 border-black pl-4">
                        "{enriched.metacognitiveCalibrationSummary}"
                    </p>
                    <p className="mt-4 text-sm font-bold text-gray-600 uppercase tracking-widest">
                        Evidence: {enriched.learnerStageEvidence}
                    </p>
                </div>
            </div>

            {enriched.perspectiveShifts && enriched.perspectiveShifts.length > 0 && (
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">🌌</span>
                        Perspective Shifts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {enriched.perspectiveShifts.map((shift: any, idx: number) => (
                            <div key={idx} className="bg-purple-50 p-6 border-2 border-purple-900 shadow-[4px_4px_0_0_#581c87] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_#581c87] transition-all">
                                <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-2">Bridge: {shift.bridgeConcept}</p>
                                <h4 className="font-black text-lg mb-2">{shift.currentDomain} ↔ {shift.suggestedDomain}</h4>
                                <p className="text-sm font-medium text-gray-800 mb-4">{shift.rationale}</p>
                                <div className="bg-white p-3 border-l-2 border-purple-400">
                                    <p className="text-xs font-bold uppercase text-purple-800">Growth Path</p>
                                    <p className="text-sm">{shift.expectedGrowth}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {enriched.metaLearningRecommendations && enriched.metaLearningRecommendations.length > 0 && (
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">🛠️</span>
                        Meta-Learning Practices
                    </h3>
                    <div className="space-y-6">
                        {enriched.metaLearningRecommendations.map((rec: any, idx: number) => (
                            <div key={idx} className="bg-blue-50 p-6 border-2 border-blue-900 shadow-[4px_4px_0_0_#1e3a8a]">
                                <h4 className="font-black text-lg text-blue-900 mb-2">{rec.practice}</h4>
                                <p className="text-md font-medium text-gray-800 mb-4">{rec.description}</p>
                                <div className="grid grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t-2 border-dashed border-blue-200">
                                    <div>
                                        <p className="font-bold text-blue-800 uppercase text-xs mb-1">When to Apply</p>
                                        <p>{rec.frequencyGuidance}</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-blue-800 uppercase text-xs mb-1">Evidence Basis</p>
                                        <p>{rec.evidenceBasis}</p>
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
