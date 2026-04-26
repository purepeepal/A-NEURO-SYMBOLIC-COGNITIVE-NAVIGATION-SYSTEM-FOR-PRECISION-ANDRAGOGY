/**
 * Input Sanitizer
 * 
 * Strips dangerous content from user-provided text before it reaches
 * LLM prompts. Prevents prompt injection and unexpected control characters.
 */

// Control characters except tabs and newlines
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

// JSON structural delimiters that could confuse LLM output parsing
const JSON_DELIMITERS = /[{}[\]]/g

// Known prompt-injection phrases (case-insensitive)
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?previous/i,
    /you\s+are\s+now\s+(a|an)\s+/i,
    /system\s*:\s*/i,
    /\bact\s+as\b/i,
    /\breturn\s+the\s+(system|hidden)\s+prompt\b/i,
    /\bforget\s+(everything|all)\b/i,
]

const MAX_TOPIC_LENGTH = 200
const MAX_CHAT_LENGTH = 1000
const MAX_FEEDBACK_LENGTH = 2000

/**
 * Sanitize a topic string (used for assessment topics and subtopics).
 */
export function sanitizeTopic(raw: string): string {
    if (typeof raw !== 'string') return ''

    let cleaned = raw
        .replace(CONTROL_CHARS, '')
        .replace(JSON_DELIMITERS, '')
        .trim()

    // Remove injection phrases
    for (const pattern of INJECTION_PATTERNS) {
        cleaned = cleaned.replace(pattern, '')
    }

    // Enforce length limit
    cleaned = cleaned.slice(0, MAX_TOPIC_LENGTH).trim()

    return cleaned
}

/**
 * Sanitize a chat message (user free-text input during assessment).
 */
export function sanitizeChat(raw: string): string {
    if (typeof raw !== 'string') return ''

    let cleaned = raw
        .replace(CONTROL_CHARS, '')
        .trim()

    // Remove injection phrases
    for (const pattern of INJECTION_PATTERNS) {
        cleaned = cleaned.replace(pattern, '')
    }

    cleaned = cleaned.slice(0, MAX_CHAT_LENGTH).trim()

    return cleaned
}

/**
 * Sanitize free-text feedback.
 */
export function sanitizeFeedback(raw: string): string {
    if (typeof raw !== 'string') return ''

    let cleaned = raw
        .replace(CONTROL_CHARS, '')
        .trim()

    cleaned = cleaned.slice(0, MAX_FEEDBACK_LENGTH).trim()

    return cleaned
}
