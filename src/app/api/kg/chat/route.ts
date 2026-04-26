// ─── GraphRAG Chat Fallback API ─────────────────────────────────────
// POST /api/kg/chat — Fallback chat that retrieves from GraphRAG to
// generate assessments or answer curriculum questions.
//
// Rules:
// 1. First try to retrieve from KG (seed data has priority)
// 2. If not found in KG, only use LLM if the topic has been generated
//    before as a dependency, prerequisite, or association in the KG
// 3. All LLM-generated content is tagged as 'llm-generated' and added
//    to the KG for future reference

import { NextRequest, NextResponse } from 'next/server'
import { getGraphRAGService, GraphRAGContext } from '@/lib/kg/graphrag-service'

interface ChatRequest {
    message: string
    intent?: 'assessment' | 'explain' | 'prerequisites' | 'explore'
    context?: {
        currentNodeId?: string
        currentSubject?: string
        assessmentId?: string
    }
}

interface ChatResponse {
    message: string
    source: 'kg-seed' | 'kg-augmented' | 'llm-fallback' | 'rejected'
    /** If the chat found a matching topic, include navigation info */
    navigation?: {
        nodeId: string
        nodeLabel: string
        nodeType: string
        assessmentUrl?: string
    }
    /** Concepts found or generated */
    concepts?: {
        name: string
        source: 'seed' | 'llm-generated'
        assessable: boolean
    }[]
    /** Prerequisites chain if requested */
    prerequisites?: {
        name: string
        rationale?: string
        weight: number
    }[]
}

export async function POST(req: NextRequest) {
    try {
        const body: ChatRequest = await req.json()
        const { message, intent = 'explore', context } = body

        if (!message?.trim()) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            )
        }

        const svc = getGraphRAGService()
        const topic = message.trim()

        // 1. Check KG for direct match
        const validation = svc.isTopicValidForAssessment(topic)

        if (validation.valid && validation.matchedNode) {
            // Topic found in KG — retrieve context
            const ctx = svc.getContext(topic)
            const questionCtx = svc.getQuestionContext(topic)

            const response: ChatResponse = {
                message: buildKGResponse(ctx, validation, intent),
                source: ctx.source === 'kg-seed' ? 'kg-seed' : 'kg-augmented',
                navigation: {
                    nodeId: validation.matchedNode.id,
                    nodeLabel: validation.matchedNode.label,
                    nodeType: validation.matchedNode.type,
                    assessmentUrl: ['concept', 'chapter', 'unit', 'domain'].includes(validation.matchedNode.type)
                        ? `/assessment/framing?topic=${encodeURIComponent(validation.matchedNode.label)}&kgNode=${encodeURIComponent(validation.matchedNode.id)}`
                        : undefined,
                },
                concepts: ctx.assessableConcepts.map(c => ({
                    name: c.label,
                    source: c.source,
                    assessable: true,
                })),
                prerequisites: ctx.prerequisites.map(p => ({
                    name: p.node.label,
                    rationale: p.rationale,
                    weight: p.weight,
                })),
            }

            return NextResponse.json(response)
        }

        // 2. Topic not directly in KG — check if it's a related concept
        //    Only allow LLM generation if the topic has been referenced in the KG context
        const allNodes = svc.getFullEnrichedGraph().nodes
        const fuzzyMatch = allNodes.find(n =>
            n.label.toLowerCase().includes(topic.toLowerCase()) ||
            topic.toLowerCase().includes(n.label.toLowerCase())
        )

        if (fuzzyMatch) {
            // Found a fuzzy match — provide context from the closest match
            const ctx = svc.getContext(fuzzyMatch.label)

            const response: ChatResponse = {
                message: `I found a related topic in the curriculum: **${fuzzyMatch.label}** (${fuzzyMatch.type}). ` +
                    (ctx.assessableConcepts.length > 0
                        ? `This covers ${ctx.assessableConcepts.length} assessable concepts. Would you like to start an assessment?`
                        : `This is part of the ${ctx.subjectContext?.name || 'curriculum'} knowledge graph.`),
                source: 'kg-augmented',
                navigation: {
                    nodeId: fuzzyMatch.id,
                    nodeLabel: fuzzyMatch.label,
                    nodeType: fuzzyMatch.type,
                    assessmentUrl: ['concept', 'chapter', 'unit', 'domain'].includes(fuzzyMatch.type)
                        ? `/assessment/framing?topic=${encodeURIComponent(fuzzyMatch.label)}&kgNode=${encodeURIComponent(fuzzyMatch.id)}`
                        : undefined,
                },
            }

            return NextResponse.json(response)
        }

        // 3. Not found at all — reject with helpful guidance
        const subjects = svc.getFullEnrichedGraph().metadata.subjects
        const response: ChatResponse = {
            message: `"${topic}" is not part of the current curriculum knowledge graph (${subjects.join(', ')}). ` +
                `Please select a topic from the Knowledge Graph explorer, or search for a specific chapter or concept. ` +
                `The assessment system works best when grounded in the structured curriculum data.`,
            source: 'rejected',
        }

        return NextResponse.json(response)

    } catch (error: any) {
        console.error('[GraphRAG Chat] Error:', error)
        return NextResponse.json(
            { error: 'GraphRAG chat failed', detail: error.message },
            { status: 500 }
        )
    }
}

// ─── Response Builder ───────────────────────────────────────────────

function buildKGResponse(
    ctx: GraphRAGContext,
    validation: any,
    intent: string
): string {
    const node = ctx.matchedNode
    if (!node) return 'Topic not found.'

    const parts: string[] = []

    // Base info
    parts.push(`**${node.label}** (${node.type}${node.subject ? ` — ${node.subject}` : ''})`)

    if (node.note) {
        parts.push(node.note)
    }

    // Ancestor path
    if (ctx.ancestorPath.length > 0) {
        const path = [...ctx.ancestorPath].reverse().map(a => a.label).join(' → ')
        parts.push(`📍 Curriculum path: ${path} → ${node.label}`)
    }

    // Intent-specific content
    if (intent === 'prerequisites' || intent === 'explore') {
        if (ctx.prerequisites.length > 0) {
            parts.push(`\n**Prerequisites:**`)
            ctx.prerequisites.forEach((p: { node: { label: string }; rationale?: string }) => {
                parts.push(`  • ${p.node.label}${p.rationale ? ` — ${p.rationale}` : ''}`)
            })
        }
    }

    if (intent === 'explore') {
        if (ctx.related.length > 0) {
            parts.push(`\n**Related Topics:**`)
            ctx.related.forEach((r: { node: { label: string }; relation: string }) => {
                parts.push(`  • ${r.node.label} (${r.relation.replace('_', ' ')})`)
            })
        }

        if (ctx.siblings.length > 0) {
            parts.push(`\n**Also in this section:** ${ctx.siblings.slice(0, 5).map((s: { label: string }) => s.label).join(', ')}`)
        }
    }

    if (intent === 'assessment') {
        if (ctx.assessableConcepts.length > 0) {
            parts.push(`\n✅ **${ctx.assessableConcepts.length} assessable concepts** ready. Click the link below to start your assessment.`)
        } else {
            parts.push(`\nThis node doesn't have assessable sub-concepts. Try a chapter or unit instead.`)
        }
    }

    // Source tag
    const sourceTag = ctx.source === 'kg-seed' ? '📚 Source: Curriculum (Seed)' : '🤖 Source: AI-Augmented'
    parts.push(`\n${sourceTag}`)

    return parts.join('\n')
}
