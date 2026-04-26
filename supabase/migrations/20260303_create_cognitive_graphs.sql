-- Migration: Create cognitive_graphs table for per-user cognitive graph persistence
-- The graph_data column stores the full CognitiveGraph JSON object.
-- RLS policy ensures users can only read/write their own cognitive graph.

CREATE TABLE IF NOT EXISTS public.cognitive_graphs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    graph_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    node_count INTEGER NOT NULL DEFAULT 0,
    edge_count INTEGER NOT NULL DEFAULT 0,
    session_count INTEGER NOT NULL DEFAULT 0,
    last_session_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cognitive_graphs_user_id ON public.cognitive_graphs(user_id);

-- RLS
ALTER TABLE public.cognitive_graphs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own cognitive graph"
    ON public.cognitive_graphs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cognitive graph"
    ON public.cognitive_graphs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cognitive graph"
    ON public.cognitive_graphs
    FOR UPDATE
    USING (auth.uid() = user_id);
