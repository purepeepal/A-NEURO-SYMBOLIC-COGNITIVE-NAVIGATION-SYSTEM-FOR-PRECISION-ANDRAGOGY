// Unit 4 (LLM Gateway) Barrel File
// This is the ONLY file that Unit 3 (Domain Core) is allowed to import from the LLM layer.

// Legacy Exports (Strangler Fig compatibility):
export { gemini } from './gemini';
export { gemini as llm } from './gemini'; // Alias for legacy routes that import 'llm'
export { questionCache } from './cache';
export type { ConceptNode, PrerequisiteTree, MicroAnalysisResult, InvestigativeObjective } from './types';

import { LLMService, Question, EvaluationResult, PersonaSynthesis, ResponseRecord, PersonaTraits } from '@/lib/domain/assessment/repositories';
import { generateAndParseWithRepair } from './core/repair';
import { buildQuestionPrompt } from './prompts/question_prompt';
import { buildEvaluationPrompt } from './prompts/evaluation_prompt';
import { buildPersonaSynthesisPrompt } from './prompts/persona_prompt';
import { AssessmentQuestionSchema, AnswerEvaluationSchema, PersonaSynthesisSchema } from './schemas/responses';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { LLM_CONFIG, PROMPT_TEMPERATURES } from './config';

// ─── Provider Functions ────────────────────────────────────────────

export async function generateGoogleGeminiResponse(prompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: LLM_CONFIG.model });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

export async function generateGroqResponse(prompt: string): Promise<string> {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: 'You are a helpful JSON-speaking educational assistant. Output ONLY valid JSON.' },
            { role: 'user', content: prompt }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        response_format: { type: 'json_object' }
    });
    return completion.choices[0]?.message?.content || '{}';
}

// ─── LLM Service Implementations ───────────────────────────────────

export class GeminiLLMService implements LLMService {
    async generateQuestion(context: { objective: string; difficulty: number; concept?: string; excludeConcepts?: string[] }): Promise<Question> {
        const prompt = buildQuestionPrompt(context.objective, context.difficulty, context);
        const raw = await generateAndParseWithRepair(prompt, AssessmentQuestionSchema, generateGoogleGeminiResponse);
        return {
            id: raw.id,
            text: raw.text,
            type: raw.type,
            options: raw.options,
            difficulty: raw.difficulty,
            concept: raw.concept,
        };
    }

    async evaluateResponse(answer: string, questionText: string, correctAnswer?: string): Promise<EvaluationResult> {
        const prompt = buildEvaluationPrompt(questionText, answer, 0, 0);
        const raw = await generateAndParseWithRepair(prompt, AnswerEvaluationSchema, generateGoogleGeminiResponse);
        return {
            isCorrect: raw.isCorrect,
            score: raw.score,
            feedback: raw.feedback,
            detectedMisconception: raw.detectedMisconception,
            confidence: raw.confidence,
        };
    }

    async synthesizePersona(history: { responses: ResponseRecord[]; traits: PersonaTraits }): Promise<PersonaSynthesis> {
        const prompt = buildPersonaSynthesisPrompt(history.responses, history.traits);
        const raw = await generateAndParseWithRepair(prompt, PersonaSynthesisSchema, generateGoogleGeminiResponse);
        return {
            analytical: raw.analytical,
            creative: raw.creative,
            practical: raw.practical,
            synthesizing: raw.synthesizing,
            evaluative: raw.evaluative,
            summary: raw.summary,
        };
    }
}

export class GroqLLMService implements LLMService {
    async generateQuestion(context: { objective: string; difficulty: number; concept?: string; excludeConcepts?: string[] }): Promise<Question> {
        const prompt = buildQuestionPrompt(context.objective, context.difficulty, context);
        const raw = await generateAndParseWithRepair(prompt, AssessmentQuestionSchema, generateGroqResponse);
        return {
            id: raw.id,
            text: raw.text,
            type: raw.type,
            options: raw.options,
            difficulty: raw.difficulty,
            concept: raw.concept,
        };
    }

    async evaluateResponse(answer: string, questionText: string, correctAnswer?: string): Promise<EvaluationResult> {
        const prompt = buildEvaluationPrompt(questionText, answer, 0, 0);
        const raw = await generateAndParseWithRepair(prompt, AnswerEvaluationSchema, generateGroqResponse);
        return {
            isCorrect: raw.isCorrect,
            score: raw.score,
            feedback: raw.feedback,
            detectedMisconception: raw.detectedMisconception,
            confidence: raw.confidence,
        };
    }

    async synthesizePersona(history: { responses: ResponseRecord[]; traits: PersonaTraits }): Promise<PersonaSynthesis> {
        const prompt = buildPersonaSynthesisPrompt(history.responses, history.traits);
        const raw = await generateAndParseWithRepair(prompt, PersonaSynthesisSchema, generateGroqResponse);
        return {
            analytical: raw.analytical,
            creative: raw.creative,
            practical: raw.practical,
            synthesizing: raw.synthesizing,
            evaluative: raw.evaluative,
            summary: raw.summary,
        };
    }
}
