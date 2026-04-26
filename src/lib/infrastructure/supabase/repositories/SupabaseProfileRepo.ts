import { ProfileRepository, UserProfile, PersonaMetrics, ProgressSnapshot } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseProfileRepo implements ProfileRepository {
    async getProfile(userId: string): Promise<UserProfile | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code === 'PGRST116') return null; // Not found
        if (error) throw new Error(`Failed to get profile: ${error.message}`);
        return data as UserProfile;
    }

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw new Error(`Failed to update profile: ${error.message}`);
    }

    async getPersona(userId: string): Promise<PersonaMetrics | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('user_personas')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') return null; // New user, no persona yet
        if (error) throw new Error(`Failed to get persona: ${error.message}`);
        return data as PersonaMetrics;
    }

    async updatePersona(userId: string, updates: Partial<PersonaMetrics>): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('user_personas')
            .upsert({ user_id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        if (error) throw new Error(`Failed to update persona: ${error.message}`);
    }

    async saveSnapshot(snapshot: ProgressSnapshot): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('progress_snapshots')
            .insert({
                learner_id: snapshot.learner_id,
                topic: snapshot.topic,
                concept: snapshot.concept,
                mastery_level: snapshot.mastery_level,
                accuracy: snapshot.accuracy,
                blooms_depth: snapshot.blooms_depth,
                calibration_delta: snapshot.calibration_delta,
                session_id: snapshot.session_id,
            });

        if (error) throw new Error(`Failed to save progress snapshot: ${error.message}`);
    }

    async awardBadge(userId: string, badgeData: { session_id: string; badge_type: string; topic: string; metadata?: Record<string, unknown> }): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('badges')
            .insert({
                session_id: badgeData.session_id,
                badge_type: badgeData.badge_type,
                topic: badgeData.topic,
                metadata: badgeData.metadata || {},
            });

        if (error) throw new Error(`Failed to award badge: ${error.message}`);
    }
}
