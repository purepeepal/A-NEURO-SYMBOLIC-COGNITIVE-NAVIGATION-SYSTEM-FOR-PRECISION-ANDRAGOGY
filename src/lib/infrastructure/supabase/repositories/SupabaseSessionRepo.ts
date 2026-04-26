import { SessionRepository, Session, SessionConfig, ResponseRecord } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseSessionRepo implements SessionRepository {
    async createSession(userId: string, objectiveId: string, config: SessionConfig): Promise<Session> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('assessments')
            .insert({
                user_id: userId,
                topic: objectiveId,
                status: 'in_progress',
                current_difficulty: config.targetDifficulty,
            })
            .select()
            .single();

        if (error) throw new Error(`Failed to create session: ${error.message}`);

        // Map DB row to our domain Session type
        return {
            id: data.id,
            user_id: data.user_id,
            objective_uid: data.topic,
            topic: data.topic,
            status: data.status,
            config_snapshot: config,
            current_question_id: undefined,
            total_questions: data.total_questions || 0,
            correct_count: data.correct_count || 0,
            current_difficulty: data.current_difficulty || config.targetDifficulty,
            consecutive_correct: data.consecutive_correct || 0,
            consecutive_incorrect: data.consecutive_incorrect || 0,
            started_at: data.started_at,
            completed_at: data.completed_at,
        };
    }

    async getSession(sessionId: string): Promise<Session> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (error) throw new Error(`Failed to get session: ${error.message}`);

        return {
            id: data.id,
            user_id: data.user_id,
            objective_uid: data.topic,
            topic: data.topic,
            status: data.status,
            config_snapshot: data.config_snapshot || { initialAbility: 0, targetDifficulty: 5 },
            current_question_id: data.current_question_id,
            total_questions: data.total_questions || 0,
            correct_count: data.correct_count || 0,
            current_difficulty: data.current_difficulty || 5,
            consecutive_correct: data.consecutive_correct || 0,
            consecutive_incorrect: data.consecutive_incorrect || 0,
            started_at: data.started_at,
            completed_at: data.completed_at,
        };
    }

    async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
        const supabase = await createClient();
        // Map domain fields to DB columns
        const dbUpdates: Record<string, unknown> = {};
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.current_difficulty !== undefined) dbUpdates.current_difficulty = updates.current_difficulty;
        if (updates.total_questions !== undefined) dbUpdates.total_questions = updates.total_questions;
        if (updates.correct_count !== undefined) dbUpdates.correct_count = updates.correct_count;
        if (updates.consecutive_correct !== undefined) dbUpdates.consecutive_correct = updates.consecutive_correct;
        if (updates.consecutive_incorrect !== undefined) dbUpdates.consecutive_incorrect = updates.consecutive_incorrect;
        if (updates.current_question_id !== undefined) dbUpdates.current_question_id = updates.current_question_id;
        if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at;
        if (updates.config_snapshot !== undefined) dbUpdates.config_snapshot = updates.config_snapshot;

        const { error } = await supabase
            .from('assessments')
            .update(dbUpdates)
            .eq('id', sessionId);

        if (error) throw new Error(`Failed to update session: ${error.message}`);
    }

    async saveResponse(sessionId: string, response: ResponseRecord): Promise<void> {
        const supabase = await createClient();

        // Get current question count for question_number
        const { count } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('assessment_id', sessionId);

        const questionNumber = (count || 0) + 1;

        const { error } = await supabase
            .from('responses')
            .insert({
                assessment_id: sessionId,
                question_number: questionNumber,
                question_id: response.question_id,
                user_answer: response.user_input,
                is_correct: response.evaluation.isCorrect,
                error_type: response.error_type || response.evaluation.errorType || 'correct',
                error_explanation: response.evaluation.feedback,
                deduction: response.evaluation,
                // These fields come from the question itself, stored when we have context
                concept: '', // Will be set by the engine which has question context
                difficulty: 5, // Will be set by the engine
                question_text: '', // Will be set by the engine
                question_type: 'mcq', // Will be set by the engine
                correct_answer: '', // Will be set by the engine
            });

        if (error) throw new Error(`Failed to save response: ${error.message}`);
    }

    async getResponseCount(sessionId: string): Promise<number> {
        const supabase = await createClient();
        const { count, error } = await supabase
            .from('responses')
            .select('*', { count: 'exact', head: true })
            .eq('assessment_id', sessionId);

        if (error) throw new Error(`Failed to get response count: ${error.message}`);
        return count || 0;
    }

    async getResponses(sessionId: string): Promise<ResponseRecord[]> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('responses')
            .select('*')
            .eq('assessment_id', sessionId)
            .order('question_number', { ascending: true });

        if (error) throw new Error(`Failed to get responses: ${error.message}`);

        return (data || []).map(row => ({
            question_id: row.question_id || row.id,
            user_input: row.user_answer || '',
            evaluation: row.deduction || {
                isCorrect: row.is_correct || false,
                score: row.is_correct ? 1.0 : 0.0,
                feedback: row.error_explanation || '',
                confidence: 5,
            },
            error_type: row.error_type,
            time_taken_ms: row.time_taken_seconds ? row.time_taken_seconds * 1000 : undefined,
        }));
    }
}
