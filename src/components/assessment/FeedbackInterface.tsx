'use client'

import { useState, useRef, useEffect } from 'react'

interface FeedbackInterfaceProps {
    assessmentId: string
    responseId?: string
    clientContext?: {
        question: string
        userAnswer?: string | null
        concept: string
        explanation?: string | null
    } | null
    onClose: () => void
    isLastAnswerWrong?: boolean
    onTerminate: () => void
}

interface Message {
    id: string
    role: 'user' | 'ai'
    text: string
}

export function FeedbackInterface({ assessmentId, responseId, clientContext, onClose, isLastAnswerWrong, onTerminate }: FeedbackInterfaceProps) {
    const [step, setStep] = useState<'menu' | 'chat'>('menu')
    const [messages, setMessages] = useState<Message[]>([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const startChat = (optionId: string, label: string) => {
        setStep('chat')
        let initialMessage = ""
        switch (optionId) {
            case 'appeal': initialMessage = "I see you want to appeal. Explain your reasoning — I'm listening."; break;
            case 'dispute': initialMessage = "You disagree with the judgement? Make your case."; break;
            case 'unclear': initialMessage = "What part of the question was unclear?"; break;
            case 'technical_issue': initialMessage = "Describe the glitch. I'll log it."; break;
            case 'explain_thought': initialMessage = "Let's walk through the thought process behind this answer. What part would you like me to break down?"; break;
            case 'why_wrong': initialMessage = "Let's trace where your reasoning diverged. Can you describe what approach you took?"; break;
            case 'deeper': initialMessage = "Let's go deeper into this concept. What specifically do you want to explore?"; break;
            default: initialMessage = "Systems online. What's on your mind?";
        }

        setMessages([
            { id: 'init', role: 'ai', text: initialMessage }
        ])
    }

    const sendMessage = async () => {
        if (!inputText.trim()) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputText }
        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setLoading(true)

        try {
            // Keep the last 15 messages so the sliding window doesn't get ridiculously large all at once
            // But mathematically, we also send the full context to a backend window manager.
            const chatHistory = [...messages, userMsg];

            const res = await fetch('/api/assessment/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assessmentId,
                    questionId: responseId,
                    message: userMsg.text,
                    mode: 'evaluation',
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
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Transmission interrupted. (Error)" }])
            }
        } catch (e) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Connection failed." }])
        } finally {
            setLoading(false)
        }
    }

    // Menu View
    if (step === 'menu') {
        const options = [
            ...(isLastAnswerWrong ? [{ id: 'appeal', label: 'Appeal Decision', icon: '⚖️' }] : []),
            ...(isLastAnswerWrong ? [{ id: 'why_wrong', label: 'Why Was I Wrong?', icon: '🔍' }] : []),
            { id: 'explain_thought', label: 'Explain Thought Process', icon: '🧠' },
            { id: 'deeper', label: 'Go Deeper on Concept', icon: '📚' },
            { id: 'dispute', label: 'Dispute Judgement', icon: '🛡️' },
            { id: 'unclear', label: 'Question Was Unclear', icon: '❓' },
            { id: 'technical_issue', label: 'Technical Glitch', icon: '💻' },
        ]

        return (
            <div className="p-4">
                <p className="mb-4 font-bold text-sm uppercase tracking-wider text-gray-500">Select Mode</p>
                <div className="space-y-2">
                    {options.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => startChat(opt.id, opt.label)}
                            className="w-full text-left p-3 border border-gray-800 hover:bg-white hover:text-black transition-all flex items-center group font-mono text-sm"
                        >
                            <span className="mr-3 text-xl">{opt.icon}</span>
                            <span className="font-bold">{opt.label}</span>
                            <span className="ml-auto opacity-0 group-hover:opacity-100">&rarr;</span>
                        </button>
                    ))}

                    <div className="h-px bg-gray-800 my-4"></div>

                    <button
                        onClick={onTerminate}
                        className="w-full text-left p-3 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center group font-mono text-sm"
                    >
                        <span className="mr-3 text-xl">🛑</span>
                        <span className="font-bold">End Session</span>
                    </button>
                </div>
            </div>
        )
    }

    // Chat View
    return (
        <div className="flex flex-col h-full bg-black">
            {/* Header */}
            <div className="p-2 border-b border-gray-800 flex items-center">
                <button
                    onClick={() => setStep('menu')}
                    className="text-xs font-mono text-gray-500 hover:text-white px-2"
                >
                    &larr; BACK
                </button>
                <div className="ml-auto flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 text-sm font-mono ${msg.role === 'user'
                            ? 'bg-white text-black'
                            : 'bg-gray-900 text-gray-200 border border-gray-800'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-900 border border-gray-800 p-3 text-xs font-mono text-gray-500 animate-pulse">
                            TYPING...
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
                        placeholder="Type message..."
                        className="flex-1 bg-gray-900 border border-gray-800 text-white px-3 py-2 text-sm font-mono focus:border-white outline-none transition-colors"
                        autoFocus
                    />
                    <button
                        onClick={sendMessage}
                        disabled={loading || !inputText.trim()}
                        className="bg-white text-black px-4 py-2 font-bold font-mono text-sm hover:bg-gray-200 disabled:opacity-50"
                    >
                        SEND
                    </button>
                </div>
            </div>
        </div>
    )
}
