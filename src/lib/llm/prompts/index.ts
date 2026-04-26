/**
 * Barrel export ΓÇö unified PROMPTS object
 *
 * Consumers import `PROMPTS` exactly as before:
 *   import { PROMPTS } from './prompts'
 *   import { PROMPTS } from '@/lib/llm/prompts'
 */

export { ASSESSMENT_PROMPTS } from './assessment'
export { CHAT_PROMPTS } from './chat'
export { INVESTIGATIVE_PROMPTS } from './investigative'
export { INVESTIGATIVE_DEEP_PROMPTS } from './investigative-deep'
export { REPORT_PROMPTS } from './report'

import { ASSESSMENT_PROMPTS } from './assessment'
import { CHAT_PROMPTS } from './chat'
import { INVESTIGATIVE_PROMPTS } from './investigative'
import { INVESTIGATIVE_DEEP_PROMPTS } from './investigative-deep'
import { REPORT_PROMPTS } from './report'

export const PROMPTS = {
    version: '2.0.0' as const,
    ...ASSESSMENT_PROMPTS,
    ...CHAT_PROMPTS,
    ...INVESTIGATIVE_PROMPTS,
    ...INVESTIGATIVE_DEEP_PROMPTS,
    ...REPORT_PROMPTS,
}

export type PromptType = keyof typeof PROMPTS
