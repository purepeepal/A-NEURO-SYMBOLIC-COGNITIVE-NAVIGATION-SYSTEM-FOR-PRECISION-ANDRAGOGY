'use client'
import type { AssessmentReport } from '@/lib/domain/assessment/report'
import { SelfPerceptionMap } from '@/components/results/SelfPerceptionMap'

export function CalibrationTab({ report }: { report: AssessmentReport }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Self-Perception Analysis</h2>
            {report.calibrationData && report.calibrationData.length > 0 && (
                <SelfPerceptionMap
                    calibrationData={report.calibrationData}
                    headlineInsight={report.calibrationInsight}
                />
            )}

            {/* Per-Question Confidence Calibration */}
            {report.confidenceCalibration && report.confidenceCalibration.signals.length > 0 && (
                <div className="mt-12 pt-8 border-t-4 border-black">
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">In-Quiz Confidence Check</h3>
                    <p className="text-sm text-gray-600 font-medium mb-6">
                        How your per-question confidence ratings aligned with actual performance.
                    </p>

                    {/* Overall bias indicator */}
                    <div className="bg-white border-2 border-black p-6 shadow-brutal-sm mb-6">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl">
                                {report.confidenceCalibration.overallBias > 0.1 ? '≡ƒôê' : report.confidenceCalibration.overallBias < -0.1 ? '≡ƒôë' : 'ΓÜû∩╕Å'}
                            </span>
                            <div>
                                <div className="font-black text-lg uppercase tracking-tight">
                                    {report.confidenceCalibration.overallBias > 0.1
                                        ? 'Overall Overconfident'
                                        : report.confidenceCalibration.overallBias < -0.1
                                            ? 'Overall Underconfident'
                                            : 'Well Calibrated Overall'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    {report.confidenceCalibration.overconfidentCount} overconfident, {report.confidenceCalibration.underconfidentCount} underconfident, {report.confidenceCalibration.calibratedCount} calibrated
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Per-concept signals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {report.confidenceCalibration.signals
                            .filter(s => s.signal !== 'insufficient_data')
                            .sort((a, b) => {
                                const order = { overconfident: 0, underconfident: 1, 'well-calibrated': 2, 'emerging_signal': 3 } as const
                                return (order[a.signal as keyof typeof order] ?? 4) - (order[b.signal as keyof typeof order] ?? 4)
                            })
                            .map(s => (
                                <div
                                    key={s.concept}
                                    className={`p-4 border-2 border-black ${s.signal === 'overconfident'
                                        ? 'bg-red-50 border-l-8 border-l-red-500'
                                        : s.signal === 'underconfident'
                                            ? 'bg-blue-50 border-l-8 border-l-blue-500'
                                            : s.signal === 'emerging_signal'
                                                ? 'bg-yellow-50 border-l-8 border-l-yellow-500'
                                                : 'bg-green-50 border-l-8 border-l-green-500'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-black text-sm uppercase tracking-tight">{s.concept}</span>
                                        <span className={`text-xs font-bold px-2 py-1 border-2 ${s.signal === 'overconfident'
                                            ? 'bg-red-100 border-red-300 text-red-800'
                                            : s.signal === 'underconfident'
                                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                : s.signal === 'emerging_signal'
                                                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                                    : 'bg-green-100 border-green-300 text-green-800'
                                            }`}>
                                            {s.signal === 'overconfident' ? '≡ƒôê OVER' : s.signal === 'underconfident' ? '≡ƒôë UNDER' : s.signal === 'emerging_signal' ? '~ EMERGING' : 'Γ£ô CALIBRATED'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{s.description}</p>
                                    <div className="mt-2 flex gap-4 text-xs text-gray-500 font-medium">
                                        <span>Confidence: {s.avgConfidence.toFixed(1)}/3</span>
                                        <span>Accuracy: {Math.round(s.accuracy * 100)}%</span>
                                        <span>{s.totalQuestions} Qs</span>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Insufficient data concepts */}
                    {report.confidenceCalibration.signals.some(s => s.signal === 'insufficient_data') && (
                        <div className="mt-4 text-xs text-gray-400 font-medium">
                            Insufficient data for: {report.confidenceCalibration.signals
                                .filter(s => s.signal === 'insufficient_data')
                                .map(s => s.concept)
                                .join(', ')}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
