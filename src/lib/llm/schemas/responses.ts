import { z } from 'zod';

export const AssessmentQuestionSchema = z.object({
    id: z.string().uuid().describe("Unique identifier for this question instance"),
    text: z.string().describe("The actual question text formatted in Markdown"),
    type: z.enum(['mcq', 'open_ended', 'coding']).describe("The format of the question"),
    options: z.array(z.string()).optional().describe("Array of options if type is mcq"),
    difficulty: z.number().min(1).max(10).describe("The estimated difficulty out of 10"),
    concept: z.string().describe("The core subtopic this question addresses")
});

export const AnswerEvaluationSchema = z.object({
    isCorrect: z.boolean().describe("Whether the answer represents mastery of the concept"),
    score: z.number().min(0).max(1).describe("Partial credit score from 0.0 to 1.0"),
    feedback: z.string().describe("Constructive feedback explaining the gap or praising the intuition"),
    detectedMisconception: z.string().optional().describe("If wrong, what specific mental model error was made?"),
    confidence: z.number().min(1).max(10).describe("The LLM's confidence in this evaluation out of 10")
});

export const PersonaSynthesisSchema = z.object({
    analytical: z.number().min(0).max(100),
    creative: z.number().min(0).max(100),
    practical: z.number().min(0).max(100),
    synthesizing: z.number().min(0).max(100),
    evaluative: z.number().min(0).max(100),
    summary: z.string().describe("A short narrative summary of the learner's approach")
});

export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;
export type PersonaSynthesis = z.infer<typeof PersonaSynthesisSchema>;
