// @ts-nocheck
// LEGACY: Will be removed after Strangler Fig migration.
/**
 * Investigative strategy ΓÇö hypothesis-driven AI probing for maximum information gain
 */

import { AssessmentState } from './engine'
import { ConceptNode, InvestigativeObjective, MicroAnalysisResult } from '@/lib/llm/types'
import { gemini } from '@/lib/llm'
import { createLogger } from '@/lib/core/logger'
import type { AdaptiveStrategy, NextQuestionParams } from './strategies'
import { ConceptualStrategy } from './strategies'

const logger = createLogger({ requestId: 'investigative-strategy' })

export class InvestigativeStrategy implements AdaptiveStrategy {
    async getNextParams(
        state: AssessmentState,
        currentConcept: ConceptNode,
        treeConcepts: ConceptNode[],
        microAnalysis?: MicroAnalysisResult | null
    ): Promise<NextQuestionParams> {
        // If we have a clear hypothesis to test, use AI to recommend the optimal probe
        if (microAnalysis?.suggestedProbe && gemini.recommendProbingQuestion) {
            const recommendation = await gemini.recommendProbingQuestion(
                microAnalysis.suggestedProbe,
                state,
                treeConcepts.map(c => c.name)
            )

            return {
                concept: recommendation.concept,
                difficulty: recommendation.difficulty,
                topic: state.topic,
                previousConcepts: state.history.map(h => h.concept),
                questionType: recommendation.questionType,
                probingGuidance: recommendation.probingObjective,
                distractorStrategy: recommendation.distractorGuidance
            }
        }

        // Otherwise, generate a fresh investigative objective
        const pastObjectives = state.history
            .filter(h => h.objective)
            .map(h => ({ focus: 'cognitive_depth' as const, hypothesis: h.objective || '', probingStrategy: '', successIndicators: [], failureIndicators: [], questionGuidance: { preferredType: 'mcq' as const, difficultyRange: [1, 10] as [number, number] }, reasoning: '' }))

        // Check if investigative methods are available
        if (!gemini.generateInvestigativeObjective) {
            // Fallback to conceptual strategy
            return new ConceptualStrategy().getNextParams(state, currentConcept, treeConcepts, microAnalysis)
        }

        try {
            const objective = await gemini.generateInvestigativeObjective(state, null, pastObjectives)

            // Find the best concept to test this hypothesis
            const targetConcept = treeConcepts.find(c =>
                c.difficulty >= objective.questionGuidance.difficultyRange[0] &&
                c.difficulty <= objective.questionGuidance.difficultyRange[1]
            ) || currentConcept

            return {
                concept: targetConcept.name,
                difficulty: Math.round((objective.questionGuidance.difficultyRange[0] + objective.questionGuidance.difficultyRange[1]) / 2),
                topic: state.topic,
                previousConcepts: state.history.map(h => h.concept),
                questionType: objective.questionGuidance.preferredType,
                investigativeObjective: objective,
                probingGuidance: `HYPOTHESIS: ${objective.hypothesis}\nSTRATEGY: ${objective.probingStrategy}`,
                distractorStrategy: objective.questionGuidance.distractorStrategy
            }
        } catch (e) {
            // Fallback to conceptual strategy
            logger.error('Investigative strategy failed, falling back to conceptual:', e)
            return new ConceptualStrategy().getNextParams(state, currentConcept, treeConcepts, microAnalysis)
        }
    }
}
