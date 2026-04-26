import { KnowledgeRepository, TopicSubtopics, KnowledgeGap } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseKnowledgeRepo implements KnowledgeRepository {
    async getSubtopics(topic: string): Promise<TopicSubtopics | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('topic_subtopics')
            .select('*')
            .eq('topic', topic) // Fixed: was 'topic_id' (wrong column)
            .single();

        if (error && error.code === 'PGRST116') return null; // Not cached yet
        if (error) throw new Error(`Failed to get subtopics: ${error.message}`);
        return data as TopicSubtopics;
    }

    async saveSubtopics(topic: string, subtopics: string[]): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('topic_subtopics')
            .upsert({
                topic,
                subtopics,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'topic' });

        if (error) throw new Error(`Failed to save subtopics: ${error.message}`);
    }

    async getPrerequisites(topicId: string): Promise<{ prerequisite_tree: Record<string, unknown>; concepts_list: string[] } | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('prerequisite_cache')
            .select('prerequisite_tree, concepts_list')
            .eq('topic', topicId) // Fixed: was 'topic_id' (wrong column)
            .single();

        if (error && error.code === 'PGRST116') return null;
        if (error) throw new Error(`Failed to get prerequisites: ${error.message}`);
        return data;
    }

    async logKnowledgeGap(userId: string, gapData: Omit<KnowledgeGap, 'id'>): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('knowledge_gaps')
            .insert({
                user_id: userId,
                assessment_id: gapData.assessment_id,
                concept: gapData.concept,
                mastery_score: gapData.mastery_score,
                gap_severity: gapData.gap_severity,
                related_prerequisites: gapData.related_prerequisites,
                error_patterns: gapData.error_patterns,
                addressed: gapData.addressed || false,
            });

        if (error) throw new Error(`Failed to log knowledge gap: ${error.message}`);
    }

    async getKnowledgeGaps(userId: string, topic?: string): Promise<KnowledgeGap[]> {
        const supabase = await createClient();
        let query = supabase
            .from('knowledge_gaps')
            .select('*')
            .eq('user_id', userId)
            .eq('addressed', false);

        if (topic) {
            query = query.eq('concept', topic);
        }

        const { data, error } = await query.order('identified_at', { ascending: false });

        if (error) throw new Error(`Failed to get knowledge gaps: ${error.message}`);
        return (data || []) as KnowledgeGap[];
    }
}
