/**
 * A/B Testing Framework
 * 
 * Symposium 4.5 Directive: Lightweight in-house framework with Bayesian analysis.
 * Per-session flag caching. Ethical guardrail: never test accuracy.
 * Kill switch on every experiment.
 * 
 * Architecture: experiments table + assignments table + flag evaluation
 */
import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
const logger = createLogger({ requestId: 'ab-framework' })

// ─── Types ─────────────────────────────────────────────────────────
export interface Experiment {
    id: string
    name: string
    description: string
    variants: string[]
    trafficPct: number           // 0-100
    status: 'draft' | 'active' | 'paused' | 'completed'
    guardrail: 'ux_only' | 'format_only'
    createdAt: Date
    endedAt?: Date
}

export interface ExperimentAssignment {
    experimentId: string
    sessionId: string
    variant: string
}

export type FeatureFlags = Record<string, string | boolean>

// ─── Flag Resolution ───────────────────────────────────────────────
/**
 * Resolve all active experiment flags for a session.
 * Evaluates once per session — cache the result.
 * 
 * Deterministic assignment: hash(sessionId + experimentName) → variant
 */
export async function resolveFlags(
    sessionId: string
): Promise<FeatureFlags> {
    const supabase = await createClient()
    const flags: FeatureFlags = {}

    // Get active experiments
    const { data: experiments } = await supabase
        .from('experiments')
        .select('*')
        .eq('status', 'active')

    if (!experiments || experiments.length === 0) return flags

    for (const exp of experiments) {
        // Check if already assigned
        const { data: existing } = await supabase
            .from('experiment_assignments')
            .select('variant')
            .eq('experiment_id', exp.id)
            .eq('session_id', sessionId)
            .single()

        if (existing) {
            flags[exp.name] = existing.variant
            continue
        }

        // Check traffic percentage
        if (hashToPercent(sessionId, exp.name) > exp.traffic_pct) {
            flags[exp.name] = 'control' // Not in experiment
            continue
        }

        // Assign variant deterministically
        const variants = exp.variants || ['control', 'treatment']
        const variantIndex = hashToVariant(sessionId, exp.name, variants.length)
        const variant = variants[variantIndex]

        // Record assignment
        await supabase.from('experiment_assignments').insert({
            experiment_id: exp.id,
            session_id: sessionId,
            variant,
        })

        flags[exp.name] = variant
    }

    return flags
}

// ─── Kill Switch ───────────────────────────────────────────────────
/**
 * Emergency stop: pause an experiment and route all future users to control.
 */
export async function killExperiment(experimentId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
        .from('experiments')
        .update({ status: 'paused', ended_at: new Date().toISOString() })
        .eq('id', experimentId)
    logger.warn(`[AB] Experiment ${experimentId} KILLED — all users routed to control`)
}

// ─── Bayesian Analysis ─────────────────────────────────────────────
/**
 * Compute posterior probability that treatment is better than control.
 * Uses Beta-Binomial model for conversion metrics (completion rate, etc.).
 * 
 * Returns: P(treatment > control)
 */
export function bayesianAnalysis(
    controlSuccesses: number,
    controlTrials: number,
    treatmentSuccesses: number,
    treatmentTrials: number,
    simulations: number = 10000
): { probabilityBetter: number; controlRate: number; treatmentRate: number } {
    let treatmentWins = 0

    const controlRate = controlTrials > 0 ? controlSuccesses / controlTrials : 0
    const treatmentRate = treatmentTrials > 0 ? treatmentSuccesses / treatmentTrials : 0

    // Monte Carlo simulation from Beta posteriors
    for (let i = 0; i < simulations; i++) {
        const controlSample = betaSample(controlSuccesses + 1, controlTrials - controlSuccesses + 1)
        const treatmentSample = betaSample(treatmentSuccesses + 1, treatmentTrials - treatmentSuccesses + 1)
        if (treatmentSample > controlSample) treatmentWins++
    }

    return {
        probabilityBetter: treatmentWins / simulations,
        controlRate,
        treatmentRate,
    }
}

// ─── Helpers ───────────────────────────────────────────────────────
/**
 * Deterministic hash → percentage (0-100).
 * Same session + experiment always gets same value.
 */
function hashToPercent(sessionId: string, experimentName: string): number {
    const hash = simpleHash(`${sessionId}:${experimentName}`)
    return hash % 100
}

function hashToVariant(sessionId: string, experimentName: string, variantCount: number): number {
    const hash = simpleHash(`${sessionId}:${experimentName}:variant`)
    return hash % variantCount
}

function simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0 // Convert to 32-bit integer
    }
    return Math.abs(hash)
}

/**
 * Sample from Beta distribution using Jöhnk's algorithm.
 * Approximation suitable for Monte Carlo.
 */
function betaSample(alpha: number, beta: number): number {
    // Simple approximation using gamma samples
    const x = gammaSample(alpha)
    const y = gammaSample(beta)
    return x / (x + y)
}

function gammaSample(shape: number): number {
    // Marsaglia and Tsang's method for shape >= 1
    if (shape < 1) {
        return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape)
    }
    const d = shape - 1 / 3
    const c = 1 / Math.sqrt(9 * d)
    while (true) {
        let x: number, v: number
        do {
            x = normalSample()
            v = 1 + c * x
        } while (v <= 0)
        v = v * v * v
        const u = Math.random()
        if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
    }
}

function normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random()
    const u2 = Math.random()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}
