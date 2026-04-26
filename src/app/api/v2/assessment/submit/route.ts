// src/app/api/v2/assessment/submit/route.ts
import { NextResponse } from 'next/server';
import { validateBody, handleApiError, SubmitAnswerSchema } from '@/lib/api/middleware/validate';
import { getAssessmentEngine } from '@/lib/api/di';
import { createClient } from '@/lib/infrastructure/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await validateBody(req, SubmitAnswerSchema);

        // Optionally verify session belongs to user here via DB check, 
        // but RLS on responses insertion will also catch it.

        const engine = getAssessmentEngine();

        const result = await engine.submitAnswer({
            sessionId: body.sessionId,
            questionId: body.questionId,
            userAnswer: body.userAnswer,
            timeTakenMs: body.timeTakenMs,
            reportedConfidence: body.reportedConfidence,
            biometricEvents: body.biometricEvents
        });

        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error);
    }
}
