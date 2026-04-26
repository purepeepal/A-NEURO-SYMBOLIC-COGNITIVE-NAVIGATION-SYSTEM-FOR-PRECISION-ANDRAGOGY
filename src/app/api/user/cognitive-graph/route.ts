import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { errorResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import type { CognitiveGraph } from '@/lib/cognitive-graph/types'

const logger = createLogger({ requestId: 'api-cognitive-graph' })

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return errorResponse('MISSING_USER', 'Unauthorized', 401)
        }

        const { data, error } = await supabase
            .from('cognitive_graphs')
            .select('graph_data, node_count, edge_count, session_count, last_session_id, updated_at')
            .eq('user_id', user.id)
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = row not found ΓÇö that's fine, return null graph
            logger.error('Failed to fetch cognitive graph:', error instanceof Error ? error : undefined)
            return errorResponse('GRAPH_FETCH_FAILED', 'Failed to fetch cognitive graph', 500)
        }

        if (!data) {
            return NextResponse.json({ graph: null })
        }

        return NextResponse.json({
            graph: data.graph_data as CognitiveGraph,
            meta: {
                nodeCount: data.node_count,
                edgeCount: data.edge_count,
                sessionCount: data.session_count,
                lastSessionId: data.last_session_id,
                updatedAt: data.updated_at,
            },
        })
    } catch (err) {
        logger.error('Cognitive graph fetch error:', err instanceof Error ? err : undefined)
        return errorResponse('GRAPH_FETCH_FAILED', 'Internal Server Error', 500)
    }
}