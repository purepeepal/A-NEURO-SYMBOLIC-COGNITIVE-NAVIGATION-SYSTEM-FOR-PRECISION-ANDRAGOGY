/**
 * Compactify Utilities ΓÇö Unit Tests
 * 
 * Validates that token-saving compaction functions correctly truncate
 * large objects to essential fields, handle edge cases (null, empty, malformed),
 * and respect max-item limits.
 */
import { describe, it, expect } from 'vitest'
import {
    compactPersona,
    compactInsights,
    compactProfile,
    compactPatterns,
    compactAnomalies,
    compactGraph,
    compactGraphToString,
} from '@/lib/cognitive-graph/compactify'
import type { UserPersona, InvestigativeInsight, CognitiveBehavioralProfile, BehavioralPatternAnalysis, AnomalyAnalysis } from '@/lib/llm/types'
import type { CognitiveGraph, CognitiveNode, CognitiveEdge, CognitiveNodeState } from '@/lib/cognitive-graph/types'

// ΓöÇΓöÇΓöÇ Fixtures ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const fullPersona: UserPersona = {
    userId: 'test-user-1',
    depth: 7,
    breadth: 5,
    creativity: 6,
    persistence: 8,
    curiosity: 9,
    preferredModality: 'verbal',
    processingStyle: 'holist',
    explanationPreference: ['examples', 'step-by-step'],
    strongConcepts: ['algebra', 'geometry', 'trigonometry', 'calculus', 'statistics'],
    weakConcepts: ['topology', 'abstract_algebra', 'number_theory', 'combinatorics'],
    prerequisiteGaps: ['set_theory'],
    averageResponseTime: 34.2,
    consistencyScore: 0.78,
}

const fullInsights: InvestigativeInsight[] = [
    { category: 'breakthrough', title: 'Rapid abstraction ability', evidence: ['Q3 solved in 12s'], confidence: 0.95, implication: 'Can handle advanced topics', actionable: true },
    { category: 'pattern', title: 'Struggles with multi-step', evidence: ['Q5', 'Q8 errors'], confidence: 0.88, implication: 'Needs scaffolding', actionable: true },
    { category: 'anomaly', title: 'Unexpected topology success', evidence: ['Q7'], confidence: 0.72, implication: 'Latent strength', actionable: false },
    { category: 'concern', title: 'Rushing on easy tasks', evidence: ['Q1', 'Q2 timing'], confidence: 0.65, implication: 'Careless errors', actionable: true },
    { category: 'potential', title: 'Creative problem framing', evidence: ['Q9 answer style'], confidence: 0.60, implication: 'Try open-ended', actionable: false },
    { category: 'pattern', title: 'Low-confidence guessing', evidence: ['Q10', 'Q11'], confidence: 0.55, implication: 'Needs more practice', actionable: true },
    { category: 'breakthrough', title: 'Excellent memory recall', evidence: ['Q12'], confidence: 0.50, implication: 'Leverage for harder topics', actionable: false },
]

const fullProfile: CognitiveBehavioralProfile = {
    thinkingStyle: 'lateral',
    thinkingStyleEvidence: 'Frequently approaches from unexpected angles',
    reasoningApproach: 'abductive',
    reasoningEvidence: 'Pattern of best-guess-then-verify',
    problemSolvingSignature: 'Creative but occasionally misses systematic checks',
    errorFingerprint: {
        dominantType: 'procedural',
        triggers: ['multi-step', 'time-pressure', 'unfamiliar notation'],
        recoveryPattern: 'Usually self-corrects after seeing the error',
        persistentMisconceptions: ['order_of_operations edge cases'],
    },
    adaptationRate: 'fast',
    adaptationEvidence: 'Picked up new concept format after 2 questions',
    difficultyThreshold: 7,
    comfortZone: [3, 6],
    confidenceCalibration: 'overconfident',
    confidenceEvidence: 'Fast answers on hard questions with low accuracy',
    responseVelocityPattern: 'rushed_on_hard',
    persistenceScore: 72,
    latentStrengths: ['spatial_reasoning', 'pattern_recognition', 'creative_framing', 'memory_recall'],
    untappedAreas: ['proofs', 'formal_logic'],
    growthVectors: ['systematic_verification', 'multi-step_persistence', 'notation_fluency', 'self-monitoring'],
}

