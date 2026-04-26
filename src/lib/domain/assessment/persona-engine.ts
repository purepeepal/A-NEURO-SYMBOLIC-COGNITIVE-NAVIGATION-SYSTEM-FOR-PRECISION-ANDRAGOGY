// src/lib/domain/assessment/persona-engine.ts
// Pure logic for calculating the 5D Persona metrics based on assessment behavior.
// BOUNDARY: This file MUST NOT import from ../llm/ — PersonaTraits is defined in repositories.ts

import { PersonaTraits } from './repositories';

export interface AssessmentContext {
    score: number;             // 0.0 to 1.0
    timeTakenMs: number;
    expectedTimeMs: number;
    hesitationIndex: number;   // 0.0 to 1.0
    agitationIndex: number;    // 0.0 to 1.0
}

/**
 * Infers initial quantitative persona traits based purely on the math of their session performance,
 * which the LLM will later enrich with a narrative summary.
 */
export function calculatePersonaBase(context: AssessmentContext): PersonaTraits {
    // These are simplified heuristics for the domain model. 
    // High score + low time = Highly Analytical/Practical
    // High score + high time + high hesitation = Synthesizing (Thinker)
    // Low score + high agitation = Needs foundational work

    const timeRatio = Math.min(2.0, context.timeTakenMs / context.expectedTimeMs); // 1.0 is expected

    let analytical = context.score * 80; // Base skill
    let practical = context.score * 70 + (2 - timeRatio) * 15; // Fast + accurate = practical
    let synthesizing = context.score * 60 + (timeRatio) * 20; // Slow + accurate = synthesizing
    let creative = 50; // Neutral default, enhanced by LLM later
    let evaluative = context.score * 50 + context.hesitationIndex * 30; // Pauses to evaluate

    // Helper to clamp to 0-100
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    return {
        analytical: clamp(analytical),
        creative: clamp(creative),
        practical: clamp(practical),
        synthesizing: clamp(synthesizing),
        evaluative: clamp(evaluative)
    };
}
