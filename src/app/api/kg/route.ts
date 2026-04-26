// ─── KG API Route ───────────────────────────────────────────────────
// GET /api/kg — returns the full curriculum graph or a subject subgraph.
// Query params:
//   ?subject=Mathematics   — filter to one subject
//   ?search=trigonometry    — fuzzy search nodes

import { NextRequest, NextResponse } from 'next/server'
import { getCurriculumGraph } from '@/lib/kg'

export async function GET(request: NextRequest) {
    try {
        const graph = getCurriculumGraph()
        const { searchParams } = new URL(request.url)
        const subject = searchParams.get('subject')
        const search = searchParams.get('search')

        if (search) {
            const results = graph.searchNodes(search)
            return NextResponse.json({
                results,
                count: results.length,
                timestamp: new Date().toISOString(),
            })
        }

        if (subject) {
            const subgraph = graph.getSubgraph(subject)
            return NextResponse.json({
                graph: subgraph,
                timestamp: new Date().toISOString(),
            })
        }

        // Full graph
        const data = graph.toGraphData()
        return NextResponse.json({
            graph: data,
            timestamp: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[KG API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to load knowledge graph', detail: error.message },
            { status: 500 }
        )
    }
}
