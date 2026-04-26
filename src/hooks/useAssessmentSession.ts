// src/hooks/useAssessmentSession.ts
import { useState, useCallback } from 'react';
import { AssessmentQuestion, AnswerEvaluation, PersonaSynthesis } from '@/lib/llm/schemas/responses';

export type SessionState = 'idle' | 'loading' | 'active' | 'evaluating' | 'complete' | 'error';

export interface UseAssessmentSessionReturn {
    state: SessionState;
    sessionId: string | null;
    currentQuestion: AssessmentQuestion | null;
    lastEvaluation: AnswerEvaluation | null;
    personaImpact: PersonaSynthesis | null;
    sessionPhase: 'warmup' | 'calibration' | 'investigation';
    learningSnippet: any | null;
    error: string | null;
    startSession: (objectiveId: string, difficultyLimit?: number) => Promise<void>;
    submitAnswer: (answer: string, timeTakenMs: number, confidence: number) => Promise<void>;
}

export function useAssessmentSession(): UseAssessmentSessionReturn {
    const [state, setState] = useState<SessionState>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
    const [lastEvaluation, setLastEvaluation] = useState<AnswerEvaluation | null>(null);
    const [personaImpact, setPersonaImpact] = useState<PersonaSynthesis | null>(null);
    const [sessionPhase, setSessionPhase] = useState<'warmup' | 'calibration' | 'investigation'>('warmup');
    const [learningSnippet, setLearningSnippet] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getBaseUrl = () => {
        if (typeof window !== 'undefined') return window.location.origin;
        if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
        return 'http://localhost:3000';
    };

    const startSession = useCallback(async (objectiveId: string, difficultyLimit: number = 5) => {
        setState('loading');
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/v2/assessment/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ objectiveId, difficultyLimit })
            });

            if (!res.ok) throw new Error('Failed to start session');

            const data = await res.json();
            setSessionId(data.sessionId);
            setCurrentQuestion(data.question);
            setState('active');
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    }, []);

    const submitAnswer = useCallback(async (answer: string, timeTakenMs: number, confidence: number) => {
        if (!sessionId || !currentQuestion) return;

        setState('evaluating');
        setError(null);
        try {
            const res = await fetch(`${getBaseUrl()}/api/v2/assessment/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    questionId: currentQuestion.id,
                    userAnswer: answer,
                    timeTakenMs,
                    reportedConfidence: confidence
                })
            });

            if (!res.ok) throw new Error('Failed to submit answer');

            const data = await res.json();

            setLastEvaluation(data.evaluation);
            setPersonaImpact(data.personaImpact);
            if (data.sessionPhase) setSessionPhase(data.sessionPhase);
            setLearningSnippet(data.learningSnippet || null);

            if (data.isComplete) {
                setState('complete');
            } else {
                setCurrentQuestion(data.nextQuestion);
                setState('active');
            }
        } catch (err: any) {
            setError(err.message);
            setState('error');
        }
    }, [sessionId, currentQuestion]);

    return {
        state,
        sessionId,
        currentQuestion,
        lastEvaluation,
        personaImpact,
        sessionPhase,
        learningSnippet,
        error,
        startSession,
        submitAnswer
    };
}