const fullPatterns: BehavioralPatternAnalysis = {
    detectedPatterns: [
        { patternType: 'temporal', description: 'Slows significantly on Q6+', evidence: ['timing data'], significance: 'high', implication: 'Fatigue effect' },
        { patternType: 'error_cluster', description: 'Errors cluster on algebra subtypes', evidence: ['Q3, Q5, Q8'], significance: 'high', implication: 'Prereq gaps' },
        { patternType: 'confidence', description: 'Fast-wrong on difficulty 7+', evidence: ['timing + accuracy'], significance: 'medium', implication: 'Overconfidence' },
        { patternType: 'recovery', description: 'Always recovers after 1 wrong', evidence: ['streak data'], significance: 'medium', implication: 'Good resilience' },
        { patternType: 'hidden_strength', description: 'Unexpected topology competence', evidence: ['Q7'], significance: 'low', implication: 'Explore more' },
    ],
    emergingHypotheses: ['May have visual/spatial advantage'],
    unexplainedObservations: ['Q4 answer was correct but reasoning was wrong'],
    confidenceMetrics: { dataQuality: 0.85, patternStrength: 0.75, analysisDepth: 'deep' },
}

const fullAnomalies: AnomalyAnalysis = {
    anomalies: [
        { type: 'performance_shift', description: 'Sudden accuracy drop at Q6', location: 'Q6-Q8', deviation: '40% drop', possibleExplanations: ['fatigue', 'difficulty spike'], investigationPriority: 'high', suggestedProbe: 'Easier question to test recovery' },
        { type: 'timing_outlier', description: 'Q3 solved in 3 seconds', location: 'Q3', deviation: '5x faster than average', possibleExplanations: ['prior knowledge', 'lucky guess'], investigationPriority: 'medium', suggestedProbe: 'Follow-up on same concept' },
        { type: 'error_inversion', description: 'Got hard Q right, easy Q wrong', location: 'Q7 vs Q2', deviation: 'Inverse correlation', possibleExplanations: ['carelessness on easy', 'guessing on hard'], investigationPriority: 'medium', suggestedProbe: 'Mix difficulty levels' },
        { type: 'behavioral_signal', description: 'Possible answer-switching pattern', location: 'Q9-Q11', deviation: 'Multiple revisions', possibleExplanations: ['uncertainty', 'second-guessing'], investigationPriority: 'low', suggestedProbe: 'Confidence rating question' },
    ],
    overallAnomalyScore: 0.65,
    sessionStability: 'variable',
    concernFlags: ['possible fatigue', 'overconfidence risk'],
}

function makeGraph(nodeCount: number): CognitiveGraph {
    const nodes: CognitiveNode[] = Array.from({ length: nodeCount }, (_, i) => ({
        id: `node-${i}`,
        type: 'observation' as const,
        label: `Observation ${i}`,
        detail: `Detail for observation ${i}`,
        confidence: 0.5 + i * 0.05,
        evidence: [`evidence-${i}`],
        state: i % 3 === 0 ? 'tentative' as const : i % 3 === 1 ? 'solidified' as const : 'reconsidering' as const,
        stateHistory: [{
            from: 'tentative' as const,
            to: (i % 3 === 0 ? 'tentative' : i % 3 === 1 ? 'solidified' : 'reconsidering') as CognitiveNodeState,
            timestamp: new Date(Date.now() - (nodeCount - i) * 3600000).toISOString(),
            trigger: `Session evidence ${i}`,
            sessionId: `session-${i}`,
        }],
        domain: i % 2 === 0 ? 'learning_style' : 'error_patterns',
        createdAt: new Date(Date.now() - nodeCount * 3600000).toISOString(),
        lastUpdated: new Date(Date.now() - (nodeCount - i) * 3600000).toISOString(),
    }))

    const edges: CognitiveEdge[] = nodeCount > 1
        ? Array.from({ length: Math.min(nodeCount - 1, 5) }, (_, i) => ({
            id: `edge-${i}`,
            source: `node-${i}`,
            target: `node-${i + 1}`,
            relation: 'supports' as const,
            weight: 0.7,
            evidence: `Edge evidence ${i}`,
        }))
        : []

    return {
        nodes,
        edges,
        meta: {
            sessionCount: 3,
            lastSessionId: 'session-latest',
            lastSessionTopic: 'Calculus',
            graphVersion: 3,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            lastUpdated: new Date().toISOString(),
        },
    }
}

