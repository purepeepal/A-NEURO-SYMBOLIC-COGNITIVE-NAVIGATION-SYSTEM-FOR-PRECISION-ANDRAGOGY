/**
 * Deep investigative prompts ΓÇö cognitive profiling, reports, micro-analysis
 *
 * Split from investigative.ts to keep each file under 300 lines.
 */

import type {
    UserPersona,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    AssessmentSnapshot,
} from '../types'
import type { ResponseRow } from '@/types/db-rows'
import { compactProfile, compactPersona } from '@/lib/cognitive-graph/compactify'

export const INVESTIGATIVE_DEEP_PROMPTS = {
    cognitiveBehavioralProfile: {
        version: '1.1',
        template: (params: {
            state: AssessmentSnapshot
            responses: ResponseRow[]
            insights: InvestigativeInsight[]
            existingPersona: Partial<UserPersona> | null
        }) => {
      // Compact response lines to reduce input tokens
      const compactResponses = params.responses.map((r, i) =>
        `Q${i + 1}|${r.concept}|d${r.difficulty}|${r.is_correct ? 'OK' : 'FAIL'}|${r.time_taken_seconds || '?'}s`
      ).join('\n')

      // Extract only insight titles + categories instead of full JSON
      const insightSummary = params.insights.map(i =>
        `[${i.category}] ${i.title} (conf: ${i.confidence})`
      ).join('\n') || 'None'

      const personaSnippet = params.existingPersona
        ? `Depth: ${params.existingPersona.depth}, Persist: ${params.existingPersona.persistence}, Strong: ${params.existingPersona.strongConcepts?.join(',')}, Weak: ${params.existingPersona.weakConcepts?.join(',')}`
        : 'None'

      return `
You are a COGNITIVE PSYCHOLOGIST AI. Build a comprehensive Cognitive-Behavioral Profile.

RESPONSES (Q#|concept|diff|result|time):
${compactResponses}

INSIGHTS: ${insightSummary}
EXISTING PERSONA: ${personaSnippet}

Generate JSON (no markdown):
{
  "thinkingStyle": "linear|lateral|mixed|undetermined",
  "thinkingStyleEvidence": "Why",
  "reasoningApproach": "inductive|deductive|abductive|mixed",
  "reasoningEvidence": "Evidence",
  "problemSolvingSignature": "Unique description of HOW they solve problems",
  "errorFingerprint": {
    "dominantType": "conceptual|procedural|careless|prerequisite_gap",
    "triggers": ["Conditions causing errors"],
    "recoveryPattern": "How they recover",
    "persistentMisconceptions": ["Recurring misconceptions"]
  },
  "adaptationRate": "fast|moderate|slow|variable",
  "adaptationEvidence": "Why",
  "difficultyThreshold": 1-10,
  "comfortZone": [min, max],
  "confidenceCalibration": "overconfident|underconfident|calibrated|unknown",
  "confidenceEvidence": "Evidence",
  "responseVelocityPattern": "consistent|rushed_on_hard|slow_on_easy|variable",
  "persistenceScore": 0-100,
  "latentStrengths": ["Unrealized strengths"],
  "untappedAreas": ["Unexplored potential areas"],
  "growthVectors": ["Specific growth directions"]
}
`
    },
    },

    investigativeReport: {
        version: '1.1',
        template: (params: {
            state: AssessmentSnapshot
            responses: ResponseRow[]
            insights: InvestigativeInsight[]
            profile: CognitiveBehavioralProfile
            existingPersona: Partial<UserPersona> | null
        }) => {
      const insightSummary = params.insights.map(i =>
        `[${i.category}] ${i.title}: ${i.implication} (conf: ${i.confidence})`
      ).join('\n') || 'None'

      const accuracy = params.state.history.length > 0
        ? (params.state.history.filter((h) => h.isCorrect).length / params.state.history.length * 100).toFixed(0)
        : 0

      return `
You are the CHIEF INTELLIGENCE OFFICER preparing a comprehensive learner dossier.

PROFILE:
${compactProfile(params.profile)}

SESSION: ${params.state.topic} | ${params.state.questionsAnswered} Qs | Diff ${params.state.currentDifficulty} | ${accuracy}% acc

INSIGHTS:
${insightSummary}

Generate a COMPREHENSIVE INVESTIGATIVE REPORT as JSON (no markdown):
{
  "executiveSummary": "2-3 sentence high-level summary",
  "keyInsights": [
    {
      "category": "breakthrough|anomaly|pattern|concern|potential",
      "title": "Short title",
      "evidence": ["Evidence points"],
      "confidence": 0.85,
      "implication": "What it means",
      "actionable": true,
      "recommendedAction": "What to do"
    }
  ],
  "unexpectedFindings": ["Surprising discoveries"],
  "hypothesesTested": [
    { "hypothesis": "What tested", "verdict": "confirmed|refuted|inconclusive", "evidence": "Conclusion basis" }
  ],
  "knowledgeTopology": {
    "strongholds": ["Mastered concepts"],
    "frontiers": ["Edge of understanding"],
    "gaps": ["Clear gaps"],
    "bridges": ["Well-connected concepts"],
    "isolatedIslands": ["Disconnected knowledge"]
  },
  "strategicRecommendations": [
    { "priority": "critical|high|medium|low", "recommendation": "Action", "rationale": "Why", "expectedOutcome": "Success looks like" }
  ],
  "predictions": {
    "nextSessionSuccess": 0.75,
    "optimalDifficultyStart": 6,
    "conceptsReadyToAdvance": ["List"],
    "conceptsNeedingRemediation": ["List"],
    "estimatedMasteryTime": "e.g. 3-4 more sessions"
  },
  "narrativeAnalysis": "2-3 paragraph detective-style prose analysis. Describe the learner's cognitive journey, what makes them unique, and where they're headed."
}
`
    },
    },

    microAnalysis: {
        version: '1.1',
        template: (params: {
            lastResponse: Partial<ResponseRow>
            state: AssessmentSnapshot
            currentPersona: Partial<UserPersona> | null
            biometrics?: {
                mouseJitterScore?: number
                focusLossCount?: number
                timeToFirstInteractionMs?: number
                revisionCount?: number
                scrollHesitationCount?: number
            }
        }) => `
You are performing REAL-TIME MICRO-ANALYSIS on a learner's latest response. This is a quick, focused analysis to inform the very next question.

LATEST RESPONSE:
- Question: ${params.lastResponse.question_text}
- Concept: ${params.lastResponse.concept}
- Difficulty: ${params.lastResponse.difficulty}
- Correct: ${params.lastResponse.is_correct ? 'YES' : 'NO'}
- User Answer: "${params.lastResponse.user_answer}"
- Correct Answer: "${params.lastResponse.correct_answer}"
- Time Taken: ${params.lastResponse.time_taken_seconds || 'Unknown'}s
- Objective: ${params.lastResponse.objective || 'Standard'}
- Pre-defined Deduction Space: ${JSON.stringify(params.lastResponse.deduction_space) || 'None'}
${params.biometrics ? `
BEHAVIORAL SIGNALS (implicit cognitive indicators):
- Mouse jitter: ${params.biometrics.mouseJitterScore ?? 'N/A'} (higher = more uncertain/agitated)
- Tab switches: ${params.biometrics.focusLossCount ?? 0} (high = distracted or looking up answer)
- Time to first interaction: ${params.biometrics.timeToFirstInteractionMs ?? 'N/A'}ms (high = thinking hard or confused)
- Answer revisions: ${params.biometrics.revisionCount ?? 0} (high = uncertain about answer)
- Scroll hesitations: ${params.biometrics.scrollHesitationCount ?? 0} (high = re-reading question)
` : ''}
SESSION CONTEXT:
- Total Questions: ${params.state.questionsAnswered}
- Current Streak: ${params.state.consecutiveCorrect > 0 ? `${params.state.consecutiveCorrect} correct` : `${params.state.consecutiveIncorrect} incorrect`}
- Recent History: ${params.state.history.slice(-5).map((h) => h.isCorrect ? 'Γ£ô' : 'Γ£ù').join(' ')}

KNOWN PERSONA:
${compactPersona(params.currentPersona)}

Generate IMMEDIATE DEDUCTIONS (no markdown):
{
  "immediateDeductions": [
    {
      "concept": "${params.lastResponse.concept}",
      "deduction": "Specific insight from this response",
      "deductionType": "strength|weakness|misconception|learning_style|behavioral|insight",
      "confidence": 0.85
    }
  ],
  "suggestedProbe": "What to investigate next based on this response",
  "confidenceShift": -10 to +10 (how much our confidence in their ability shifted),
  "anomalyDetected": true|false,
  "anomalyNote": "If anomaly detected, describe it",
  "adaptiveGuidance": {
    "difficultyAdjustment": -2 to +2,
    "conceptPivot": null | "concept name to switch to",
    "questionTypeRecommendation": "mcq|short_answer|true_false",
    "urgency": "normal|probe_deeper|remediate|accelerate"
  }
}
`,
    },

    probingQuestion: {
        version: '1.0',
        template: (params: {
            hypothesis: string
            state: AssessmentSnapshot
            conceptPool: string[]
        }) => `
You are designing a PROBING QUESTION to test a specific hypothesis about a learner.

HYPOTHESIS TO TEST: "${params.hypothesis}"

AVAILABLE CONCEPTS TO PROBE:
${params.conceptPool.map((c, i) => `${i + 1}. ${c}`).join('\n')}

CURRENT STATE:
- Difficulty Level: ${params.state.currentDifficulty}
- Questions Answered: ${params.state.questionsAnswered}
- Recent Performance: ${params.state.history.slice(-5).map((h) => `${h.concept}: ${h.isCorrect ? 'Γ£ô' : 'Γ£ù'}`).join(', ')}

Design the OPTIMAL PROBING QUESTION:

{
  "concept": "Which concept to use from the pool",
  "difficulty": 1-10,
  "questionType": "mcq|short_answer|true_false",
  "probingObjective": "What this specific question is designed to reveal",
  "expectedInformationGain": "What we'll learn regardless of correct/incorrect answer",
  "distractorGuidance": "For MCQs: What wrong answers should be included and why",
  "interpretationKey": {
    "ifCorrect": "What a correct answer would tell us",
    "ifIncorrect": "What an incorrect answer would tell us",
    "ifSpecificError": "If they make a specific type of error, what it means"
  },
  "followUpStrategy": "What to do next based on the result"
}
`,
    },
}
