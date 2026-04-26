import { createClient } from '@/lib/supabase/server'
import { gemini } from '@/lib/llm'
import { AssessmentState } from './engine'
import { MicroAnalysisResult, LearningSnippet, UserPersona } from '@/lib/llm/types'
import { ResponseRow } from '@/types/db-rows'

/**
 * Generate a brief, personalized learning snippet following a question response.
 * Tied to C3 cognitive science principles (retrieval practice, elaboration, perspective shift).
 * This runs primarily driven by triggers produced by the micro-analysis of the user's answer.
 */
export async function generateAndCacheLearningSnippet(
    assessmentId: string,
    questionId: string,
    state: AssessmentState,
    lastResponse: Partial<ResponseRow>,
    microAnalysis: MicroAnalysisResult,
    userPersona: Partial<UserPersona> | null
): Promise<LearningSnippet | null> {
    if (!microAnalysis.snippetTrigger) {
        // No snippet needed right now
        return null;
    }

    if (!gemini.generateLearningSnippet) {
        console.warn('generateLearningSnippet not available on LLM provider')
        return null
    }

    try {
        // Generate snippet via LLM Orchestrator
        const snippet = await gemini.generateLearningSnippet(state, lastResponse, microAnalysis, userPersona)
        
        if (snippet) {
            // Persist snippet to the database asynchronously (fire-and-forget or awaited)
            try {
                const supabase = await createClient()
                await supabase.from('learning_snippets').insert({
                    assessment_id: assessmentId,
                    question_id: questionId,
                    snippet_type: snippet.type,
                    title: snippet.title,
                    content: snippet.content,
                    related_concept: snippet.relatedConcept,
                    meta_learning_practice: snippet.metaLearningPractice,
                    source_evidence: snippet.sourceEvidence
                })
            } catch (dbError) {
                console.error('Failed to persist learning snippet to database:', dbError)
            }
            return snippet
        }
    } catch (error) {
        console.error('Failed to generate learning snippet via LLM:', error)
    }
    
    return null
}
