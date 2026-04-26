/**
 * Compactify Utilities ΓÇö Token Optimization
 * 
 * Pure functions that truncate large objects to essential fields before
 * prompt injection. Reduces input tokens by 40-60% for chained analysis calls.
 */

import type {
    UserPersona,
    InvestigativeInsight,
    CognitiveBehavioralProfile,
    BehavioralPatternAnalysis,
    AnomalyAnalysis,
} from '@/lib/llm/types'
import type { CognitiveGraph, CompactGraphSnapshot } from './types'

// ΓöÇΓöÇΓöÇ Persona Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactPersona(
    persona: Partial<UserPersona> | null | undefined
): string {
    if (!persona) return 'None'
    // Handle both camelCase (UserPersona type) and snake_case (raw Supabase row)
    const p = persona as any
    const fields: string[] = []
    const strengths = p.strongConcepts || p.strong_concepts
    const weaknesses = p.weakConcepts || p.weak_concepts
    const style = p.processingStyle || p.processing_style
    const engagement = p.engagementPattern || p.engagement_pattern
    const mastery = p.overallMastery ?? p.overall_mastery
    const sessions = p.totalSessions ?? p.total_sessions
    if (strengths?.length) fields.push(`Strengths: ${strengths.slice(0, 3).join(', ')}`)
    if (weaknesses?.length) fields.push(`Weaknesses: ${weaknesses.slice(0, 3).join(', ')}`)
    if (style) fields.push(`Style: ${style}`)
    if (engagement) fields.push(`Engagement: ${engagement}`)
    if (p.depth != null) fields.push(`Depth: ${p.depth}`)
    if (mastery != null) fields.push(`Mastery: ${mastery}`)
    if (sessions != null) fields.push(`Sessions: ${sessions}`)
    return fields.length > 0 ? fields.join(' | ') : 'Minimal data'
}

// ΓöÇΓöÇΓöÇ Insights Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactInsights(
    insights: InvestigativeInsight[],
    maxItems = 5
): string {
    if (!insights?.length) return 'None'
    return insights
        .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
        .slice(0, maxItems)
        .map(i => `[${i.category}|${(i.confidence * 100).toFixed(0)}%] ${i.title}${i.actionable ? ' (actionable)' : ''}`)
        .join('\n')
}

// ΓöÇΓöÇΓöÇ Profile Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactProfile(
    profile: CognitiveBehavioralProfile
): string {
    const lines = [
        `Thinking: ${profile.thinkingStyle} | Reasoning: ${profile.reasoningApproach}`,
        `Errors: ${profile.errorFingerprint?.dominantType ?? 'unknown'} | Adaptation: ${profile.adaptationRate}`,
        `Difficulty threshold: ${profile.difficultyThreshold} | Comfort: ${profile.comfortZone?.join('-') ?? '?'}`,
        `Confidence calibration: ${profile.confidenceCalibration} | Velocity: ${profile.responseVelocityPattern}`,
        `Persistence: ${profile.persistenceScore ?? '?'}/100`,
    ]
    if (profile.latentStrengths?.length) lines.push(`Latent strengths: ${profile.latentStrengths.slice(0, 3).join(', ')}`)
    if (profile.growthVectors?.length) lines.push(`Growth vectors: ${profile.growthVectors.slice(0, 3).join(', ')}`)
    return lines.join('\n')
}

// ΓöÇΓöÇΓöÇ Patterns Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactPatterns(
    patterns: BehavioralPatternAnalysis
): string {
    if (!patterns?.detectedPatterns?.length) return 'No patterns detected'
    const topPatterns = patterns.detectedPatterns
        .filter(p => p.significance === 'high' || p.significance === 'medium')
        .slice(0, 4)
    if (topPatterns.length === 0) return 'Only low-significance patterns detected'
    return topPatterns
        .map(p => `[${p.significance}|${p.patternType}] ${p.description}`)
        .join('\n')
}

// ΓöÇΓöÇΓöÇ Anomalies Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactAnomalies(
    anomalies: AnomalyAnalysis
): string {
    if (!anomalies?.anomalies?.length) return 'No anomalies detected'
    const top = anomalies.anomalies
        .filter(a => a.investigationPriority === 'high' || a.investigationPriority === 'medium')
        .slice(0, 3)
    if (top.length === 0) return `Session stability: ${anomalies.sessionStability}. No high-priority anomalies.`
    const lines = top.map(a => `[${a.investigationPriority}|${a.type}] ${a.description}`)
    lines.push(`Session stability: ${anomalies.sessionStability} | Anomaly score: ${anomalies.overallAnomalyScore}`)
    if (anomalies.concernFlags?.length) lines.push(`Concerns: ${anomalies.concernFlags.join(', ')}`)
    return lines.join('\n')
}

// ΓöÇΓöÇΓöÇ Cognitive Graph Compaction ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function compactGraph(
    graph: CognitiveGraph | null | undefined
): CompactGraphSnapshot | null {
    if (!graph || !graph.nodes?.length) return null

    // Get the 3 most recent state transitions across all nodes
    const allTransitions = graph.nodes
        .flatMap(n => (n.stateHistory || []).map(t => ({ nodeLabel: n.label, ...t })))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3)

    return {
        nodeCount: graph.nodes.length,
        nodes: graph.nodes.map(n => ({
            id: n.id,
            type: n.type,
            label: n.label,
            confidence: n.confidence,
            state: n.state,
            domain: n.domain,
        })),
        edges: graph.edges.map(e => ({
            source: e.source,
            target: e.target,
            relation: e.relation,
        })),
        recentTransitions: allTransitions,
    }
}

/**
 * Serialize a compact graph snapshot to a token-efficient string for prompt injection.
 * Target: ~300-600 tokens for a typical graph.
 */
export function compactGraphToString(
    snapshot: CompactGraphSnapshot | null
): string {
    if (!snapshot || snapshot.nodeCount === 0) return 'No existing cognitive graph.'

    const nodeLines = snapshot.nodes
        .map(n => `  ${n.id}: [${n.type}|${n.state}|${(n.confidence * 100).toFixed(0)}%] ${n.label}${n.domain ? ` (${n.domain})` : ''}`)
        .join('\n')

    const edgeLines = snapshot.edges.length > 0
        ? snapshot.edges
            .map(e => `  ${e.source} --${e.relation}--> ${e.target}`)
            .join('\n')
        : '  (none)'

    const transitionLines = snapshot.recentTransitions.length > 0
        ? snapshot.recentTransitions
            .map(t => `  "${t.nodeLabel}": ${t.from} ΓåÆ ${t.to} (${t.trigger})`)
            .join('\n')
        : '  (none)'

    return `COGNITIVE GRAPH (${snapshot.nodeCount} nodes):
NODES:
${nodeLines}
EDGES:
${edgeLines}
RECENT STATE CHANGES:
${transitionLines}`
}