// ΓöÇΓöÇΓöÇ Tests ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

describe('compactPersona', () => {
    it('returns "None" for null/undefined input', () => {
        expect(compactPersona(null)).toBe('None')
        expect(compactPersona(undefined)).toBe('None')
    })

    it('returns "Minimal data" for empty object', () => {
        expect(compactPersona({})).toBe('Minimal data')
    })

    it('truncates strengths to top 3', () => {
        const result = compactPersona(fullPersona)
        // Should contain at most 3 strong concepts
        const strengthMatch = result.match(/Strengths: (.+?)(?:\s*\||$)/)
        expect(strengthMatch).toBeTruthy()
        const strengths = strengthMatch![1].split(', ')
        expect(strengths.length).toBeLessThanOrEqual(3)
    })

    it('truncates weaknesses to top 3', () => {
        const result = compactPersona(fullPersona)
        const weakMatch = result.match(/Weaknesses: (.+?)(?:\s*\||$)/)
        expect(weakMatch).toBeTruthy()
        const weaknesses = weakMatch![1].split(', ')
        expect(weaknesses.length).toBeLessThanOrEqual(3)
    })

    it('includes style and depth', () => {
        const result = compactPersona(fullPersona)
        expect(result).toContain('Style: holist')
        expect(result).toContain('Depth: 7')
    })

    it('handles snake_case fields (raw Supabase row)', () => {
        const raw = {
            strong_concepts: ['algebra', 'geometry'],
            weak_concepts: ['topology'],
            processing_style: 'serialist',
            overall_mastery: 0.8,
            total_sessions: 5,
        }
        const result = compactPersona(raw as any)
        expect(result).toContain('Strengths: algebra, geometry')
        expect(result).toContain('Weaknesses: topology')
        expect(result).toContain('Style: serialist')
        expect(result).toContain('Mastery: 0.8')
        expect(result).toContain('Sessions: 5')
    })

    it('produces a single-line pipe-separated string', () => {
        const result = compactPersona(fullPersona)
        // Should not contain newlines
        expect(result).not.toContain('\n')
        expect(result).toContain('|')
    })
})

describe('compactInsights', () => {
    it('returns "None" for empty/null input', () => {
        expect(compactInsights([])).toBe('None')
        expect(compactInsights(null as any)).toBe('None')
    })

    it('returns max 5 insights by default', () => {
        const result = compactInsights(fullInsights)
        const lines = result.split('\n').filter((l: string) => l.trim())
        expect(lines.length).toBeLessThanOrEqual(5)
    })

    it('respects custom maxItems', () => {
        const result = compactInsights(fullInsights, 3)
        const lines = result.split('\n').filter((l: string) => l.trim())
        expect(lines.length).toBeLessThanOrEqual(3)
    })

    it('sorts by confidence descending', () => {
        const result = compactInsights(fullInsights)
        const lines = result.split('\n').filter((l: string) => l.trim())
        const confidences = lines.map((line: string) => {
            const match = line.match(/(\d+)%/)
            return match ? parseInt(match[1]) : 0
        })
        // Each confidence should be >= next
        for (let i = 1; i < confidences.length; i++) {
            expect(confidences[i - 1]).toBeGreaterThanOrEqual(confidences[i])
        }
    })

    it('includes category, confidence, title', () => {
        const result = compactInsights(fullInsights, 1)
        // Top insight is 95% confidence "Rapid abstraction ability"
        expect(result).toContain('breakthrough')
        expect(result).toContain('95%')
        expect(result).toContain('Rapid abstraction ability')
    })

    it('marks actionable insights', () => {
        const result = compactInsights(fullInsights)
        expect(result).toContain('(actionable)')
    })
})

