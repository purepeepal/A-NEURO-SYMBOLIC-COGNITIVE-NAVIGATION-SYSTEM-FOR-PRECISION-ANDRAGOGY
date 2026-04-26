// src/app/api/v2/assessment/start/route.ts
import { NextResponse } from 'next/server';
import { validateBody, handleApiError, StartAssessmentSchema } from '@/lib/api/middleware/validate';
import { getAssessmentEngine } from '@/lib/api/di';
import { createClient } from '@/lib/infrastructure/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await validateBody(req, StartAssessmentSchema);
        const engine = getAssessmentEngine();

        const result = await engine.startSession({
            userId: user.id,
            objectiveId: body.objectiveId,
            targetDifficulty: body.difficultyLimit
        });

        return NextResponse.json(result);
    } catch (error) {
        return handleApiError(error);
    }
}
