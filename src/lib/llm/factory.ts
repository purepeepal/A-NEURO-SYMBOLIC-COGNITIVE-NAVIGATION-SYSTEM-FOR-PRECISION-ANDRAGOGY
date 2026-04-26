import { LLMProvider } from './types'
import { gemini } from './gemini'
import { groqService } from './groq'
import { LLM_CONFIG } from './config'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'factory' })

export class LLMFactory {
    static getProvider(): LLMProvider {
        const providerName = LLM_CONFIG.provider

        if (providerName === 'groq') {
            // Check if API key is effectively available (though service handles check too)
            if (process.env.GROQ_API_KEY) {
                return groqService
            } else {
                logger.warn('LLMFactory: Configured for Groq but GROQ_API_KEY missing. Falling back to Gemini.')
                return gemini
            }
        }

        return gemini
    }
}

// Default export for ease of use
export const llm = LLMFactory.getProvider()
