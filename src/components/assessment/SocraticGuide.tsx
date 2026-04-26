'use client'

import { useState, useRef, useEffect } from 'react'

interface SocraticGuideProps {
    assessmentId: string
    responseId?: string
    clientContext?: {
        question: string
        userAnswer?: string | null
        concept: string
        explanation?: string | null
    } | null
    onClose: () => void
}

interface Message {
    id: string
    role: 'user' | 'ai'
    text: string
}

const SOCRATIC_STARTERS = [
    "What's the first thing that stands out to you in this question?",
    "Break the question down — what is it actually asking?",
    "What concepts do you think are being tested here?",
    "What's your instinct telling you? Don't second-guess — just think out loud.",
]

export function SocraticGuide({ assessmentId, responseId, clientContext, onClose }: SocraticGuideProps) {
    const [messages, setMessages] = useState<Message[]>(() => {
        const starter = SOCRATIC_STARTERS[Math.floor(Math.random() * SOCRATIC_STARTERS.length)]
        return [{ id: 'init', role: 'ai', text: starter }]
    })
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!inputText.trim()) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText }
        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setLoading(true)

        try {
            const chatHistory = [...messages, userMsg]

            const res = await fetch('/api/assessment/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId,
                    questionId: responseId,
                    message: userMsg.text,
                    mode: 'socratic',
                    history: chatHistory.map(m => ({
                        role: m.role === 'ai' ? 'assistant' : 'user',
                        content: m.text
                    })),
                    clientContext
                })
            })

            const data = await res.json()

            if (data.message) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: data.message }])
            } else {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Signal lost. Try again." }])
            }
        } catch {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Connection interrupted." }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 tracking-widest uppercase">Socratic Guide</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-gray-600 uppercase">Think, don&apos;t seek</span>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="px-3 py-1.5 bg-amber-950/30 border-b border-amber-900/40">
                <p className="text-[10px] font-mono text-amber-500/80 leading-relaxed">
                    I won&apos;t give you the answer. I&apos;ll help you find it yourself.
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 text-sm font-mono ${msg.role === 'user'
                            ? 'bg-white text-black'
                            : 'bg-amber-950/40 text-amber-100 border border-amber-800/50'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-amber-950/40 border border-amber-800/50 p-3 text-xs font-mono text-amber-400 animate-pulse">
                            THINKING...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Share your thinking..."
                        className="flex-1 bg-gray-900 border border-amber-900/50 text-white px-3 py-2 text-sm font-mono focus:border-amber-500 outline-none transition-colors placeholder:text-gray-600"
                        autoFocus
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !inputText.trim()}
                        className="bg-amber-500 text-black px-4 py-2 font-bold font-mono text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                    >
                        ASK
                    </button>
                </div>
            </div>
        </div>
    )
}
