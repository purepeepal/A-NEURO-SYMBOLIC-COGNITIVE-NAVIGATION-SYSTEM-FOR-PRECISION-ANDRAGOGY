/**
 * Report generation prompts ΓÇö narrative, calibration, and action plan
 */

import type { AssessmentSnapshot } from '../types'
import type { CalibrationResult } from '@/lib/domain/assessment/self-assessment'

export const REPORT_PROMPTS = {
    narrativeMoment: {
        version: '1.1',
        // Fallback templates for LLM timeout/failure (D5/Safety directive)
        fallbacks: {
            interval: [
                "Let's see what the next clue reveals about your thinking...",
                "The investigation continues. Each answer adds to the profile.",
            ],
            streak: [
                "A clear pattern is emerging here ΓÇö let's push further.",
                "Consistent performance. Time to test the boundaries.",
            ],
            error: [
                "An interesting data point. Let me investigate this angle...",
                "That response tells me something. Let's explore.",
            ],
            pattern_detected: [
                "The evidence is starting to paint a picture.",
                "Something in your response pattern caught my attention.",
            ],
        } as Record<string, string[]>,
        template: (params: {
            topic: string
            state: AssessmentSnapshot
            trigger: 'interval' | 'streak' | 'error' | 'pattern_detected'
            recentConcept?: string
        }) => `
You are a DETECTIVE guiding a subject through an investigation of their own mind.
Generate a SINGLE sentence of narrative feedback to show between questions.

CONTEXT:
Topic being investigated: ${params.topic}
Total questions answered so far: ${params.state.questionsAnswered}
The learner has answered ${params.state.consecutiveCorrect || 0} questions correctly in a row${params.state.consecutiveIncorrect ? `, and ${params.state.consecutiveIncorrect} incorrectly in a row` : ''}.
This narrative was triggered because: ${params.trigger === 'interval' ? 'a regular check-in interval was reached' : params.trigger === 'streak' ? 'the learner has a notable streak of correct answers' : params.trigger === 'error' ? 'the learner just answered incorrectly' : 'an interesting behavioral pattern was detected'}.
Most recent concept explored: ${params.recentConcept || 'General'}

STYLE:
- Exactly ONE sentence.
- Tone: Intriguing, observant, slightly mysterious but encouraging.
- Do NOT praise them generically ("Good job"). Instead, observe ("Your approach to X reveals a strong foundation").
- If trigger is 'error', be curious ("That's a notable signal. Let me probe this area further...").
- If trigger is 'streak', push them ("Your pattern here is clear ΓÇö let's explore where the edges are.").
- If trigger is 'interval' or 'pattern_detected', be analytical ("The evidence so far suggests an interesting cognitive profile taking shape.")

Respond in JSON format (no markdown):
{
  "narrativeText": "The single sentence narrative."
}
`,
    },

    calibrationInsight: {
        version: '1.1',
        template: (calibration: CalibrationResult[]) => `
A learner self-assessed their knowledge before a quiz. 
Here are the results:
${JSON.stringify(calibration, null, 2)}

Write a 2-3 sentence insight about their metacognitive calibration.
Focus on the MOST interesting gap (overconfident or underconfident).
Use empathetic, non-judgmental language.
Frame overconfidence as "familiarity bias" ΓÇö their familiarity with terminology masks gaps in deep understanding. Do NOT use phrases like "illusion of competence" or "you're wrong."
Frame underconfidence as "hidden strength" not "you underestimate yourself."
Hypothesize a REASON for the gap using domain knowledge, not just paraphrasing the data.

Return JSON: { "headline": "string", "detail": "string" }
`,
    },

    actionPlan: {
        version: '1.0',
        template: (params: {
            topic: string
            gaps: Partial<{
                concept: string
                mastery_score: number | null
                gap_severity: string | null
                error_patterns: unknown
            }>[]
            calibration: CalibrationResult[]
            accuracy: number
        }) => `
Based on this quiz session, generate a prioritized action plan.

Topic: ${params.topic}
Knowledge gaps: ${JSON.stringify(params.gaps)}
Calibration (Self vs Reality): ${JSON.stringify(params.calibration)}
Accuracy: ${params.accuracy}%

Create 3-5 action items, ordered by priority:
- Critical: dangerous misconceptions (high confidence + wrong) or major prerequisite gaps.
- Reinforce: near-mastery gaps (close to understanding, e.g. procedural errors).
- Stretch: ready for next level areas (if accuracy is high, suggest advanced concepts).

For each item, suggest a SPECIFIC resource or activity (not generic).
Include realistic time estimates (e.g. "~45 mins").

Return JSON: {
  "items": [
    {
      "priority": "critical" | "reinforce" | "stretch",
      "title": "Action title",
      "rationale": "Why this step matters",
      "suggestion": "Specific activity to do",
      "timeEstimate": "e.g. ~30 mins",
      "relatedGaps": ["concept1", "concept2"]
    }
  ],
  "overallMessage": "Encouraging summary string",
  "nextSessionSuggestion": "What to focus on next time"
}
`,
    },
}
