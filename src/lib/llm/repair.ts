/**
 * LLM Response Repair Strategies
 * 
 * Symposium 3.2 Directive: Common programmatic fixes for malformed LLM responses
 * These run BEFORE retry, attempting to salvage parseable but slightly malformed output.
 */

export type RepairFn = (raw: string) => string

/**
 * Strip markdown code fences that LLMs commonly wrap JSON in
 * e.g. ```json\n{...}\n``` → {...}
 */
export function stripCodeFences(raw: string): string {
    return raw.replace(/```(?:json)?\s*\n?/gi, '').replace(/```\s*$/g, '').trim()
}

/**
 * Fix single-quoted JSON strings → double-quoted
 * Careful: only replaces surrounding quotes, not apostrophes within strings
 */
export function fixSingleQuotes(raw: string): string {
    // Replace single-quoted keys and values in JSON
    return raw.replace(/'([^']*?)'\s*:/g, '"$1":').replace(/:\s*'([^']*?)'/g, ': "$1"')
}

/**
 * Remove trailing commas before closing brackets/braces
 * e.g. { "a": 1, } → { "a": 1 }
 */
export function fixTrailingComma(raw: string): string {
    return raw.replace(/,\s*([}\]])/g, '$1')
}

/**
 * Unwrap nested wrappers that LLMs sometimes add
 * e.g. { "response": { actual data } } → { actual data }
 */
export function unwrapNested(raw: string): string {
    try {
        const parsed = JSON.parse(raw)
        if (typeof parsed === 'object' && parsed !== null) {
            if ('response' in parsed && Object.keys(parsed).length === 1) {
                return JSON.stringify(parsed.response)
            }
            if ('result' in parsed && Object.keys(parsed).length === 1) {
                return JSON.stringify(parsed.result)
            }
            if ('data' in parsed && Object.keys(parsed).length === 1) {
                return JSON.stringify(parsed.data)
            }
        }
    } catch {
        // If JSON.parse fails, return raw — JSON parse will be attempted later anyway
    }
    return raw
}

/**
 * Extract JSON from text that has preamble/postamble
 * e.g. "Here is the question:\n{...}\nHope that helps!" → {...}
 */
export function extractJSON(raw: string): string {
    // Find the first { and last } for objects
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        return raw.substring(firstBrace, lastBrace + 1)
    }
    // Find the first [ and last ] for arrays
    const firstBracket = raw.indexOf('[')
    const lastBracket = raw.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
        return raw.substring(firstBracket, lastBracket + 1)
    }
    return raw
}

/**
 * Default repair pipeline — ordered from least to most aggressive
 */
export const DEFAULT_REPAIRS: RepairFn[] = [
    stripCodeFences,
    fixTrailingComma,
    extractJSON,
    unwrapNested,
]
