-- Migration for Meta-Learning Session Redesign

CREATE TABLE IF NOT EXISTS learning_snippets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id),
    question_id UUID REFERENCES responses(id),
    snippet_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_concept TEXT NOT NULL,
    meta_learning_practice TEXT NOT NULL,
    source_evidence TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by assessment and question
CREATE INDEX IF NOT EXISTS idx_learning_snippets_assessment_id ON learning_snippets(assessment_id);
CREATE INDEX IF NOT EXISTS idx_learning_snippets_question_id ON learning_snippets(question_id);

CREATE TABLE IF NOT EXISTS perspective_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    assessment_id UUID REFERENCES assessments(id),
    current_domain TEXT NOT NULL,
    suggested_domain TEXT NOT NULL,
    rationale TEXT NOT NULL,
    bridge_concept TEXT NOT NULL,
    status TEXT DEFAULT 'pending',       -- pending | explored | dismissed
    explored_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_perspective_suggestions_user_id ON perspective_suggestions(user_id);
