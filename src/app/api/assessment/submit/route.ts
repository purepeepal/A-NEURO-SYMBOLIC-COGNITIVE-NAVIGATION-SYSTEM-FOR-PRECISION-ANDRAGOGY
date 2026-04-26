import { NextRequest, NextResponse } from 'next/server'
import { assessmentFlow } from '@/lib/assessment/flow'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
        const { assessmentId, questionId, userAnswer, timeTakenSeconds, confidenceLevel } = await request.json()

        // Basic validation
        if (!assessmentId || !questionId || userAnswer === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const result = await assessmentFlow.saveAnswerFast(
            assessmentId,
            questionId,
            userAnswer,
            timeTakenSeconds || 0,
            confidenceLevel || 2  // Default to "Somewhat" if not provided
        )
        return NextResponse.json(result)
    } catch (error) {
        console.error("Submit Answer Error:", error)
        return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 })
    }
}
