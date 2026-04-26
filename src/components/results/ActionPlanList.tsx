import React, { useState } from 'react'
import type { ActionPlan, ActionItem } from '@/lib/llm/types'

function generateCalendarLink(item: ActionItem): string {
    const title = `STREETS: ${item.title}`
    const details = `${item.rationale}\n\nSuggested Activity: ${item.suggestion}`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}`
}

export function ActionPlanList({ actionPlan }: { actionPlan: ActionPlan }) {
    if (!actionPlan || !actionPlan.items || actionPlan.items.length === 0) return null

    return (
        <div className="bg-white p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mt-12 mb-12">
            <h2 className="text-xl font-black text-black uppercase tracking-tight mb-2 flex items-center gap-2">
                <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">🎯</span>
                Your Action Plan
            </h2>

            {actionPlan.overallMessage && (
                <div className="mb-6 p-5 bg-slate-50 border-2 border-slate-200">
                    <p className="text-gray-800 font-bold text-lg leading-relaxed">
                        &ldquo;{actionPlan.overallMessage}&rdquo;
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {actionPlan.items.map((item, idx) => (
                    <ActionItemCard key={idx} item={item} index={idx + 1} />
                ))}
            </div>

            <p className="text-xs text-gray-400 mt-4 italic">
                ℹ️ Resource suggestions are AI-generated and may not always link to exact materials. Verify availability before starting.
            </p>

            {actionPlan.nextSessionSuggestion && (
                <div className="mt-8 p-6 bg-black text-white text-center border-2 border-black">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Your Next Investigation</p>
                    <p className="text-white font-bold text-lg mb-4">{actionPlan.nextSessionSuggestion}</p>
                    <a
                        href="/"
                        className="inline-block px-8 py-3 bg-white text-black font-black uppercase tracking-wider text-sm hover:bg-gray-100 transition-colors border-2 border-white"
                    >
                        Start Another Assessment →
                    </a>
                </div>
            )}
        </div>
    )
}

function ActionItemCard({ item, index }: { item: ActionItem, index: number }) {
    const [expanded, setExpanded] = useState(false)

    const priorityColors = {
        critical: 'bg-red-100 text-red-800 border-red-300',
        reinforce: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        stretch: 'bg-green-100 text-green-800 border-green-300'
    }

    const priorityIcons = {
        critical: '🔴',
        reinforce: '🟡',
        stretch: '🟢'
    }

    return (
        <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50 transition-all">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 flex items-start sm:items-center gap-4 hover:bg-gray-100 transition-colors"
            >
                <div className="text-2xl font-black text-gray-300 w-8 text-center">{index}</div>

                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 border rounded-sm flex items-center gap-1 ${priorityColors[item.priority]}`}>
                            <span>{priorityIcons[item.priority]}</span> {item.priority}
                        </span>
                        <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                            ⏱️ {item.timeEstimate}
                        </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.title}</h3>
                </div>

                <div className="text-gray-400">
                    {expanded ? '▲' : '▼'}
                </div>
            </button>

            {expanded && (
                <div className="p-4 pt-0 pl-16 border-t border-gray-200 mt-2 bg-white">
                    <div className="mb-4 mt-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Why this matters</h4>
                        <p className="text-gray-800">{item.rationale}</p>
                    </div>

                    <div className="mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Suggested Activity</h4>
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-sm text-blue-900 font-medium">
                            {item.suggestion}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <a
                            href={generateCalendarLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                        >
                            📅 Schedule It
                        </a>

                        {item.relatedGaps && item.relatedGaps.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-500">Related:</span>
                                {item.relatedGaps.map(gap => (
                                    <span key={gap} className="text-xs bg-gray-100 px-2 py-1 border border-gray-200 text-gray-600">
                                        {gap}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
