import { SelfAssessRepository } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseSelfAssessRepo implements SelfAssessRepository {
    async saveSelfAssessment(assessment: { assessment_id: string; user_id: string; subtopic: string; self_rating: number }): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('self_assessments')
            .insert({
                assessment_id: assessment.assessment_id,
                user_id: assessment.user_id,
                subtopic: assessment.subtopic,
                self_rating: assessment.self_rating,
            });

        if (error) throw new Error(`Failed to save self-assessment: ${error.message}`);
    }

    async getSelfAssessments(assessmentId: string): Promise<{ subtopic: string; self_rating: number }[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('self_assessments')
            .select('subtopic, self_rating')
            .eq('assessment_id', assessmentId)
            .order('created_at', { ascending: true });

        if (error) throw new Error(`Failed to get self-assessments: ${error.message}`);
        return (data || []) as { subtopic: string; self_rating: number }[];
    }
}
