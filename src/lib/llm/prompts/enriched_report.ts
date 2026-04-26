import { AssessmentSnapshot, CognitiveBehavioralProfile, UserPersona } from '../types';
import { ResponseRow } from '@/types/db-rows';
import { CalibrationResult } from '@/lib/domain/assessment/self-assessment';

export const generateEnrichedReportPrompt = (
    state: AssessmentSnapshot,
    responses: ResponseRow[],
    calibration: CalibrationResult[],
    profile: CognitiveBehavioralProfile | null,
    userPersona: Partial<UserPersona> | null
): string => {
    const accuracy = state.questionsAnswered > 0 ? Math.round((responses.filter(r => r.is_correct).length / state.questionsAnswered) * 100) : 0;
    
    return `
You are the C3 Cognitive Science Agent for STREETS. You are generating an enriched end-of-session report that focuses on metacognition and cross-domain perspective shifts.

SESSION DATA:
Topic: ${state.topic}
Accuracy: ${accuracy}%
Cognitive Profile: ${profile?.thinkingStyle || 'Unknown'}

We already have a standard action plan. Your goal is to generate:
1. Perspective Shifts (2-3): Concepts from ENTIRELY DIFFERENT domains that share structural similarities with what the user just learned.
2. Meta-Learning Recommendations: Suggestions on *how* to learn, not just what to learn next (e.g. Spaced Retrieval, Interleaving).
3. Learner Stage Assessment: Classify them as novice, intermediate, or expert based on their knowledge topology and error patterns.

Return strictly valid JSON matching this exact structure:
{
    "title": "A catchy title for the report",
    "perspectiveShifts": [
        {
            "currentDomain": "${state.topic}",
            "suggestedDomain": "e.g. Biology, Economics",
            "rationale": "Why this domain shares a structural pattern",
            "bridgeConcept": "The specific shared concept",
            "expectedGrowth": "How this helps them"
        }
    ],
    "metaLearningRecommendations": [
        {
            "practice": "e.g. Spaced Retrieval",
            "description": "Brief description",
            "applicableConcepts": ["concept1"],
            "frequencyGuidance": "When to apply this",
            "evidenceBasis": "Why it works based on their errors"
        }
    ],
    "learnerStageAssessment": "novice", // "novice" | "intermediate" | "expert"
    "learnerStageEvidence": "Why this stage was chosen",
    "metacognitiveCalibrationSummary": "1 sentence summarizing their self-calibration vs reality.",
    "suggestionsTracking": []
}
`;
}
