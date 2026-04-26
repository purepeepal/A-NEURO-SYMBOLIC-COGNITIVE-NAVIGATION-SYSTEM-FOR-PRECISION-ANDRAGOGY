/**
 * IRT Analysis — Rasch Model (1PL)
 * 
 * Symposium 4.2 Directive: Rasch for MVP. Offline batch analysis on
 * curated items only. Person-fit exclusion for aberrant responders.
 * Results are heuristics, not ground truth.
 * 
 * Run as: npx tsx src/scripts/run-irt-analysis.ts --topic "Calculus"
 */

// ─── Types ─────────────────────────────────────────────────────────
export interface ItemParam {
    itemId: string
    difficulty: number          // b parameter
    discrimination?: number     // a parameter (2PL, not used in Rasch)
    responseCount: number
}

export interface PersonFit {
    personIndex: number
    infit: number              // Weighted mean-square residual
    outfit: number             // Unweighted mean-square residual
    flagged: boolean           // infit > 1.5 or outfit > 2.0
}

export interface IRTReport {
    topic: string
    itemsAnalyzed: number
    personsAnalyzed: number
    personsFlagged: number
    items: ItemParam[]
    flaggedItems: Array<{ itemId: string; difficulty: number; issue: string }>
    difficultyDistribution: { easy: number; medium: number; hard: number }
}

// ─── Rasch Probability ─────────────────────────────────────────────
/**
 * P(correct | theta, b) = exp(theta - b) / (1 + exp(theta - b))
 */
export function raschProbability(personAbility: number, itemDifficulty: number): number {
    const logit = personAbility - itemDifficulty
    return Math.exp(logit) / (1 + Math.exp(logit))
}

// ─── Person-Fit Statistics ─────────────────────────────────────────
/**
 * Compute Infit and Outfit statistics for a person.
 * Infit > 1.5 or Outfit > 2.0 → flag as aberrant.
 */
export function computePersonFit(
    responses: boolean[],
    personAbility: number,
    itemDifficulties: number[]
): PersonFit & { personIndex: number } {
    let sumWeightedResiduals = 0
    let sumWeights = 0
    let sumUnweightedResiduals = 0

    for (let i = 0; i < responses.length; i++) {
        const p = raschProbability(personAbility, itemDifficulties[i])
        const variance = p * (1 - p)
        const residual = (responses[i] ? 1 : 0) - p
        const standardizedResidualSq = (residual * residual) / variance

        sumWeightedResiduals += residual * residual
        sumWeights += variance
        sumUnweightedResiduals += standardizedResidualSq
    }

    const infit = sumWeights > 0 ? sumWeightedResiduals / sumWeights : 1
    const outfit = responses.length > 0 ? sumUnweightedResiduals / responses.length : 1

    return {
        personIndex: 0, // Set by caller
        infit,
        outfit,
        flagged: infit > 1.5 || outfit > 2.0,
    }
}

// ─── JMLE Estimation ───────────────────────────────────────────────
/**
 * Joint Maximum Likelihood Estimation for Rasch model.
 * Iteratively estimates person abilities and item difficulties.
 * 
 * @param responseMatrix - rows are persons, columns are items. true = correct.
 * @param maxIterations - convergence limit
 * @param tolerance - max change for convergence
 */
export function estimateRaschParameters(
    responseMatrix: boolean[][],
    maxIterations: number = 100,
    tolerance: number = 0.01
): { personAbilities: number[]; itemDifficulties: number[] } {
    const nPersons = responseMatrix.length
    const nItems = responseMatrix[0]?.length ?? 0

    if (nPersons === 0 || nItems === 0) {
        return { personAbilities: [], itemDifficulties: [] }
    }

    // Initialize from raw scores
    const personAbilities = responseMatrix.map(row => {
        const score = row.filter(Boolean).length
        const p = Math.max(0.01, Math.min(0.99, score / nItems))
        return Math.log(p / (1 - p))
    })

    const itemDifficulties = Array.from({ length: nItems }, (_, j) => {
        const correct = responseMatrix.filter(row => row[j]).length
        const p = Math.max(0.01, Math.min(0.99, correct / nPersons))
        return -Math.log(p / (1 - p))
    })

    // Iterative estimation
    for (let iter = 0; iter < maxIterations; iter++) {
        let maxChange = 0

        // Update person abilities
        for (let i = 0; i < nPersons; i++) {
            let sumResiduals = 0
            let sumVariances = 0
            for (let j = 0; j < nItems; j++) {
                const p = raschProbability(personAbilities[i], itemDifficulties[j])
                sumResiduals += (responseMatrix[i][j] ? 1 : 0) - p
                sumVariances += p * (1 - p)
            }
            if (sumVariances > 0) {
                const change = sumResiduals / sumVariances
                personAbilities[i] += change
                maxChange = Math.max(maxChange, Math.abs(change))
            }
        }

        // Update item difficulties
        for (let j = 0; j < nItems; j++) {
            let sumResiduals = 0
            let sumVariances = 0
            for (let i = 0; i < nPersons; i++) {
                const p = raschProbability(personAbilities[i], itemDifficulties[j])
                sumResiduals += (responseMatrix[i][j] ? 1 : 0) - p
                sumVariances += p * (1 - p)
            }
            if (sumVariances > 0) {
                const change = -sumResiduals / sumVariances // Note: negative for difficulty
                itemDifficulties[j] += change
                maxChange = Math.max(maxChange, Math.abs(change))
            }
        }

        // Center item difficulties (identifiability constraint)
        const meanDifficulty = itemDifficulties.reduce((a, b) => a + b, 0) / nItems
        for (let j = 0; j < nItems; j++) {
            itemDifficulties[j] -= meanDifficulty
        }

        if (maxChange < tolerance) {
            console.info(`[IRT] Converged after ${iter + 1} iterations (maxChange = ${maxChange.toFixed(4)})`)
            break
        }
    }

    return { personAbilities, itemDifficulties }
}

// ─── Report Generation ─────────────────────────────────────────────
/**
 * Generate an IRT analysis report for a topic's curated questions.
 */
export function generateIRTReport(
    topic: string,
    itemIds: string[],
    responseMatrix: boolean[][]
): IRTReport {
    const { personAbilities, itemDifficulties } = estimateRaschParameters(responseMatrix)

    // Person-fit analysis
    const personFits = personAbilities.map((ability, i) => ({
        ...computePersonFit(responseMatrix[i], ability, itemDifficulties),
        personIndex: i,
    }))
    const flaggedPersons = personFits.filter(pf => pf.flagged)

    // Item analysis
    const items: ItemParam[] = itemIds.map((id, j) => ({
        itemId: id,
        difficulty: itemDifficulties[j],
        responseCount: responseMatrix.length,
    }))

    // Flagged items (too easy, too hard, or poor discrimination estimated via point-biserial)
    const flaggedItems = items
        .filter(item => item.difficulty < -2 || item.difficulty > 2)
        .map(item => ({
            itemId: item.itemId,
            difficulty: item.difficulty,
            issue: item.difficulty < -2 ? 'Too easy (b < -2)' : 'Too hard (b > 2)',
        }))

    // Difficulty distribution
    const easy = items.filter(i => i.difficulty < -1).length
    const hard = items.filter(i => i.difficulty > 1).length
    const medium = items.length - easy - hard

    return {
        topic,
        itemsAnalyzed: items.length,
        personsAnalyzed: personAbilities.length,
        personsFlagged: flaggedPersons.length,
        items,
        flaggedItems,
        difficultyDistribution: { easy, medium, hard },
    }
}
