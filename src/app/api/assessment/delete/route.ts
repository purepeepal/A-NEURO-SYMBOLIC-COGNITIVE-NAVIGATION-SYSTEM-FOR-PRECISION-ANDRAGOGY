import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { assessmentId } = await req.json()

        if (!assessmentId) {
            return NextResponse.json({ error: 'Assessment ID is required' }, { status: 400 })
        }

        // Delete responses first (foreign key constraint)
        const { error: respError } = await supabase
            .from('responses')
            .delete()
            .eq('assessment_id', assessmentId)

        if (respError) throw respError

        // Delete session analytics
        await supabase
            .from('session_analytics')
            .delete()
            .eq('session_id', assessmentId)

        // Delete the assessment itself (only if owned by user)
        const { error } = await supabase
            .from('assessments')
            .delete()
            .eq('id', assessmentId)
            .eq('user_id', user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete assessment error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
