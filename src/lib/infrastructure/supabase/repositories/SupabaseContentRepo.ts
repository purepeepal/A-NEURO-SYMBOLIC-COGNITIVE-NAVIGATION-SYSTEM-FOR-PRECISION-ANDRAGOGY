import { ContentRepository, Question, FeedbackRecord } from '@/lib/domain/assessment/repositories';
import { createClient } from '@/lib/infrastructure/supabase/server';

export class SupabaseContentRepo implements ContentRepository {
    async getQuestion(questionId: string): Promise<Question> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('question_pool')
            .select('*')
            .eq('id', questionId)
            .single();

        if (error) throw new Error(`Failed to get question: ${error.message}`);

        return {
            id: data.id,
            text: data.question_text,
            type: data.question_type,
            options: data.options ? (Array.isArray(data.options) ? data.options : Object.values(data.options)) : undefined,
            difficulty: data.difficulty,
            concept: data.concept,
            correct_answer: data.correct_answer,
            objective: data.objective,
            competency_level: data.competency_level,
            deduction_space: data.deduction_space,
        };
    }

    async saveQuestion(question: Question): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('question_pool')
            .upsert({
                id: question.id,
                topic: question.objective || question.concept, // Use objective as topic fallback
                concept: question.concept,
                difficulty: question.difficulty,
                question_type: question.type,
                question_text: question.text,
                options: question.options,
                correct_answer: question.correct_answer || '',
                objective: question.objective,
                competency_level: question.competency_level,
                deduction_space: question.deduction_space,
                pool_tier: 'warm',
            }, { onConflict: 'id' });

        if (error) throw new Error(`Failed to save question: ${error.message}`);
    }

    async saveFeedback(feedback: FeedbackRecord): Promise<void> {
        const supabase = await createClient();
        const { error } = await supabase
            .from('assessment_feedback')
            .insert({
                session_id: feedback.session_id,
                user_id: feedback.user_id,
                question_id: feedback.question_id,
                feedback_type: feedback.feedback_type,
                feedback_text: feedback.feedback_text,
            });

        if (error) throw new Error(`Failed to save feedback: ${error.message}`);
    }

    async findPoolQuestion(topic: string, concept: string, difficulty: number): Promise<Question | null> {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('question_pool')
            .select('*')
            .eq('topic', topic)
            .eq('concept', concept)
            .gte('difficulty', difficulty - 1)
            .lte('difficulty', difficulty + 1)
            .eq('retired', false)
            .limit(1)
            .single();

        if (error && error.code === 'PGRST116') return null; // No matching question
        if (error) throw new Error(`Failed to find pool question: ${error.message}`);

        return {
            id: data.id,
            text: data.question_text,
            type: data.question_type,
            options: data.options ? (Array.isArray(data.options) ? data.options : Object.values(data.options)) : undefined,
            difficulty: data.difficulty,
            concept: data.concept,
            correct_answer: data.correct_answer,
            objective: data.objective,
        };
    }
}
