/**
 * Validator Schema Edge-Case Tests
 * 
 * Symposium 3.3 + 3.4 Directive: Schema constraints ARE business logic —
 * test them with valid, invalid, and edge-case inputs.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import {
    ResponseSchema,
    ErrorTypeSchema,
    QuestionTypeSchema,
    CompetencyLevelSchema,
    SubmissionPayloadSchema,
} from '@/lib/assessment/schemas/response.schema'
import {
    RawGeneratedQuestionSchema,
    GeneratedQuestionSchema,
    DeductionSpaceSchema,
} from '@/lib/assessment/schemas/question.schema'
import {
    RawEvaluateAnswerResultSchema,
    CalibrationResultSchema,
} from '@/lib/assessment/schemas/calibration.schema'

// ─── ErrorType Enum ────────────────────────────────────────────────
describe('ErrorTypeSchema', () => {
    it('accepts all valid error types', () => {
        for (const type of ['conceptual', 'procedural', 'careless', 'prerequisite_gap', 'correct']) {
            expect(ErrorTypeSchema.safeParse(type).success).toBe(true)
        }
    })

    it('rejects invalid error types', () => {
        expect(ErrorTypeSchema.safeParse('unknown').success).toBe(false)
        expect(ErrorTypeSchema.safeParse('').success).toBe(false)
        expect(ErrorTypeSchema.safeParse(42).success).toBe(false)
    })
})

// ─── QuestionType Enum ─────────────────────────────────────────────
describe('QuestionTypeSchema', () => {
    it('accepts mcq, short_answer, true_false', () => {
        expect(QuestionTypeSchema.safeParse('mcq').success).toBe(true)
        expect(QuestionTypeSchema.safeParse('short_answer').success).toBe(true)
        expect(QuestionTypeSchema.safeParse('true_false').success).toBe(true)
    })

    it('rejects other types', () => {
        expect(QuestionTypeSchema.safeParse('essay').success).toBe(false)
        expect(QuestionTypeSchema.safeParse('fill_blank').success).toBe(false)
    })
})

// ─── Raw Generated Question (LLM permissive) ──────────────────────
describe('RawGeneratedQuestionSchema', () => {
    const validRaw = {
        concept: '  Derivatives  ',
        difficulty: '5', // String, should coerce
        questionType: 'MCQ', // Wrong case, should transform
        questionText: 'What is the derivative of x^2?',
        options: { A: '2x', B: 'x', C: 'x^2', D: '2' },
        correctAnswer: '2x',
    }

    it('coerces difficulty from string to number', () => {
        const result = RawGeneratedQuestionSchema.safeParse(validRaw)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.difficulty).toBe(5)
            expect(typeof result.data.difficulty).toBe('number')
        }
    })

    it('transforms questionType to lowercase', () => {
        const result = RawGeneratedQuestionSchema.safeParse(validRaw)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.questionType).toBe('mcq')
        }
    })

    it('trims whitespace from concept', () => {
        const result = RawGeneratedQuestionSchema.safeParse(validRaw)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.concept).toBe('Derivatives')
        }
    })

    it('provides defaults for missing optional fields', () => {
        const result = RawGeneratedQuestionSchema.safeParse(validRaw)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.explanation).toBe('')
            expect(result.data.prerequisites).toEqual([])
            expect(result.data.deductionSpace).toEqual({ expectedErrors: [] })
        }
    })

    it('handles null options by converting to undefined', () => {
        const withNull = { ...validRaw, options: null }
        const result = RawGeneratedQuestionSchema.safeParse(withNull)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.options).toBeUndefined()
        }
    })

    it('rejects difficulty out of range', () => {
        const bad = { ...validRaw, difficulty: 15 }
        const result = RawGeneratedQuestionSchema.safeParse(bad)
        expect(result.success).toBe(false)
    })
})

// ─── Raw Evaluate Answer (LLM permissive) ──────────────────────────
describe('RawEvaluateAnswerResultSchema', () => {
    it('coerces boolean string "true" to boolean true', () => {
        const result = RawEvaluateAnswerResultSchema.safeParse({
            isCorrect: 'true',
            explanation: 'Correct answer',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.isCorrect).toBe(true)
        }
    })

    it('coerces boolean string "false" to boolean false', () => {
        const result = RawEvaluateAnswerResultSchema.safeParse({
            isCorrect: 'false',
            explanation: 'Wrong',
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.isCorrect).toBe(false)
        }
    })

    it('accepts actual boolean values', () => {
        const result = RawEvaluateAnswerResultSchema.safeParse({
            isCorrect: true,
            explanation: 'Yes',
        })
        expect(result.success).toBe(true)
    })
})

// ─── Submission Payload ────────────────────────────────────────────
describe('SubmissionPayloadSchema', () => {
    it('rejects empty answer', () => {
        const result = SubmissionPayloadSchema.safeParse({
            assessmentId: 'abc-123',
            questionId: 'q-1',
            answer: '',
        })
        expect(result.success).toBe(false)
    })

    it('accepts null confidence', () => {
        const result = SubmissionPayloadSchema.safeParse({
            assessmentId: 'abc-123',
            questionId: 'q-1',
            answer: '2x',
            confidence: null,
        })
        expect(result.success).toBe(true)
    })

    it('rejects confidence out of range', () => {
        const result = SubmissionPayloadSchema.safeParse({
            assessmentId: 'abc-123',
            questionId: 'q-1',
            answer: '2x',
            confidence: 5,
        })
        expect(result.success).toBe(false)
    })
})

// ─── Deduction Space ───────────────────────────────────────────────
describe('DeductionSpaceSchema', () => {
    it('accepts valid deduction space', () => {
        const result = DeductionSpaceSchema.safeParse({
            expectedErrors: [
                { pattern: 'forgot chain rule', implies: 'needs review', errorType: 'procedural' },
            ],
        })
        expect(result.success).toBe(true)
    })

    it('rejects invalid error type in expected errors', () => {
        const result = DeductionSpaceSchema.safeParse({
            expectedErrors: [
                { pattern: 'test', implies: 'test', errorType: 'magic' },
            ],
        })
        expect(result.success).toBe(false)
    })
})

// ─── LLM Repair: validateLLMResponse ───────────────────────────────
describe('LLM Repair Strategies', () => {
    // Dynamically import to avoid top-level import issues
    let stripCodeFences: (s: string) => string
    let fixTrailingComma: (s: string) => string
    let extractJSON: (s: string) => string

    beforeAll(async () => {
        const repair = await import('@/lib/llm/repair')
        stripCodeFences = repair.stripCodeFences
        fixTrailingComma = repair.fixTrailingComma
        extractJSON = repair.extractJSON
    })

    it('strips markdown code fences', () => {
        const raw = '```json\n{"key": "value"}\n```'
        expect(stripCodeFences(raw)).toBe('{"key": "value"}')
    })

    it('fixes trailing commas', () => {
        expect(fixTrailingComma('{"a": 1, }')).toBe('{"a": 1}')
    })

    it('extracts JSON from prose', () => {
        const raw = 'Here is the result:\n{"concept": "test"}\nDone!'
        expect(extractJSON(raw)).toBe('{"concept": "test"}')
    })
})
