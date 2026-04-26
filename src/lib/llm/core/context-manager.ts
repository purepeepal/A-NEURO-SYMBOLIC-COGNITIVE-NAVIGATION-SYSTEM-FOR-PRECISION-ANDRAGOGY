// src/lib/llm/core/context-manager.ts

export interface ContextWindow {
    systemPrompt: string;
    messages: { role: 'user' | 'assistant', content: string }[];
    maxTokens: number;
}

/**
 * Manages the LLM context window to prevent token overflow.
 * If the accumulated chat history exceeds limits, we summarize or prune older messages.
 */
export function pruneContextWindow(context: ContextWindow): ContextWindow {
    // Basic heuristic: if we have more than 10 messages, keep the first 2 (system setup)
    // and the last 6 (recent context).
    const MAX_MESSAGES = 10;

    if (context.messages.length > MAX_MESSAGES) {
        const recentMessages = context.messages.slice(-6);
        return {
            ...context,
            messages: [...context.messages.slice(0, 2), ...recentMessages]
        };
    }

    return context;
}
