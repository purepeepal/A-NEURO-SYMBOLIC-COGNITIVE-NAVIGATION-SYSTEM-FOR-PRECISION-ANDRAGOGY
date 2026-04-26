// ─── KG Node Detail API Route ───────────────────────────────────────
// GET /api/kg/node?id=math.trigonometry — returns detailed node info.

import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumGraph } from '@/lib/kg'

export async function GET(request: NextRequest) {
    try {
        const graph = getCurriculumGraph()
        const { searchParams } = new URL(request.url)
        const nodeId = searchParams.get('id')

        if (!nodeId) {
            return NextResponse.json(
                { error: 'Missing required parameter: id' },
                { status: 400 }
            )
        }

        const detail = graph.getNodeDetail(nodeId)
        if (!detail) {
            return NextResponse.json(
                { error: 'Node not found', nodeId },
                { status: 404 }
            )
        }

        // Also get prerequisites and related for richer UI
        const prerequisites = graph.getPrerequisites(nodeId)
        const related = graph.getRelated(nodeId)

        return NextResponse.json({
            ...detail,
            prerequisites: prerequisites.map(p => ({
                id: p.node.id,
                label: p.node.label,
                type: p.node.type,
                weight: p.weight,
                rationale: p.rationale,
            })),
            related: related.map(r => ({
                id: r.node.id,
                label: r.node.label,
                type: r.node.type,
                relation: r.relation,
                weight: r.weight,
                rationale: r.rationale,
            })),
            timestamp: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[KG Node API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to load node detail', detail: error.message },
            { status: 500 }
        )
    }
}
