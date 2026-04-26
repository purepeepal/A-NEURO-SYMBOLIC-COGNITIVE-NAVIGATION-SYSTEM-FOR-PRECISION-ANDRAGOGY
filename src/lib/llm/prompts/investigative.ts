/**
 * Investigative analysis prompts ΓÇö detective-style cognitive profiling
 */

import type {
    UserPersona,
    InvestigativeObjective,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
    AssessmentSnapshot,
} from '../types'
import type { ResponseRow, HistoryEntry } from '@/types/db-rows'
import { compactPersona } from '@/lib/cognitive-graph/compactify'

export const INVESTIGATIVE_PROMPTS = {
    investigativeObjective: {
        version: '1.0',
        template: (params: {
            state: AssessmentSnapshot
            currentPersona: Partial<UserPersona> | null
            pastObjectives: InvestigativeObjective[]
        }) => `
You are COGNITIVE_DETECTIVE.EXE, an elite AI investigator specializing in uncovering hidden cognitive patterns and learning behaviors.

Your mission: Determine the NEXT INVESTIGATIVE OBJECTIVE - what specific cognitive or knowledge aspect should we probe next to maximize our understanding of this learner?

CURRENT INTELLIGENCE DOSSIER:
- Topic: ${params.state.topic}
- Questions Answered: ${params.state.questionsAnswered}
- Current Difficulty: ${params.state.currentDifficulty}
- Consecutive Correct: ${params.state.consecutiveCorrect}
- Consecutive Incorrect: ${params.state.consecutiveIncorrect}

KNOWN PERSONA (Prior Intel):
${compactPersona(params.currentPersona)}

SESSION HISTORY (Recent Observations):
${params.state.history.slice(-10).map((h: HistoryEntry, i: number) =>
            `[Q${i + 1}] ${h.concept} | Diff ${h.difficulty} | ${h.isCorrect ? 'CORRECT Γ£ô' : 'INCORRECT Γ£ù'} ${h.objective ? `| Objective: ${h.objective}` : ''}`
        ).join('\n')}

PAST OBJECTIVES TESTED:
${params.pastObjectives.map((o, i) => `${i + 1}. ${o.focus}: "${o.hypothesis}"`).join('\n') || 'None yet'}

INVESTIGATION FRAMEWORK:
Think like a detective. What DON'T we know yet? What patterns are emerging? What would be the MOST REVEALING question to ask next?

Focus Areas to Consider:
1. cognitive_depth - Can they handle abstract/complex reasoning?
2. knowledge_boundaries - Where exactly do they break down?
3. error_archaeology - What do their mistakes tell us about their mental models?
4. pattern_detection - Are there hidden behavioral patterns (rushing, guessing, etc.)?
5. stress_response - How do they behave when challenged?
6. learning_velocity - How quickly are they adapting?
7. metacognition - Do they know what they don't know?
8. transfer_potential - Can they apply concepts to new contexts?

Generate a JSON response (no markdown):
{
  "focus": "cognitive_depth|knowledge_boundaries|error_archaeology|pattern_detection|stress_response|learning_velocity|metacognition|transfer_potential",
  "hypothesis": "A specific, testable hypothesis about the learner (e.g., 'Subject struggles with multi-step reasoning when variables exceed 3')",
  "probingStrategy": "How to design the next question(s) to test this hypothesis",
  "successIndicators": ["What response patterns would CONFIRM the hypothesis"],
  "failureIndicators": ["What response patterns would REFUTE the hypothesis"],
  "questionGuidance": {
    "preferredType": "mcq|short_answer|true_false",
    "difficultyRange": [min, max],
    "distractorStrategy": "For MCQs: what the wrong answers should reveal (e.g., 'Include option that tests sign errors')"
  },
  "reasoning": "Your detective reasoning for why this is the highest-value investigation right now"
}
`,
    },

    behavioralPatterns: {
        version: '1.1',
        template: (params: {
            state: AssessmentSnapshot
            responses: ResponseRow[]
        }) => {
      // Compact response lines to reduce input tokens (was ~80 tokens/response, now ~30)
      const compactResponses = params.responses.map((r: ResponseRow, i: number) =>
        `Q${i + 1}|${r.concept}|d${r.difficulty}|${r.is_correct ? 'OK' : 'FAIL'}|${r.time_taken_seconds || '?'}s|err:${r.error_type || '-'}|obj:${r.objective || '-'}`
      ).join('\n')

      const accuracy = params.state.history.length > 0
        ? (params.state.history.filter((h) => h.isCorrect).length / params.state.history.length * 100).toFixed(0)
        : 0
      const diffRange = params.state.history.length > 0
        ? `${Math.min(...params.state.history.map((h) => h.difficulty))}-${Math.max(...params.state.history.map((h) => h.difficulty))}`
        : 'N/A'

      return `
You are a BEHAVIORAL PATTERN ANALYST detecting hidden patterns in learner behavior.

SESSION (${params.state.questionsAnswered} Qs, ${accuracy}% acc, diff ${diffRange}):
Format: Q#|concept|difficulty|result|time|errorType|objective
${compactResponses}

Detect patterns in: temporal behavior, difficulty response, error clustering, recovery after mistakes, confidence signals (timing×correctness), concept connections, hidden strengths, blind spots.

Generate JSON (no markdown):
{
  "detectedPatterns": [
    {
      "patternType": "temporal|difficulty_response|error_cluster|recovery|confidence|concept_connection|hidden_strength|blind_spot",
      "description": "Clear description",
      "evidence": ["Specific evidence"],
      "significance": "high|medium|low",
      "implication": "What this means for learning"
    }
  ],
  "emergingHypotheses": ["New hypotheses about the learner"],
  "unexplainedObservations": ["Strange/unexpected behaviors"],
  "confidenceMetrics": {
    "dataQuality": 0.85,
    "patternStrength": 0.75,
    "analysisDepth": "surface|moderate|deep"
  }
}
`
    },
    },

    anomalyDetection: {
        version: '1.1',
        template: (params: {
            responses: ResponseRow[]
            patterns: BehavioralPatternAnalysis
        }) => {
      const compactResponses = params.responses.map((r, i) =>
        `Q${i + 1}|${r.concept}|d${r.difficulty}|${r.is_correct ? 'OK' : 'FAIL'}|${r.time_taken_seconds || '?'}s|"${(r.user_answer || '').slice(0, 40)}"`
      ).join('\n')

      // Only pass detected patterns, not the full analysis object
      const patternSummary = params.patterns.detectedPatterns?.map(p =>
        `[${p.significance}] ${p.patternType}: ${p.description}`
      ).join('\n') || 'None detected'

      return `
You are an ANOMALY DETECTIVE finding unexpected behaviors that deviate from patterns.

KNOWN PATTERNS:
${patternSummary}

RESPONSES (Q#|concept|diff|result|time|answer):
${compactResponses}

Hunt for: sudden performance shifts, counter-pattern responses, timing outliers, conceptual leaps, error inversions (hard correct + easy wrong), behavioral signals (guessing/frustration).

Generate JSON (no markdown):
{
  "anomalies": [
    {
      "type": "performance_shift|counter_pattern|timing_outlier|conceptual_leap|error_inversion|behavioral_signal",
      "description": "What the anomaly is",
      "location": "Question number(s)",
      "deviation": "How it deviates from expected",
      "possibleExplanations": ["Possible reasons"],
      "investigationPriority": "high|medium|low",
      "suggestedProbe": "How to investigate further"
    }
  ],
  "overallAnomalyScore": 0.0 to 1.0,
  "sessionStability": "stable|variable|chaotic",
  "concernFlags": ["Red flags for engagement/frustration/gaming"]
}
`
    },
    },

    insightSynthesis: {
        version: '1.1',
        template: (params: {
            patterns: BehavioralPatternAnalysis
            anomalies: AnomalyAnalysis
            currentPersona: Partial<UserPersona> | null
        }) => {
      // Extract only essential fields to reduce token usage
      const patternSummary = params.patterns.detectedPatterns?.map(p =>
        `[${p.significance}] ${p.patternType}: ${p.description} → ${p.implication}`
      ).join('\n') || 'None'

      const anomalySummary = params.anomalies.anomalies?.map(a =>
        `[${a.investigationPriority}] ${a.type}: ${a.description}`
      ).join('\n') || 'None'

      const personaSnippet = params.currentPersona
        ? `Depth: ${params.currentPersona.depth}, Persist: ${params.currentPersona.persistence}, Strong: ${params.currentPersona.strongConcepts?.join(',')}, Weak: ${params.currentPersona.weakConcepts?.join(',')}`
        : 'No prior intel'

      return `
You are the CHIEF INSIGHT SYNTHESIZER combining investigative findings into actionable cognitive insights.

PATTERNS:
${patternSummary}

ANOMALIES (score: ${params.anomalies.overallAnomalyScore}, stability: ${params.anomalies.sessionStability}):
${anomalySummary}

EXISTING PERSONA: ${personaSnippet}

Synthesize INVESTIGATIVE INSIGHTS that are specific, evidence-backed, actionable, and non-obvious.
Categories: breakthrough, anomaly, pattern, concern, potential.

Generate JSON (no markdown):
{
  "insights": [
    {
      "category": "breakthrough|anomaly|pattern|concern|potential",
      "title": "Short punchy title",
      "evidence": ["Specific data points"],
      "confidence": 0.0 to 1.0,
      "implication": "What this means",
      "actionable": true|false,
      "recommendedAction": "Specific action if actionable"
    }
  ],
  "personaUpdates": {
    "newStrengths": ["Newly identified"],
    "newWeaknesses": ["Newly identified"],
    "misconceptions": ["Identified"],
    "learningStyle": "Any new info",
    "metricAdjustments": { "depth": -5 to +5, "persistence": -5 to +5 }
  },
  "openQuestions": ["Things we still don't know"]
}
`
    },
    },
}
