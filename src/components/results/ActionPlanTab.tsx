'use client'
import type { AssessmentReport } from '@/lib/domain/assessment/report'
import { ActionPlanList } from '@/components/results/ActionPlanList'

interface ActionPlanTabProps {
    report: AssessmentReport
}

export function ActionPlanTab({ report }: ActionPlanTabProps) {
    const inv = report.investigativeReport

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
            {report.actionPlan && (
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Mastery Execution Plan</h2>
                    <ActionPlanList actionPlan={report.actionPlan} />
                </div>
            )}

            {inv?.predictions && (
                <div className="bg-white p-8 border-2 border-black shadow-brutal">
                    <h3 className="text-xl font-black text-black uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">≡ƒö«</span>
                        What We Predict
                    </h3>
                    <div className="space-y-4">
                        {inv.predictions.conceptsReadyToAdvance && inv.predictions.conceptsReadyToAdvance.length > 0 && (
                            <div className="p-4 bg-green-50 border border-green-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">Ready to Advance</p>
                                <p className="text-gray-800 font-medium">{inv.predictions.conceptsReadyToAdvance.join(', ')}</p>
                            </div>
                        )}
                        {inv.predictions.conceptsNeedingRemediation && inv.predictions.conceptsNeedingRemediation.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-red-600 mb-1">Needs More Practice</p>
                                <p className="text-gray-800 font-medium">{inv.predictions.conceptsNeedingRemediation.join(', ')}</p>
                            </div>
                        )}
                        {inv.predictions.estimatedMasteryTime && (
                            <div className="p-4 bg-blue-50 border border-blue-200">
                                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">Estimated Mastery Time</p>
                                <p className="text-gray-800 font-medium">{inv.predictions.estimatedMasteryTime}</p>
                            </div>
                        )}
                        <div className="p-4 bg-purple-50 border border-purple-200">
                            <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-1">Next Session Predicted Success</p>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 bg-gray-200 h-3">
                                    <div className="h-3 bg-purple-600 transition-all" style={{ width: `${inv.predictions.nextSessionSuccess}%` }} />
                                </div>
                                <span className="font-black text-purple-800">{Math.round(inv.predictions.nextSessionSuccess)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
