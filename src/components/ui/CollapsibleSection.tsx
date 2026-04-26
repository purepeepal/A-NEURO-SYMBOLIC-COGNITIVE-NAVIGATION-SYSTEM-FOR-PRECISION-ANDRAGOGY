'use client'
import { useState } from 'react'

export function CollapsibleSection({ title, icon, defaultOpen = false, children, className = '' }: { title: string, icon: string, defaultOpen?: boolean, children: React.ReactNode, className?: string }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className={`bg-white border-2 border-black shadow-brutal ${className}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-6 text-left focus:outline-none focus:ring-4 focus:ring-black/20 hover:bg-slate-50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm">{icon}</span>
                    <h2 className="text-xl font-black text-black uppercase tracking-tight">{title}</h2>
                </div>
                <div className={`text-2xl font-black transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    Γû╝
                </div>
            </button>
            <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100 border-t-2 border-slate-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}
