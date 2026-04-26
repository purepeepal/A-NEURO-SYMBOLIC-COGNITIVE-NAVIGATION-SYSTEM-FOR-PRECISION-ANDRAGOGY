/**
 * Quick 3-Question Insight Mode — Flow Logic
 * 
 * Symposium 3.6 Directive: 3 strategically selected questions at different
 * Bloom's levels → mini-report. Adaptive difficulty on failure.
 * 
 * Question Strategy:
 *   Q1 → Remember/Understand (calibrate baseline)
 *   Q2 → Apply/Analyze (test depth) — drops if Q1 wrong
 *   Q3 → Evaluate/Create (test ceiling) — drops if Q1+Q2 wrong
 * 
 * Uses question pool (3.1) when available, falls back to real-time gen.
 */

import { selectFromPool } from './question-pool'

// ─── Types ─────────────────────────────────────────────────────────
export interface QuickResponse {
    questionText: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    bloomsLevel: string
    concept: string
    difficulty: number
}

export interface QuickInsightResult {
    finding: string
    focusArea: string
    teaser: string
    responses: QuickResponse[]
    topic: string
    completedAt: Date
}

// ─── Bloom's Level Targeting ───────────────────────────────────────
type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'

interface QuestionSpec {
    bloomsLevel: BloomsLevel
    difficulty: number
}

/**
 * Compute the 3-question sequence based on previous results.
 * Implements adaptive Bloom's targeting per symposium directive.
 */
export function computeQuestionSequence(
    previousResults: QuickResponse[] = []
): QuestionSpec {
    const questionIndex = previousResults.length

    // Standard path: Remember(5) → Apply(6) → Evaluate(7)
    const standardPath: QuestionSpec[] = [
        { bloomsLevel: 'remember', difficulty: 5 },
        { bloomsLevel: 'apply', difficulty: 6 },
        { bloomsLevel: 'evaluate', difficulty: 7 },
    ]

    if (questionIndex >= 3) {
        return standardPath[2] // Shouldn't happen, but safe fallback
    }

    if (questionIndex === 0) {
        return standardPath[0]
    }

    // Adaptive: if Q1 wrong, lower Q2
    if (questionIndex === 1 && !previousResults[0].isCorrect) {
        return { bloomsLevel: 'apply', difficulty: 4 }
    }

    // Adaptive: if Q1+Q2 both wrong, lower Q3 significantly
    if (questionIndex === 2) {
        const correctCount = previousResults.filter(r => r.isCorrect).length
        if (correctCount === 0) {
            return { bloomsLevel: 'apply', difficulty: 4 }
        }
        if (correctCount === 1) {
            return { bloomsLevel: 'analyze', difficulty: 5 }
        }
        return standardPath[2] // Both correct: aim high
    }

    return standardPath[questionIndex]
}

/**
 * Select a question from the pool matching the spec.
 * Falls back to null (caller should generate in real-time).
 */
export async function selectQuickQuestion(
    topic: string,
    concept: string,
    spec: QuestionSpec
): Promise<unknown | null> {
    return selectFromPool({
        topic,
        concept,
        difficulty: spec.difficulty,
    })
}

// ─── Mini-Report Prompt Template ───────────────────────────────────
export function buildQuickInsightPrompt(
    topic: string,
    responses: QuickResponse[]
): string {
    return `
A learner answered 3 strategically selected questions about "${topic}".
Each question targeted a different cognitive level (Bloom's Taxonomy).

Results:
${responses.map((r, i) => `
Q${i + 1} (${r.bloomsLevel}, difficulty ${r.difficulty}):
  Question: ${r.questionText}
  Answer: ${r.userAnswer}
  Correct: ${r.correctAnswer}
  Result: ${r.isCorrect ? '✅ Correct' : '❌ Incorrect'}
`).join('')}

Generate a mini-insight report with EXACTLY 3 fields:
1. "finding" — One CONCRETE, SPECIFIC finding about their understanding (not generic).
   Reference their actual answers. Example: "You correctly applied the chain rule but struggled 
   with recognizing when to use integration by parts."
2. "focusArea" — One specific area they should focus on next, with a concrete suggestion.
3. "teaser" — One sentence explaining what a full assessment would reveal that this quick 
   insight cannot. Frame it as genuine value, not a sales pitch.

Return ONLY valid JSON: { "finding": "string", "focusArea": "string", "teaser": "string" }
`.trim()
}
