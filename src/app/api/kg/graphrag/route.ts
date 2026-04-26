// ─── GraphRAG API Route ──────────────────────────────────────────────
// GET /api/kg/graphrag — enhanced retrieval-augmented KG endpoints.
//
// Query params:
//   ?topic=Trigonometry         — get full GraphRAG context for a topic
//   ?plan=Trigonometry          — get assessment plan with prerequisites
//   ?validate=Trigonometry      — check if topic is valid for assessment
//   ?tree=true&subject=Science  — get hierarchical tree for navigation
//   ?enriched=true&subject=Math — get enriched subgraph (seed + LLM nodes)

import { NextRequest, NextResponse } from 'next/server'
import { getGraphRAGService } from '@/lib/kg/graphrag-service'

export async function GET(request: NextRequest) {
    try {
        const svc = getGraphRAGService()
        const { searchParams } = new URL(request.url)

        const topic = searchParams.get('topic')
        const plan = searchParams.get('plan')
        const validate = searchParams.get('validate')
        const tree = searchParams.get('tree')
        const enriched = searchParams.get('enriched')
        const subject = searchParams.get('subject')

        // 1. Full GraphRAG context for a topic
        if (topic) {
            const context = svc.getContext(topic)
            return NextResponse.json({
                context,
                timestamp: new Date().toISOString(),
            })
        }

        // 2. Assessment plan with prerequisite ordering
        if (plan) {
            const assessmentPlan = svc.getAssessmentPlan(plan)
            if (!assessmentPlan) {
                return NextResponse.json(
                    { error: 'Topic not found in KG or has no assessable concepts', topic: plan },
                    { status: 404 }
                )
            }
            return NextResponse.json({
                plan: assessmentPlan,
                timestamp: new Date().toISOString(),
            })
        }

        // 3. Validate topic for assessment
        if (validate) {
            const result = svc.isTopicValidForAssessment(validate)
            return NextResponse.json({
                validation: result,
                timestamp: new Date().toISOString(),
            })
        }

        // 4. Hierarchical tree for navigation
        if (tree === 'true') {
            const hierarchy = svc.getHierarchicalTree(subject || undefined)
            return NextResponse.json({
                tree: hierarchy,
                timestamp: new Date().toISOString(),
            })
        }

        // 5. Enriched subgraph (seed + LLM nodes)
        if (enriched === 'true') {
            const graph = subject
                ? svc.getEnrichedSubgraph(subject)
                : svc.getFullEnrichedGraph()
            return NextResponse.json({
                graph,
                timestamp: new Date().toISOString(),
            })
        }

        // Default: return capabilities
        return NextResponse.json({
            endpoints: {
                '?topic=X': 'Full GraphRAG context for assessment',
                '?plan=X': 'Assessment plan with prerequisite ordering',
                '?validate=X': 'Check topic validity for assessment',
                '?tree=true&subject=X': 'Hierarchical tree for navigation',
                '?enriched=true&subject=X': 'Enriched subgraph with LLM nodes',
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[GraphRAG API] Error:', error)
        return NextResponse.json(
            { error: 'GraphRAG service error', detail: error.message },
            { status: 500 }
        )
    }
}
