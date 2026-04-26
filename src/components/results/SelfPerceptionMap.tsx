import React from 'react'
import type { CalibrationResult } from '@/lib/assessment/self-assessment'

export function SelfPerceptionMap({ calibrationData, headlineInsight }: { calibrationData: CalibrationResult[], headlineInsight?: { headline: string, detail: string } }) {
    if (!calibrationData || calibrationData.length === 0) return null

    // Find the largest calibration gap for "Featured Finding" (D4/Al-Rashid directive)
    const validItems = calibrationData.filter(d => d.calibrationType !== 'insufficient_data' && d.calibrationType !== 'emerging_signal')
    const featuredItem = validItems.length > 0
        ? validItems.reduce((max, item) => Math.abs(item.calibrationGap) > Math.abs(max.calibrationGap) ? item : max, validItems[0])
        : null

    return (
        <div className="bg-white p-8 border-2 border-black shadow-brutal">
            <h2 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">⚖️</span>
                Self-Perception vs Reality
            </h2>

            {/* Featured Finding — largest calibration gap elevated as lead card */}
            {featuredItem && featuredItem.calibrationType !== 'well-calibrated' && (
                <div className={`mb-8 p-6 border-2 ${featuredItem.calibrationType === 'overconfident' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">🔍 Featured Finding</p>
                    <h3 className="font-black text-lg text-gray-900 mb-1">{featuredItem.subTopic}</h3>
                    <p className="text-gray-700">
                        {featuredItem.calibrationType === 'overconfident'
                            ? `You rated this as a strength, but your measured performance suggests a familiarity bias — the concepts feel familiar but deep understanding needs reinforcement.`
                            : `You underestimated yourself here. Your measured performance significantly exceeds your self-rating — this is a hidden strength worth building on.`
                        }
                    </p>
                </div>
            )}

            {headlineInsight && (
                <div className="mb-8 p-6 bg-blue-50 border-l-4 border-blue-600">
                    <h3 className="font-bold text-blue-900 mb-2">{headlineInsight.headline}</h3>
                    <p className="text-blue-800 italic leading-relaxed">{headlineInsight.detail}</p>
                </div>
            )}

            <div className="space-y-4">
                {calibrationData.map((item, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{item.subTopic}</h4>
                            <div className="flex items-center gap-2 text-sm mt-1" aria-label={`Self-assessed rating: ${item.selfRating} out of 5`}>
                                <span className="text-gray-500 w-16" aria-hidden="true">Self:</span>
                                <span className="text-lg leading-none tracking-widest" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < item.selfRating ? 'text-black' : 'text-gray-300'}>●</span>)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-2" aria-label={`Measured reality: ${Math.round(item.measuredPerformance)} percent`}>
                                <span className="text-gray-500 w-16" aria-hidden="true">Reality:</span>
                                <div className="flex-1 max-w-[120px] bg-gray-300 h-3 rounded-sm overflow-hidden flex" aria-hidden="true">
                                    <div className="bg-black h-full" style={{ width: `${item.measuredPerformance}%` }} />
                                </div>
                                <span className="text-xs font-bold" aria-hidden="true">{Math.round(item.measuredPerformance)}%</span>
                            </div>
                        </div>

                        {/* Non-color-dependent badges (D6/Accessibility — WCAG 1.4.1 directive) */}
                        <div className="md:w-56 md:text-right mt-2 md:mt-0">
                            {item.calibrationType === 'well-calibrated' && (
                                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-black uppercase border border-green-200">
                                    [✓] Well-Calibrated
                                </span>
                            )}
                            {item.calibrationType === 'overconfident' && (
                                <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-xs font-black uppercase border border-red-200">
                                    [!] Calibration Focus
                                </span>
                            )}
                            {item.calibrationType === 'underconfident' && (
                                <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-black uppercase border border-yellow-300">
                                    [+] Hidden Strength
                                </span>
                            )}
                            {item.calibrationType === 'insufficient_data' && (
                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs font-black uppercase border border-gray-200">
                                    [?] Not Enough Data
                                </span>
                            )}
                            {item.calibrationType === 'emerging_signal' && (
                                <div>
                                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-black uppercase border border-yellow-300">
                                        [~] Emerging Signal
                                    </span>
                                    {item.insight && (
                                        <p className="text-xs text-yellow-700 mt-1 italic">{item.insight}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
