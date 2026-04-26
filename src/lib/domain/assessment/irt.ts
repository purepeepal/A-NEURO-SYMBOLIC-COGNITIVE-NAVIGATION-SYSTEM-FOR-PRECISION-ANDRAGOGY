// src/lib/domain/assessment/irt.ts
// Pure implementation of Item Response Theory (1PL/Rasch model)

export interface IRTParameters {
    ability: number;     // Theta: learner's current estimated ability (-3 to +3)
    difficulty: number;  // b: question's difficulty (-3 to +3)
}

/**
 * Calculates the probability of a correct response using the 1PL IRT model.
 */
export function calculateProbabilityCorrect(params: IRTParameters): number {
    const exponent = params.ability - params.difficulty;
    return 1 / (1 + Math.exp(-exponent));
}

/**
 * Updates the learner's ability estimate (Theta) after answering a question.
 * @param isCorrect Whether the learner answered correctly (1 or 0)
 * @param params Current ability and question difficulty
 * @param learningRate How aggressively to update the estimate
 * @returns new estimated ability
 */
export function updateAbilityEstimate(
    isCorrect: boolean,
    params: IRTParameters,
    learningRate: number = 0.5
): number {
    const actual = isCorrect ? 1 : 0;
    const probability = calculateProbabilityCorrect(params);

    // Gradient ascent step (Maximum Likelihood Estimation approximation)
    const newAbility = params.ability + learningRate * (actual - probability);

    // Clamp to reasonable bounds (-4 to +4)
    return Math.max(-4, Math.min(4, newAbility));
}
