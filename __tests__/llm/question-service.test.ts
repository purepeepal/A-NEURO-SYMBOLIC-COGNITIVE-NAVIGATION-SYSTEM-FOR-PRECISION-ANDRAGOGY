import { describe, it, expect } from 'vitest'
import { QuestionService } from '@/lib/llm/services/question.service'
import type { LLMProviderCore } from '@/lib/llm/providers/types'

function makeProvider(responses: any[]): LLMProviderCore {
    let i = 0
    return {
        name: 'fake',
        initialize() { /* no-op */ },
        async generateWithRetry<T>(): Promise<T> {
            const next = responses[Math.min(i, responses.length - 1)]
            i++
            return next as T
        },
    }
}

describe('QuestionService.generateQuestion', () => {
    it('retries when correctAnswer is a placeholder (e.g. "undefined")', async () => {
        const provider = makeProvider([
            {
                concept: 'Algebra',
                difficulty: 5,
                questionType: 'short_answer',
                questionText: 'What is 6 × 7?',
                correctAnswer: 'undefined',
                explanation: 'Because multiplication.',
                prerequisites: [],
                objective: 'Test multiplication recall',
                competencyLevel: 'remember',
                deductionSpace: { expectedErrors: [] },
            },
            {
                concept: 'Algebra',
                difficulty: 5,
                questionType: 'short_answer',
                questionText: 'What is 6 × 7?',
                correctAnswer: '42',
                explanation: '6 × 7 = 42.',
                prerequisites: [],
                objective: 'Test multiplication recall',
                competencyLevel: 'remember',
                deductionSpace: { expectedErrors: [] },
            },
        ])

        const svc = new QuestionService(provider)
        const q = await svc.generateQuestion('Algebra', 5, 'Math')

        expect(q.correctAnswer).toBe('42')
        expect(q.correctAnswer.toLowerCase()).not.toBe('undefined')
    })

    it('throws after exhausting attempts with invalid baselines', async () => {
        const provider = makeProvider([
            {
                concept: 'Algebra',
                difficulty: 5,
                questionType: 'short_answer',
                questionText: 'What is 6 × 7?',
                correctAnswer: 'null',
                explanation: '',
                prerequisites: [],
                objective: '',
                competencyLevel: 'remember',
                deductionSpace: { expectedErrors: [] },
            },
            {
                concept: 'Algebra',
                difficulty: 5,
                questionType: 'short_answer',
                questionText: 'What is 6 × 7?',
                correctAnswer: '',
                explanation: '',
                prerequisites: [],
                objective: '',
                competencyLevel: 'remember',
                deductionSpace: { expectedErrors: [] },
            },
            {
                concept: 'Algebra',
                difficulty: 5,
                questionType: 'short_answer',
                questionText: 'What is 6 × 7?',
                correctAnswer: 'undefined',
                explanation: '',
                prerequisites: [],
                objective: '',
                competencyLevel: 'remember',
                deductionSpace: { expectedErrors: [] },
            },
        ])

        const svc = new QuestionService(provider)
        await expect(svc.generateQuestion('Algebra', 5, 'Math')).rejects.toBeTruthy()
    })
})
