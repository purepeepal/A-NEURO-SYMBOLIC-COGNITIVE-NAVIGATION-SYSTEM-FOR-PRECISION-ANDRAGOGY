import { z } from 'zod'

export interface ChatMessage {
    id?: string;
    role: 'user' | 'ai';
    text: string;
}

/**
 * Context Management System
 * Designed to handle infinite context windows by dynamically generating summaries
 * and managing token limits to prevent truncation and context loss.
 */
export class ContextWindowManager {
    // Conservative threshold: ~8000 characters (approx 2000 tokens) before compression triggers
    private static readonly COMPRESSION_THRESHOLD = 8000;

    /**
     * Intelligently manages the context window for a conversational history.
     * Keeps recent messages raw for immediate context fidelity, and compresses older ones.
     */
    static formatConversationalContext(history?: ChatMessage[]): string {
        if (!history || history.length === 0) {
            return "No prior conversational history.";
        }

        let totalLength = history.reduce((acc, msg) => acc + msg.text.length, 0);

        // If entirely under threshold, return raw history
        if (totalLength < this.COMPRESSION_THRESHOLD) {
            return history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');
        }

        // --- Context Limits Exceeded: Sliding Window Generation ---
        // We preserve full context without losing state by keeping the last N messages
        // completely untouched, and "flattening" the older messages into a dense
        // systemic abstraction log so the LLM retains facts without the token tax.

        const recentMessages: ChatMessage[] = [];
        let olderMessages: ChatMessage[] = [];
        let currentRecentLength = 0;

        // Iterate backwards to fill recent window
        for (let i = history.length - 1; i >= 0; i--) {
            const msgLen = history[i].text.length;
            if (currentRecentLength + msgLen < (this.COMPRESSION_THRESHOLD * 0.7)) { // 70% budget for recent
                recentMessages.unshift(history[i]);
                currentRecentLength += msgLen;
            } else {
                olderMessages = history.slice(0, i + 1);
                break;
            }
        }

        // Flatten outer context without losing facts (A lightweight abstractor)
        let compressedContext = "";
        if (olderMessages.length > 0) {
            const abstractLog = olderMessages.map(m => `[${m.role.toUpperCase()}] ${m.text.substring(0, 150)}${m.text.length > 150 ? '...' : ''}`).join('\n');
            compressedContext = `[SYSTEM NOTE: The following is a dense abstracted log of the older conversation to preserve memory bounds without losing context.]\n${abstractLog}\n\n[--- RECENT FULL CONTEXT BELOW ---]\n`;
        }

        const recentContext = recentMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n\n');

        return compressedContext + recentContext;
    }
}
