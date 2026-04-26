import { createClient } from '@/lib/supabase/server'
import { PrerequisiteTree, GeneratedQuestion } from './types'
import { LLM_CONFIG } from './config'
import { createLogger } from '@/lib/logger'

const logger = createLogger({ requestId: 'cache' })

/**
 * Cache service for LLM-generated content
 * Uses Supabase for persistence
 */

export interface CachedPrerequisites {
    tree: PrerequisiteTree
    expiresAt: Date
}

class QuestionCache {
    /**
     * Get cached prerequisite tree for a topic
     */
    async getPrerequisiteTree(topic: string): Promise<PrerequisiteTree | null> {
        const supabase = await createClient()

        const normalizedTopic = this.normalizeTopic(topic)

        // Check if table exists (handled by try/catch in case of schema issues)
        try {
            const { data, error } = await supabase
                .from('prerequisite_cache')
                .select('prerequisite_tree, expires_at')
                .eq('topic', normalizedTopic)
                .single()

            if (error || !data) return null

            // Check if expired
            if (new Date(data.expires_at) < new Date()) {
                // Optionally delete expired entry
                await supabase
                    .from('prerequisite_cache')
                    .delete()
                    .eq('topic', normalizedTopic)
                return null
            }

            return data.prerequisite_tree as PrerequisiteTree
        } catch (e) {
            logger.warn('Cache lookup failed:', { detail: String(e) })
            return null
        }
    }

    /**
     * Cache a prerequisite tree
     */
    async setPrerequisiteTree(topic: string, tree: PrerequisiteTree): Promise<void> {
        const supabase = await createClient()

        const normalizedTopic = this.normalizeTopic(topic)
        const expiresAt = new Date(Date.now() + LLM_CONFIG.cache.prerequisiteTreeTTL)

        const { error } = await supabase
            .from('prerequisite_cache')
            .upsert({
                topic: normalizedTopic,
                prerequisite_tree: tree as any,
                concepts_list: tree.concepts.map(c => c.name),
                expires_at: expiresAt.toISOString(),
            }, { onConflict: 'topic' })

        if (error && error.code !== '23505') {
            logger.error('Failed to cache prerequisite tree:', error)
        }
    }

    /**
     * Normalize topic names for consistent caching
     */
    private normalizeTopic(topic: string): string {
        return topic
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
    }

    /**
     * Pre-seed common topics cache
     * Call this during app initialization or as a background job
     */
    async preSeedCommonTopics(): Promise<string[]> {
        const commonTopics = [
            'Calculus',
            'Linear Algebra',
            'Python Programming',
            'Data Structures',
            'Algorithms',
            'Statistics',
            'Probability',
            'Machine Learning Basics',
            'JavaScript',
            'React.js',
        ]

        const seeded: string[] = []

        for (const topic of commonTopics) {
            const existing = await this.getPrerequisiteTree(topic)
            if (!existing) {
                // This will be called by the gemini service when generating
                seeded.push(topic)
            }
        }

        return seeded
    }
}

export const questionCache = new QuestionCache()
