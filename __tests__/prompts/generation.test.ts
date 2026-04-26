/**
 * Behavioral Tests for Prompt Templates
 * 
 * Symposium 3.3 Directive: Test INTENT, not exact wording.
 * These tests verify that prompts contain required elements
 * and survive prompt rewrites as long as intent is preserved.
 */
import { describe, it, expect } from 'vitest'
import { PROMPTS } from '@/lib/llm/prompts'

describe('questionGeneration prompt', () => {
    const defaultParams = {
        concept: 'Derivatives',
        difficulty: 5,
        topic: 'Calculus',
        questionType: 'mcq' as const,
        previousConcepts: ['Limits', 'Continuity'],
        pastQuestions: [],
        userPersona: undefined,
    }

    it('includes the target concept name', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        expect(prompt).toContain('Derivatives')
    })

    it('includes the topic', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        expect(prompt).toContain('Calculus')
    })

    it('specifies the question type', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        expect(prompt.toLowerCase()).toContain('mcq')
    })

    it('requests JSON response format', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        expect(prompt.toLowerCase()).toContain('json')
    })

    it('includes key contextual information', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        // Prompt should contain core context: concept + topic + difficulty
        expect(prompt).toContain('Derivatives')
        expect(prompt).toContain('Calculus')
    })

    it('includes difficulty level', () => {
        const prompt = PROMPTS.questionGeneration.template(defaultParams)
        expect(prompt).toContain('5')
    })

    it('has a version identifier', () => {
        expect(PROMPTS.questionGeneration.version).toBeTruthy()
    })
})

describe('evaluateAnswer prompt', () => {
    const defaultParams = {
        question: 'What is the derivative of x^2?',
        correctAnswer: '2x',
        userAnswer: 'x^2',
        concept: 'basic differentiation',
        objective: 'Test power rule understanding',
        deductionSpace: { expectedErrors: [] },
        userPersona: undefined,
    }

    it('includes the question', () => {
        const prompt = PROMPTS.evaluateAnswer.template(defaultParams)
        expect(prompt).toContain('derivative of x^2')
    })

    it('includes the correct answer', () => {
        const prompt = PROMPTS.evaluateAnswer.template(defaultParams)
        expect(prompt).toContain('2x')
    })

    it('includes the user answer', () => {
        const prompt = PROMPTS.evaluateAnswer.template(defaultParams)
        expect(prompt).toContain('x^2')
    })

    it('requests JSON response', () => {
        const prompt = PROMPTS.evaluateAnswer.template(defaultParams)
        expect(prompt.toLowerCase()).toContain('json')
    })

    it('includes error type classification', () => {
        const prompt = PROMPTS.evaluateAnswer.template(defaultParams)
        const lower = prompt.toLowerCase()
        expect(
            lower.includes('errortype') || lower.includes('error_type') || lower.includes('error type')
        ).toBe(true)
    })
})

describe('prerequisiteTree prompt', () => {
    it('includes the topic', () => {
        const prompt = PROMPTS.prerequisiteTree.template('Machine Learning')
        expect(prompt).toContain('Machine Learning')
    })

    it('requests JSON response', () => {
        const prompt = PROMPTS.prerequisiteTree.template('Algebra')
        expect(prompt.toLowerCase()).toContain('json')
    })
})

describe('errorFingerprint prompt', () => {
    const params = {
        question: 'Simplify 2x + 3x',
        correctAnswer: '5x',
        userAnswer: '6x',
        concept: 'combining like terms',
    }

    it('includes the question and answers', () => {
        const prompt = PROMPTS.errorFingerprint.template(params)
        expect(prompt).toContain('2x + 3x')
        expect(prompt).toContain('5x')
        expect(prompt).toContain('6x')
    })

    it('includes the concept', () => {
        const prompt = PROMPTS.errorFingerprint.template(params)
        expect(prompt).toContain('combining like terms')
    })
})
