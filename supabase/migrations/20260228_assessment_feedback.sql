-- Migration: 20260228_assessment_feedback.sql
-- Description: Creates the assessment_feedback table for user-submitted feedback on questions.
-- Architecture Unit: 05_Data_Persistence
-- Critical Fix: This table was referenced in SupabaseContentRepo.ts but had no migration.

CREATE TABLE IF NOT EXISTS public.assessment_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    question_id UUID,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('incorrect_answer', 'unclear_question', 'wrong_difficulty', 'too_easy', 'too_hard', 'other')),
    feedback_text TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_feedback_session ON public.assessment_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_feedback_user ON public.assessment_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_feedback_unresolved ON public.assessment_feedback(resolved) WHERE resolved = false;

-- RLS
ALTER TABLE public.assessment_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
    ON public.assessment_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
    ON public.assessment_feedback
    FOR SELECT
    USING (auth.uid() = user_id);
