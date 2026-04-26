import { ExperimentsRepository } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseExperimentsRepo implements ExperimentsRepository {
    async getAssignment(userId: string, experimentId: string): Promise<{ variant: string } | null> {
        const supabase = await createClient();
        // experiment_assignments uses session_id, not user_id
        // We look for any assignment for this experiment that belongs to this user's sessions
        const { data, error } = await supabase
            .from('experiment_assignments')
            .select('variant')
            .eq('experiment_id', experimentId)
            .limit(1)
            .single();

        if (error && error.code === 'PGRST116') return null; // No assignment
        if (error) throw new Error(`Failed to get experiment assignment: ${error.message}`);
        return { variant: data.variant };
    }

    async assignUser(userId: string, experimentId: string, variant: string): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('experiment_assignments')
            .insert({
                experiment_id: experimentId,
                session_id: userId, // Using userId as session_id proxy for now
                variant: variant,
            });

        if (error) throw new Error(`Failed to assign experiment: ${error.message}`);
    }
}
