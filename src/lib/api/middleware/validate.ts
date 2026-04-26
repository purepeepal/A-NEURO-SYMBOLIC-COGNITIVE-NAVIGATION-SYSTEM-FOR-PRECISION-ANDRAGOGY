// src/lib/api/middleware/validate.ts
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const StartAssessmentSchema = z.object({
    objectiveId: z.string(), // Can be a UUID or a Topic Name
    difficultyLimit: z.number().min(1).max(10).optional().default(5)
});

export const SubmitAnswerSchema = z.object({
    sessionId: z.string().uuid(),
    questionId: z.string().uuid(),
    userAnswer: z.string(),
    timeTakenMs: z.number().min(0),
    reportedConfidence: z.number().min(1).max(4).optional(),
    biometricEvents: z.array(z.object({
        type: z.enum(['mousemove', 'click', 'focus', 'blur']),
        timestamp: z.number(),
        x: z.number().optional(),
        y: z.number().optional()
    })).optional()
});

export const TelemetrySchema = z.object({
    sessionId: z.string().uuid(),
    events: z.array(z.object({
        type: z.enum(['mousemove', 'click', 'focus', 'blur']),
        timestamp: z.number(),
        x: z.number().optional(),
        y: z.number().optional()
    }))
});

/**
 * Validates request body against a Zod schema.
 * Throws a formatted error if parsing fails, which should be caught by route handler.
 */
export async function validateBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
    const body = await req.json();
    return schema.parse(body);
}

export function handleApiError(error: any) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 });
    }
    console.error('[API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
