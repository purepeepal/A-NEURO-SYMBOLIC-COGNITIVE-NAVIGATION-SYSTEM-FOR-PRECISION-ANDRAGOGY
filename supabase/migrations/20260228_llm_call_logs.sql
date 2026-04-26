-- Migration: 20260228_llm_call_logs.sql
-- Description: Creates the llm_call_logs table for tracking LLM API usage and costs.
-- Architecture Unit: 05_Data_Persistence
-- Schema aligned with src/lib/llm/cost-tracker.ts CostTracker.logCall()

-- Drop old table if it exists with wrong schema (session_id instead of assessment_id)
DROP TABLE IF EXISTS public.llm_call_logs CASCADE;

CREATE TABLE public.llm_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL,        -- 'question_generation', 'answer_evaluation', etc.
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    model TEXT NOT NULL,              -- 'gemini-2.0-flash', 'llama-3.3-70b-versatile'
    duration_ms INTEGER,
    parse_success BOOLEAN DEFAULT true,
    attempt_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_assessment ON public.llm_call_logs(assessment_id);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_prompt_type ON public.llm_call_logs(prompt_type, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_parse_failures ON public.llm_call_logs(parse_success) WHERE parse_success = false;

-- RLS
ALTER TABLE public.llm_call_logs ENABLE ROW LEVEL SECURITY;

-- Server-side inserts via the CostTracker (service role or user context)
CREATE POLICY "System can insert LLM call logs"
    ON public.llm_call_logs
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view LLM call logs for their assessments"
    ON public.llm_call_logs
    FOR SELECT
    USING (
        assessment_id IN (
            SELECT id FROM public.assessments WHERE user_id = auth.uid()
        )
    );
