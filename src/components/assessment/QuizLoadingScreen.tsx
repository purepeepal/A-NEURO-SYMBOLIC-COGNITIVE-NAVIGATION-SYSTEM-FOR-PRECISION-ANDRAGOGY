'use client'

export function QuizLoadingScreen() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F4F0] text-black relative overflow-hidden">
            {/* Brutalist Grid Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20"
                style={{ backgroundImage: 'linear-gradient(black 1px, transparent 1px), linear-gradient(90deg, black 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6">
                {/* Brutalist Loader Container */}
                <div className="w-full h-12 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex overflow-hidden mb-12 relative">
                    <div className="h-full bg-black w-full" style={{ animation: 'loading-bar 2s cubic-bezier(0.65, 0, 0.35, 1) infinite', transformOrigin: 'left' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center mix-blend-difference text-white font-black tracking-widest uppercase text-lg">
                        LOADING
                    </div>
                </div>

                {/* Status Text Area */}
                <div className="bg-white border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-full text-center group transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-3">Synthesizing Neural Pathways</h2>
                    <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest animate-pulse">
                        ■ Analysing Curriculum Graph<br />
                        ■ Calibrating Assessment Trajectory<br />
                        ■ Mapping Cognitive Topology
                    </p>
                </div>

                {/* Visual Flair */}
                <div className="mt-16 flex gap-3">
                    <div className="w-6 h-6 border-2 border-black bg-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-6 h-6 border-2 border-black bg-white animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-6 h-6 border-2 border-black bg-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
            <style jsx>{`
                @keyframes loading-bar {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(1); transform-origin: left; }
                    50.1% { transform-origin: right; }
                    100% { transform: scaleX(0); transform-origin: right; }
                }
            `}</style>
        </div>
    )
}
