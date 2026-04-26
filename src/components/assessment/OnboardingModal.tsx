'use client'
import { useState, useEffect } from 'react'

const ONBOARDED_KEY = 'streets_onboarded'

export function OnboardingModal() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        try {
            const onboarded = localStorage.getItem(ONBOARDED_KEY)
            if (!onboarded) {
                setShow(true)
            }
        } catch {
            // localStorage unavailable
        }
    }, [])

    const handleDismiss = () => {
        try {
            localStorage.setItem(ONBOARDED_KEY, 'true')
        } catch { /* swallow */ }
        setShow(false)
    }

    if (!show) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border-4 border-black shadow-brutal max-w-lg w-full p-8 relative">
                {/* Header */}
                <div className="border-b-4 border-black pb-4 mb-6">
                    <div className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500 mb-1">FIRST TIME?</div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase">How This Works</h2>
                </div>

                {/* Steps */}
                <div className="space-y-5 mb-8">
                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg flex-shrink-0">
                            1
                        </div>
                        <div>
                            <div className="font-black uppercase text-sm">Choose a Topic</div>
                            <p className="text-gray-600 text-sm mt-0.5">
                                Enter any subject ΓÇö from Calculus to World History. The system adapts to any domain.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg flex-shrink-0">
                            2
                        </div>
                        <div>
                            <div className="font-black uppercase text-sm">Answer Questions</div>
                            <p className="text-gray-600 text-sm mt-0.5">
                                An AI investigator adapts in real-time to probe your knowledge boundaries. Takes 5ΓÇô15 minutes.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-lg flex-shrink-0">
                            3
                        </div>
                        <div>
                            <div className="font-black uppercase text-sm">Get Your Cognitive Profile</div>
                            <p className="text-gray-600 text-sm mt-0.5">
                                Receive a detailed knowledge map, gap analysis, action plan, and a detective-style investigation report about how you think.
                            </p>
                        </div>
                    </div>
                </div>

                {/* What you'll get */}
                <div className="bg-gray-50 border-2 border-gray-200 p-4 mb-6">
                    <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">You&apos;ll Discover</div>
                    <div className="flex flex-wrap gap-2">
                        {['Knowledge Map', 'Gap Analysis', 'Action Plan', 'Error Patterns', 'Cognitive Profile'].map(tag => (
                            <span key={tag} className="text-xs font-bold bg-black text-white px-2 py-1 uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <button
                    onClick={handleDismiss}
                    className="brutalist-button w-full text-lg py-4"
                >
                    GOT IT ΓÇö LET&apos;S GO ΓåÆ
                </button>
            </div>
        </div>
    )
}