describe('compactProfile', () => {
    it('includes thinking style and reasoning', () => {
        const result = compactProfile(fullProfile)
        expect(result).toContain('lateral')
        expect(result).toContain('abductive')
    })

    it('includes error fingerprint dominant type', () => {
        const result = compactProfile(fullProfile)
        expect(result).toContain('procedural')
    })

    it('includes adaptation rate', () => {
        const result = compactProfile(fullProfile)
        expect(result).toContain('fast')
    })

    it('truncates latent strengths to top 3', () => {
        const result = compactProfile(fullProfile)
        const match = result.match(/Latent strengths: (.+)/)
        expect(match).toBeTruthy()
        const items = match![1].split(', ')
        expect(items.length).toBeLessThanOrEqual(3)
    })

    it('truncates growth vectors to top 3', () => {
        const result = compactProfile(fullProfile)
        const match = result.match(/Growth vectors: (.+)/)
        expect(match).toBeTruthy()
        const items = match![1].split(', ')
        expect(items.length).toBeLessThanOrEqual(3)
    })

    it('handles missing optional fields gracefully', () => {
        const minimal: CognitiveBehavioralProfile = {
            thinkingStyle: 'linear',
            thinkingStyleEvidence: '',
            reasoningApproach: 'deductive',
            reasoningEvidence: '',
            problemSolvingSignature: '',
            errorFingerprint: { dominantType: 'conceptual', triggers: [], recoveryPattern: '', persistentMisconceptions: [] },
            adaptationRate: 'moderate',
            adaptationEvidence: '',
            difficultyThreshold: 5,
            comfortZone: [2, 5],
            confidenceCalibration: 'unknown',
            confidenceEvidence: '',
            responseVelocityPattern: 'consistent',
            persistenceScore: 50,
            latentStrengths: [],
            untappedAreas: [],
            growthVectors: [],
        }
        const result = compactProfile(minimal)
        expect(result).toContain('linear')
        expect(result).toContain('deductive')
        // Should not crash on empty arrays
        expect(result).not.toContain('Latent strengths')
        expect(result).not.toContain('Growth vectors')
    })
})

describe('compactPatterns', () => {
    it('returns message for null/empty patterns', () => {
        expect(compactPatterns({ detectedPatterns: [], emergingHypotheses: [], unexplainedObservations: [], confidenceMetrics: { dataQuality: 0, patternStrength: 0, analysisDepth: 'surface' } })).toBe('No patterns detected')
    })

    it('filters to high and medium significance only', () => {
        const result = compactPatterns(fullPatterns)
        // Should not include the "low" significance pattern
        expect(result).not.toContain('Unexpected topology competence')
    })

    it('limits to max 4 patterns', () => {
        const result = compactPatterns(fullPatterns)
        const lines = result.split('\n').filter((l: string) => l.trim())
        expect(lines.length).toBeLessThanOrEqual(4)
    })

    it('includes significance and pattern type', () => {
        const result = compactPatterns(fullPatterns)
        expect(result).toContain('[high|temporal]')
        expect(result).toContain('[high|error_cluster]')
    })

    it('returns fallback for only-low patterns', () => {
        const lowOnly: BehavioralPatternAnalysis = {
            detectedPatterns: [
                { patternType: 'hidden_strength', description: 'Minor observation', evidence: [], significance: 'low', implication: '' },
            ],
            emergingHypotheses: [],
            unexplainedObservations: [],
            confidenceMetrics: { dataQuality: 0.5, patternStrength: 0.3, analysisDepth: 'surface' },
        }
        expect(compactPatterns(lowOnly)).toBe('Only low-significance patterns detected')
    })
})

