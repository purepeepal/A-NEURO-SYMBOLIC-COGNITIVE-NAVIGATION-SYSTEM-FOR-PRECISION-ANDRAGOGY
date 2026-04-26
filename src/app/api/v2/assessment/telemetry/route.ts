// src/app/api/v2/assessment/telemetry/route.ts
import { NextResponse } from 'next/server';
import { validateBody, handleApiError, TelemetrySchema } from '@/lib/api/middleware/validate';
import { SupabaseTelemetryRepo } from '@/lib/infrastructure/supabase/repositories/SupabaseTelemetryRepo';
import { createClient } from '@/lib/infrastructure/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await validateBody(req, TelemetrySchema);

        // This is a high-volume passive write.
        // We do *not* use AssessmentEngine here to avoid unnecessary instantiations.
        // We write directly to the Unit 5 TelemetryRepo.
        const telemetryRepo = new SupabaseTelemetryRepo();

        await telemetryRepo.logBiometrics({
            session_id: body.sessionId,
            event_type: 'passive_telemetry_batch',
            payload: { events: body.events }
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return handleApiError(error);
    }
}
