import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database'
import type { UserPersonaRow } from '@/types/db-rows'
import type { EvaluateAnswerResult } from '@/lib/llm/types'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'persona-engine' })

export class PersonaEngine {
    async initializePersona(userId: string) {
        const supabase = await createClient()
        try {
            const { error: personaError } = await supabase
                .from('user_personas')
                .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })

            if (personaError) {
                logger.warn('User Persona table might be missing or error init:', { detail: personaError.message })
            }
        } catch (e) {
            logger.warn('Skipping User Persona init - likely migration not run.')
        }
    }

    async getPersona(userId: string): Promise<UserPersonaRow | undefined> {
        const supabase = await createClient()
        try {
            const { data, error } = await supabase
                .from('user_personas')
                .select('*')
                .eq('user_id', userId)
                .single()
            if (!error && data) return data
        } catch (e) {
            return undefined
        }
        return undefined
    }

    async applyEvaluationUpdates(userId: string, evaluation: EvaluateAnswerResult, currentPersona: UserPersonaRow | undefined) {
        if (!evaluation.personaUpdates || !currentPersona) return

        const supabase = await createClient()
        const updates = evaluation.personaUpdates
        const clamp = (n: number) => Math.max(0, Math.min(100, n))
        const personaUpdatePayload: Partial<UserPersonaRow> = {}

        if (updates.depth) personaUpdatePayload.depth = clamp((currentPersona.depth || 0) + updates.depth)
        if (updates.breadth) personaUpdatePayload.breadth = clamp((currentPersona.breadth || 0) + updates.breadth)
        if (updates.creativity) personaUpdatePayload.creativity = clamp((currentPersona.creativity || 0) + updates.creativity)
        if (updates.persistence) personaUpdatePayload.persistence = clamp((currentPersona.persistence || 0) + updates.persistence)
        if (updates.curiosity) personaUpdatePayload.curiosity = clamp((currentPersona.curiosity || 0) + updates.curiosity)

        if (updates.strongConcepts?.length) {
            const current = new Set(currentPersona.strong_concepts || [])
            updates.strongConcepts.forEach((c: string) => current.add(c))
            personaUpdatePayload.strong_concepts = Array.from(current)
        }
        if (updates.weakConcepts?.length) {
            const current = new Set(currentPersona.weak_concepts || [])
            updates.weakConcepts.forEach((c: string) => current.add(c))
            personaUpdatePayload.weak_concepts = Array.from(current)
        }

        if (Object.keys(personaUpdatePayload).length > 0) {
            await supabase
                .from('user_personas')
                .update(personaUpdatePayload)
                .eq('user_id', userId)
        }
    }
}

export const personaEngine = new PersonaEngine()
