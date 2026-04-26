'use client'
import Link from 'next/link'

interface ResultsLoadingScreenProps {
    progress: number
    loadingMessage: string
    error: string | null
}

export function ResultsLoadingScreen({ progress, loadingMessage, error }: ResultsLoadingScreenProps) {
    const loadingMessages = [
        'Analyzing your responses...',
        'Mapping your knowledge topology...',
        'Building your insight report...',
    ]

    return (
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                <div className="text-6xl mb-8 animate-pulse">≡ƒöì</div>
                <h2 className="text-2xl font-black text-black mb-8 tracking-tight">INVESTIGATION IN PROGRESS</h2>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 h-2 border border-black mb-6">
                    <div
                        className="h-full bg-black transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">{loadingMessage}</p>

                <div className="space-y-4">
                    {loadingMessages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-3 transition-all duration-500 ${progress > (i + 1) * 25
                                ? 'opacity-100 translate-x-0'
                                : 'opacity-0 -translate-x-4'
                                }`}
                        >
                            <span className={`w-5 h-5 border-2 border-black flex items-center justify-center text-xs ${progress > (i + 1) * 25 ? 'bg-black text-white' : ''}`}>
                                {progress > (i + 1) * 25 ? 'Γ£ô' : ''}
                            </span>
                            <span className="text-sm font-bold uppercase tracking-wider text-gray-600">{msg}</span>
                        </div>
                    ))}
                </div>
                {error && (
                    <div className="mt-6 p-4 border-2 border-red-500 bg-red-50">
                        <p className="text-sm font-bold text-red-700">{error}</p>
                        <Link href="/assessment" className="text-xs text-red-500 underline mt-2 block">Try again</Link>
                    </div>
                )}
            </div>
        </div>
    )
}
