'use client'
import Link from 'next/link'

interface TabItem {
    id: string
    label: string
    icon: string
}

interface ResultsSidebarProps {
    topic: string
    tabs: TabItem[]
    activeTab: string
    onTabChange: (tab: string) => void
    isComplete: boolean
    progress: number
    loadingMessage: string
}

export function ResultsSidebar({ topic, tabs, activeTab, onTabChange, isComplete, progress, loadingMessage }: ResultsSidebarProps) {
    return (
        <div className="w-full md:w-80 bg-white border-b-4 md:border-b-0 md:border-r-4 border-black flex-shrink-0 flex flex-col md:min-h-screen md:sticky top-0 shadow-brutal z-10">
            <div className="p-6 md:p-8 flex-1 flex flex-col">
                <div className="mb-8">
                    <div className="inline-block bg-black text-white px-2 py-1 text-xs font-black uppercase tracking-widest mb-3">Case File</div>
                    <h1 className="text-2xl md:text-3xl font-black text-black tracking-tighter uppercase leading-none">{topic}</h1>
                </div>

                <nav className="flex flex-col gap-2 flex-1" role="tablist" aria-label="Results sections">
                    {tabs.map((tab, idx) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`tabpanel-${tab.id}`}
                            id={`tab-${tab.id}`}
                            className={`flex items-center gap-3 p-4 text-left border-2 font-bold uppercase tracking-tight transition-all duration-200 group ${activeTab === tab.id
                                ? 'bg-black text-white border-black shadow-[4px_4px_0px_0px_rgba(200,200,200,1)]'
                                : 'bg-transparent text-gray-500 border-transparent hover:border-black hover:text-black hover:bg-slate-50'
                                }`}
                        >
                            <span className={`w-8 h-8 flex items-center justify-center text-sm ${activeTab === tab.id ? 'bg-white text-black' : 'bg-gray-100 group-hover:bg-black group-hover:text-white'}`}>
                                {tab.icon}
                            </span>
                            <span>{idx + 1}. {tab.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-8 pt-8 border-t-2 border-gray-100">
                    {!isComplete && (
                        <div className="mb-4">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
                                <span>Loading</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1">
                                <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-xs text-gray-400 mt-1 font-medium">{loadingMessage}</p>
                        </div>
                    )}
                    <Link
                        href="/dashboard"
                        className="block w-full text-center border-2 border-black py-4 font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors mb-2"
                    >
                        ΓåÉ Dashboard
                    </Link>
                    <Link
                        href="/assessment"
                        className="block w-full text-center border-2 border-black py-4 font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                    >
                        + New Investigation
                    </Link>
                </div>
            </div>
        </div>
    )
}
