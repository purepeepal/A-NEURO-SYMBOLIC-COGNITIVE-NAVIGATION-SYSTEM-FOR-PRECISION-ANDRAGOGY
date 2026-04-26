'use client'
// ─── GraphRAG Chat Widget ───────────────────────────────────────────
// Floating chat panel that queries the GraphRAG system.
// Provides curriculum-grounded responses and assessment navigation.
// Falls back to LLM only for KG-referenced topics.

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    source?: 'kg-seed' | 'kg-augmented' | 'llm-fallback' | 'rejected'
    navigation?: {
        nodeId: string
        nodeLabel: string
        nodeType: string
        assessmentUrl?: string
    }
    concepts?: { name: string; source: string; assessable: boolean }[]
}

interface GraphRAGChatProps {
    isOpen: boolean
    onClose: () => void
    /** Pre-fill with context from a clicked node */
    initialContext?: {
        nodeId: string
        nodeLabel: string
        subject?: string
    }
}

export function GraphRAGChat({ isOpen, onClose, initialContext }: GraphRAGChatProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Ask me about any topic in the curriculum. I\'ll find it in the Knowledge Graph and help you navigate or start an assessment.',
            source: 'kg-seed',
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [isOpen])

    // Handle initial context (e.g., from clicking a node)
    useEffect(() => {
        if (initialContext && isOpen) {
            sendMessage(`Tell me about ${initialContext.nodeLabel}`, 'explore')
        }
    }, [initialContext, isOpen])

    const sendMessage = useCallback(async (text: string, intent?: string) => {
        if (!text.trim()) return

        const userMsg: ChatMessage = { role: 'user', content: text }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/kg/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    intent: intent || inferIntent(text),
                    context: initialContext ? {
                        currentNodeId: initialContext.nodeId,
                        currentSubject: initialContext.subject,
                    } : undefined,
                }),
            })

            if (!res.ok) throw new Error('Chat request failed')

            const data = await res.json()

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: data.message,
                source: data.source,
                navigation: data.navigation,
                concepts: data.concepts,
            }

            setMessages(prev => [...prev, assistantMsg])
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong. Try again or use the graph to navigate directly.',
                source: 'rejected',
            }])
        } finally {
            setLoading(false)
        }
    }, [initialContext])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        sendMessage(input)
    }

    if (!isOpen) return null

    return (
        <div className="fixed bottom-4 right-4 w-[380px] max-h-[560px] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black text-white border-b-2 border-black shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm">📚</span>
                    <span className="text-xs font-black uppercase tracking-widest">Curriculum Chat</span>
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 font-bold uppercase">GraphRAG</span>
                </div>
                <button
                    onClick={onClose}
                    className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white text-sm font-bold"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${msg.role === 'user'
                            ? 'bg-black text-white p-3'
                            : 'bg-gray-50 border-2 border-black/10 p-3'
                            }`}>
                            {/* Source tag */}
                            {msg.source && msg.role === 'assistant' && (
                                <div className="flex items-center gap-1 mb-1.5">
                                    <span className={`text-[8px] font-bold uppercase px-1 py-0.5 ${
                                        msg.source === 'kg-seed' ? 'bg-green-100 text-green-700' :
                                        msg.source === 'kg-augmented' ? 'bg-blue-100 text-blue-700' :
                                        msg.source === 'llm-fallback' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                        {msg.source === 'kg-seed' ? 'CURRICULUM' :
                                         msg.source === 'kg-augmented' ? 'KG-AUGMENTED' :
                                         msg.source === 'llm-fallback' ? 'AI-FALLBACK' : 'NOT FOUND'}
                                    </span>
                                </div>
                            )}

                            {/* Message content (with markdown-like rendering) */}
                            <div className="text-xs leading-relaxed whitespace-pre-wrap">
                                {renderMarkdownLight(msg.content)}
                            </div>

                            {/* Navigation CTA */}
                            {msg.navigation?.assessmentUrl && (
                                <button
                                    onClick={() => router.push(msg.navigation!.assessmentUrl!)}
                                    className="mt-2 w-full py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors"
                                >
                                    START ASSESSMENT →
                                </button>
                            )}

                            {msg.navigation && !msg.navigation.assessmentUrl && (
                                <button
                                    onClick={() => {
                                        // Close chat and navigate to graph view
                                        onClose()
                                    }}
                                    className="mt-2 w-full py-2 border-2 border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                                >
                                    VIEW IN GRAPH →
                                </button>
                            )}

                            {/* Concepts list */}
                            {msg.concepts && msg.concepts.length > 0 && msg.concepts.length <= 8 && (
                                <div className="mt-2 pt-2 border-t border-black/10">
                                    <span className="text-[9px] font-bold uppercase text-gray-400">Concepts:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {msg.concepts.slice(0, 8).map((c, j) => (
                                            <span key={j} className={`text-[9px] px-1.5 py-0.5 font-medium ${
                                                c.source === 'seed'
                                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {c.name}
                                            </span>
                                        ))}
                                        {msg.concepts.length > 8 && (
                                            <span className="text-[9px] text-gray-400">+{msg.concepts.length - 8} more</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-50 border-2 border-black/10 p-3">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-black border-t-transparent animate-spin" />
                                <span className="text-[10px] font-bold uppercase text-gray-400">Searching KG…</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick actions */}
            <div className="px-3 py-1.5 border-t border-black/10 flex gap-1 shrink-0 overflow-x-auto">
                {['Mathematics', 'Science', 'Social Science'].map(subject => (
                    <button
                        key={subject}
                        onClick={() => sendMessage(`What topics are in ${subject}?`, 'explore')}
                        className="px-2 py-1 text-[9px] font-bold uppercase bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap shrink-0"
                    >
                        {subject}
                    </button>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex border-t-2 border-black shrink-0">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about a topic…"
                    className="flex-1 px-4 py-3 text-sm font-medium focus:outline-none bg-white"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-3 bg-black text-white text-xs font-black uppercase disabled:opacity-30 hover:bg-blue-600 transition-colors"
                >
                    ASK
                </button>
            </form>
        </div>
    )
}

// ─── Helpers ────────────────────────────────────────────────────────

function inferIntent(text: string): string {
    const lower = text.toLowerCase()
    if (lower.includes('assess') || lower.includes('test') || lower.includes('quiz')) return 'assessment'
    if (lower.includes('prerequisite') || lower.includes('prereq') || lower.includes('before')) return 'prerequisites'
    if (lower.includes('explain') || lower.includes('what is') || lower.includes('tell me about')) return 'explain'
    return 'explore'
}

function renderMarkdownLight(text: string): React.ReactNode {
    // Simple bold rendering
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-black">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
    })
}