describe('compactAnomalies', () => {
    it('returns message for no anomalies', () => {
        expect(compactAnomalies({ anomalies: [], overallAnomalyScore: 0, sessionStability: 'stable', concernFlags: [] })).toBe('No anomalies detected')
    })

    it('filters to high and medium priority only', () => {
        const result = compactAnomalies(fullAnomalies)
        // "low" priority anomaly should not appear
        expect(result).not.toContain('answer-switching')
    })

    it('limits to max 3 anomalies', () => {
        const result = compactAnomalies(fullAnomalies)
        const anomalyLines = result.split('\n').filter((l: string) => l.startsWith('['))
        expect(anomalyLines.length).toBeLessThanOrEqual(3)
    })

    it('includes session stability and anomaly score', () => {
        const result = compactAnomalies(fullAnomalies)
        expect(result).toContain('variable')
        expect(result).toContain('0.65')
    })

    it('includes concern flags', () => {
        const result = compactAnomalies(fullAnomalies)
        expect(result).toContain('possible fatigue')
        expect(result).toContain('overconfidence risk')
    })

    it('handles no high-priority anomalies gracefully', () => {
        const lowOnly: AnomalyAnalysis = {
            anomalies: [
                { type: 'behavioral_signal', description: 'Minor', location: 'Q1', deviation: 'slight', possibleExplanations: [], investigationPriority: 'low', suggestedProbe: '' },
            ],
            overallAnomalyScore: 0.1,
            sessionStability: 'stable',
            concernFlags: [],
        }
        const result = compactAnomalies(lowOnly)
        expect(result).toContain('Session stability: stable')
        expect(result).toContain('No high-priority anomalies')
    })
})

describe('compactGraph', () => {
    it('returns null for null/undefined/empty graph', () => {
        expect(compactGraph(null)).toBeNull()
        expect(compactGraph(undefined)).toBeNull()
        expect(compactGraph({ nodes: [], edges: [], meta: { sessionCount: 0, lastSessionId: '', lastSessionTopic: '', graphVersion: 0, createdAt: '', lastUpdated: '' } })).toBeNull()
    })

    it('preserves node count', () => {
        const graph = makeGraph(5)
        const result = compactGraph(graph)!
        expect(result.nodeCount).toBe(5)
    })

    it('compacts nodes to essential fields only', () => {
        const graph = makeGraph(3)
        const result = compactGraph(graph)!
        // Each compacted node should only have: id, type, label, confidence, state, domain
        for (const node of result.nodes) {
            expect(node).toHaveProperty('id')
            expect(node).toHaveProperty('type')
            expect(node).toHaveProperty('label')
            expect(node).toHaveProperty('confidence')
            expect(node).toHaveProperty('state')
            // Should NOT have evidence, detail, stateHistory, createdAt, lastUpdated
            expect(node).not.toHaveProperty('evidence')
            expect(node).not.toHaveProperty('detail')
            expect(node).not.toHaveProperty('stateHistory')
            expect(node).not.toHaveProperty('createdAt')
        }
    })

    it('compacts edges to source/target/relation only', () => {
        const graph = makeGraph(5)
        const result = compactGraph(graph)!
        for (const edge of result.edges) {
            expect(edge).toHaveProperty('source')
            expect(edge).toHaveProperty('target')
            expect(edge).toHaveProperty('relation')
            // Should not have weight, evidence, id
            expect(edge).not.toHaveProperty('weight')
            expect(edge).not.toHaveProperty('id')
        }
    })

    it('extracts at most 3 recent state transitions', () => {
        const graph = makeGraph(10)
        const result = compactGraph(graph)!
        expect(result.recentTransitions.length).toBeLessThanOrEqual(3)
    })
})

describe('compactGraphToString', () => {
    it('returns fallback for null/empty snapshot', () => {
        expect(compactGraphToString(null)).toBe('No existing cognitive graph.')
        expect(compactGraphToString({ nodeCount: 0, nodes: [], edges: [], recentTransitions: [] })).toBe('No existing cognitive graph.')
    })

    it('produces a string representation of the graph', () => {
        const graph = makeGraph(3)
        const snapshot = compactGraph(graph)!
        const result = compactGraphToString(snapshot)
        expect(result).toContain('COGNITIVE GRAPH (3 nodes)')
        expect(result).toContain('NODES:')
        expect(result).toContain('EDGES:')
        expect(result).toContain('node-0')
    })

    it('includes node state and confidence', () => {
        const graph = makeGraph(2)
        const snapshot = compactGraph(graph)!
        const result = compactGraphToString(snapshot)
        // Should show state like [observation|tentative|50%]
        expect(result).toMatch(/\[observation\|/)
        expect(result).toMatch(/\d+%/)
    })

    it('shows edge relations', () => {
        const graph = makeGraph(3)
        const snapshot = compactGraph(graph)!
        const result = compactGraphToString(snapshot)
        expect(result).toContain('--supports-->')
    })
})