import Groq from 'groq-sdk'
import { LLM_CONFIG } from './config'
import { PROMPTS } from './prompts'
import {
    LLMProvider,
    GeneratedQuestion,
    PrerequisiteTree,
    ErrorFingerprint
} from './types'
import { validateWithRetry } from './call'
import * as schemas from './validators'
import { z } from 'zod'
import { ContextWindowManager } from './context-manager'

export class GroqService implements LLMProvider {
    name = 'groq'
    private client: Groq
    private isInitialized = false

    constructor() {
        this.client = null as any
    }

    private initialize() {
        if (this.isInitialized) return

        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable is not set')
        }

        this.client = new Groq({
            apiKey: apiKey
        })
        this.isInitialized = true
    }

    /**
     * Generate a prerequisite tree for a topic
     */
    async generatePrerequisiteTree(topic: string): Promise<PrerequisiteTree> {
        this.initialize()

        const prompt = PROMPTS.prerequisiteTree.template(topic)

        return this.generateWithRetry<PrerequisiteTree>(prompt, schemas.RawPrerequisiteTreeSchema as any, 'prerequisite')
    }

    /**
     * Generate subtopics for self-assessment
     */
    async generateSubTopics(topic: string): Promise<string[]> {
        this.initialize()

        const prompt = PROMPTS.subTopics.template(topic)

        const result = await this.generateWithRetry<{ subtopics: string[] }>(
            prompt,
            z.object({ subtopics: z.array(z.string()) }) as any,
            'subtopics'
        )
        return result.subtopics
    }

    /**
     * Generate an assessment question for a concept
     */
    async generateQuestion(
        concept: string,
        difficulty: number,
        topic: string,
        userPersona?: any,
        previousConcepts: string[] = [],
        preferredType?: 'mcq' | 'short_answer' | 'true_false',
        pastQuestions: string[] = []
    ): Promise<GeneratedQuestion> {
        this.initialize()

        const questionType = preferredType || (difficulty <= 3 ? 'mcq' : difficulty <= 7 ? 'short_answer' : 'mcq')

        const prompt = PROMPTS.questionGeneration.template({
            concept,
            difficulty,
            topic,
            questionType,
            previousConcepts,
            pastQuestions,
            userPersona
        })

        const result = await this.generateWithRetry<GeneratedQuestion>(prompt, schemas.RawGeneratedQuestionSchema as any, 'question')
        return {
            ...result,
            concept,
            difficulty
        }
    }

    /**
     * Fingerprint an error to understand why user got it wrong
     */
    async fingerprintError(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string
    ): Promise<ErrorFingerprint> {
        this.initialize()

        const prompt = PROMPTS.errorFingerprint.template({
            question,
            correctAnswer,
            userAnswer,
            concept
        })

        return this.generateWithRetry<ErrorFingerprint>(prompt, schemas.RawErrorFingerprintSchema as any, 'fingerprint')
    }

    /**
     * Deep Answer Evaluation
     */
    async evaluateAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string,
        concept: string,
        objective: string,
        deductionSpace: any,
        userPersona?: any
    ): Promise<import('./types').EvaluateAnswerResult> {
        this.initialize()

        const prompt = PROMPTS.evaluateAnswer.template({
            question,
            correctAnswer,
            userAnswer,
            concept,
            objective,
            deductionSpace,
            userPersona
        })

        return this.generateWithRetry<import('./types').EvaluateAnswerResult>(prompt, schemas.RawEvaluateAnswerResultSchema as any, 'evaluate')
    }

    /**
     * Session Analysis
     */
    async analyzeSession(
        topic: string,
        history: { question: string, isCorrect: boolean, concept: string, difficulty: number }[],
        userPersona?: any
    ): Promise<any> {
        this.initialize()

        const prompt = PROMPTS.sessionAnalysis.template({
            topic,
            history,
            userPersona
        })

        return this.generateWithRetry<any>(
            prompt,
            z.object({ requiresIntervention: z.boolean(), interventionReason: z.string() }) as any,
            'analyze_session'
        )
    }

    /**
     * Verify Answer
     */
    async verifyAnswer(
        question: string,
        correctAnswer: string,
        userAnswer: string
    ): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> {
        this.initialize()

        const prompt = PROMPTS.verifyAnswer.template({
            question,
            correctAnswer,
            userAnswer
        })

        return this.generateWithRetry<{ isCorrect: boolean; confidence: number; explanation: string }>(
            prompt,
            schemas.RawVerifyAnswerSchema as any,
            'verify'
        )
    }

    /**
     * Live Chat Response
     */
    async chat(
        message: string,
        context?: {
            question: string
            correctAnswer: string
            userAnswer: string
            concept: string
            explanation: string
        },
        userPersona?: any,
        history?: any[]
    ): Promise<{ message: string; action: 'none' | 'adjust_score' | 'provide_hint'; sentiment: 'positive' | 'neutral' | 'negative' }> {
        this.initialize()

        const formattedHistory = ContextWindowManager.formatConversationalContext(history)

        const prompt = PROMPTS.chatResponse.template({
            message,
            context,
            userPersona,
            formattedHistory
        })

        return this.generateWithRetry<{ message: string; action: 'none' | 'adjust_score' | 'provide_hint'; sentiment: 'positive' | 'neutral' | 'negative' }>(
            prompt,
            schemas.RawChatResponseSchema as any,
            'chat'
        )
    }

    /**
     * Generate with retry logic using the central validation shield
     */
    private async generateWithRetry<T>(
        prompt: string,
        schema: z.ZodType<T>,
        requestType: string
    ): Promise<T> {
        return validateWithRetry(
            async () => {
                const completion = await this.client.chat.completions.create({
                    messages: [
                        { role: 'system', content: 'You are a helpful JSON-speaking educational assistant. Output ONLY valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.5,
                    response_format: { type: 'json_object' } // Enforce JSON mode
                })

                return completion.choices[0]?.message?.content || '{}'
            },
            schema,
            {
                label: `groq_${requestType}`,
                maxRetries: 3
            }
        )
    }
}

export const groqService = new GroqService()
