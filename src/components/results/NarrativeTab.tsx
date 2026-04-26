'use client'

export function NarrativeTab({ narrativeAnalysis }: { narrativeAnalysis: string }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 md:p-12 border-2 border-black shadow-brutal">
                <h2 className="text-3xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <span className="text-4xl">≡ƒôï</span> The Detective&apos;s Case File
                </h2>
                <div className="prose prose-xl max-w-none prose-p:leading-relaxed prose-headings:font-black">
                    <p className="text-gray-800 font-medium whitespace-pre-line">
                        {narrativeAnalysis}
                    </p>
                </div>
            </div>
        </div>
    )
}
