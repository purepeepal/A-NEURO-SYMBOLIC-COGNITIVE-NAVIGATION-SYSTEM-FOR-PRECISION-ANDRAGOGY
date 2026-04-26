import { NextResponse } from 'next/server'
import { gemini } from '@/lib/llm'

export async function GET() {
    try {
        // Test prerequisite tree generation
        const tree = await gemini.generatePrerequisiteTree('Basic Algebra')

        return NextResponse.json({
            success: true,
            tree,
            provider: gemini.name
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 })
    }
}
