// src/lib/domain/assessment/engine.ts
// ═══════════════════════════════════════════════════════════════════
// Unit 3: Domain Assessment Core — The Heart of STREETS
// ═══════════════════════════════════════════════════════════════════
// 
// This engine orchestrates the adaptive assessment flow with:
// - IRT-based ability tracking (1PL/Rasch)
// - Behavioral biometric analysis
// - Breadth-first concept sweep + mastery detection
// - Intelligent session termination (6 conditions)
// - Error fingerprinting
// - 5D Persona trait calculation
//
// BOUNDARY: This file MUST NOT import from `next/server`, `../llm/`,
// or any direct database driver. It depends ONLY on repository interfaces.
// ═══════════════════════════════════════════════════════════════════

import {
    SessionRepository,
    ProfileRepository,
    ContentRepository,
    TelemetryRepository,
    KnowledgeRepository,
    LLMService,
    Session,
    Question,
    EvaluationResult,
    ResponseRecord,
    PersonaTraits,
} from './repositories';

import { LearningSnippet } from '@/lib/llm/types';
import { generateAndCacheLearningSnippet } from '@/lib/assessment/learning-snippets';

import {
    calculateProbabilityCorrect,
    updateAbilityEstimate,
    IRTParameters,
} from './irt';

import {
    analyzeBiometrics,
    BiometricEvent,
} from './biometrics';

import {
    calculatePersonaBase,
} from './persona-engine';

// ─── Public Types ──────────────────────────────────────────────────

export interface AssessmentConfig {
    userId: string;
    objectiveId: string;
    targetDifficulty?: number;
}

export interface AnswerPayload {
    sessionId: string;
    questionId: string;
    userAnswer: string;
    timeTakenMs: number;
    reportedConfidence?: number;
    biometricEvents?: BiometricEvent[];
}

export interface SubmitResult {
    evaluation: EvaluationResult;
    personaImpact: PersonaTraits;
    newAbility: number;
    nextQuestion: Question | null;
    learningSnippet?: LearningSnippet | null;
    sessionPhase: 'warmup' | 'calibration' | 'investigation';
    isComplete: boolean;
    completionReason?: string;
    questionNumber: number;
}

// ─── Engine State (In-Memory Per Session) ──────────────────────────

interface SessionFlowState {
    conceptsTestedSet: Set<string>;
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
    currentAbility: number;
    questionsAnswered: number;
    recentHistory: { concept: string; isCorrect: boolean; difficulty: number }[];
    phase: 'warmup' | 'calibration' | 'investigation';
}

// ─── Configuration ─────────────────────────────────────────────────

const ENGINE_CONFIG = {
    MIN_QUESTIONS: 5,
    MAX_QUESTIONS: 50,
    MASTERY_CONSECUTIVE_CORRECT: 8,
    MASTERY_MIN_DIFFICULTY: 8,
    FRUSTRATION_CONSECUTIVE_INCORRECT: 5,
    STABILITY_WINDOW: 5,
    STABILITY_MIN_QUESTIONS: 15,
    CONFIDENCE_SATURATION_MIN_QUESTIONS: 12,
    CONFIDENCE_SATURATION_THRESHOLD: 0.05,  // Minimal change in ability = convergence
    EXPECTED_ANSWER_TIME_MS: 15000,
} as const;

// ═══════════════════════════════════════════════════════════════════
export class AssessmentEngine {
    // In-memory flow states keyed by sessionId
    private flowStates: Map<string, SessionFlowState> = new Map();

    constructor(
        private sessionRepo: SessionRepository,
        private profileRepo: ProfileRepository,
        private contentRepo: ContentRepository,
        private telemetryRepo: TelemetryRepository,
        private knowledgeRepo: KnowledgeRepository,
        private llm: LLMService,
    ) { }

    // ─── Start Session ─────────────────────────────────────────────

    async startSession(config: AssessmentConfig) {
        try {
            // 1. Fetch user prior to establish initial Theta (ability)
            const profile = await this.profileRepo.getProfile(config.userId);
            const initialAbility = profile?.irt_theta || 0.0;

            // 2. Create session record
            const session = await this.sessionRepo.createSession(
                config.userId,
                config.objectiveId,
                { initialAbility, targetDifficulty: config.targetDifficulty || 5.0 }
            );

            // 3. Initialize flow state
            this.flowStates.set(session.id, {
                conceptsTestedSet: new Set(),
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
                currentAbility: initialAbility,
                questionsAnswered: 0,
                recentHistory: [],
                phase: 'warmup',
            });

            // 4. Generate the first question using the LLM Gateway
            const question = await this.llm.generateQuestion({
                objective: config.objectiveId,
                difficulty: config.targetDifficulty || 5.0,
            });

            // 5. Save question to pool (cache) for reuse
            await this.contentRepo.saveQuestion(question);

            // 6. Update session with the current question ID
            await this.sessionRepo.updateSession(session.id, {
                current_question_id: question.id,
            });

            // 7. Record concept as tested
            const flowState = this.flowStates.get(session.id)!;
            flowState.conceptsTestedSet.add(question.concept);

            return {
                sessionId: session.id,
                question,
            };
        } catch (error) {
            console.error('[AssessmentEngine] startSession failed:', error);
            throw new Error(`Failed to start assessment session: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ─── Submit Answer ─────────────────────────────────────────────

    async submitAnswer(payload: AnswerPayload): Promise<SubmitResult> {
        try {
            // 1. Fetch session and question context
            const session = await this.sessionRepo.getSession(payload.sessionId);
            const question = await this.contentRepo.getQuestion(payload.questionId);

            // 2. Ensure or recover flow state
            let flowState = this.flowStates.get(payload.sessionId);
            if (!flowState) {
                // Recovery: rebuild flow state from stored responses
                flowState = await this.recoverFlowState(session);
                this.flowStates.set(payload.sessionId, flowState);
            }

            // 3. Evaluate the answer via the LLM Gateway
            const evaluation = await this.llm.evaluateResponse(
                payload.userAnswer,
                question.text,
                question.correct_answer,
            );

            // 4. Classify error type
            if (!evaluation.isCorrect) {
                evaluation.errorType = this.classifyError(evaluation, question, flowState);
            } else {
                evaluation.errorType = 'correct';
            }

            // 5. Analyze Biometrics
            const biometrics = analyzeBiometrics(
                payload.biometricEvents || [],
                ENGINE_CONFIG.EXPECTED_ANSWER_TIME_MS,
            );

            // 6. Save response with full context
            await this.sessionRepo.saveResponse(session.id, {
                question_id: payload.questionId,
                user_input: payload.userAnswer,
                evaluation,
                biometrics,
                error_type: evaluation.errorType,
                time_taken_ms: payload.timeTakenMs,
            });

            // 7. Update IRT Ability
            const oldAbility = flowState.currentAbility;
            const irtDifficulty = (question.difficulty - 5) / 2; // Map 1-10 to IRT logits range
            const newAbility = updateAbilityEstimate(
                evaluation.isCorrect,
                { ability: oldAbility, difficulty: irtDifficulty },
            );

            // 8. Update flow state
            flowState.questionsAnswered++;
            flowState.currentAbility = newAbility;
            flowState.conceptsTestedSet.add(question.concept);
            flowState.recentHistory.push({
                concept: question.concept,
                isCorrect: evaluation.isCorrect,
                difficulty: question.difficulty,
            });
            // Keep recent history bounded
            if (flowState.recentHistory.length > 20) {
                flowState.recentHistory.shift();
            }

            if (evaluation.isCorrect) {
                flowState.consecutiveCorrect++;
                flowState.consecutiveIncorrect = 0;
            } else {
                flowState.consecutiveIncorrect++;
                flowState.consecutiveCorrect = 0;
            }

            // Phase tracking
            if (flowState.questionsAnswered < 2) {
                flowState.phase = 'warmup';
            } else if (flowState.questionsAnswered < 5) {
                flowState.phase = 'calibration';
            } else {
                flowState.phase = 'investigation';
            }

            // Generate Learning Snippet directly
            let snippet: LearningSnippet | null = null;
            if (flowState.phase !== 'warmup' && this.llm.performMicroAnalysis) {
                try {
                    const microResult = await this.llm.performMicroAnalysis(
                        {
                            question_text: question.text,
                            concept: question.concept,
                            difficulty: question.difficulty,
                            is_correct: evaluation.isCorrect,
                            user_answer: payload.userAnswer,
                            correct_answer: question.correct_answer,
                            objective: question.objective || '',
                            deduction_space: {} as any,
                        },
                        {
                            assessmentId: session.id,
                            topic: session.topic,
                            currentDifficulty: flowState.currentAbility,
                            consecutiveCorrect: flowState.consecutiveCorrect,
                            consecutiveIncorrect: flowState.consecutiveIncorrect,
                            questionsAnswered: flowState.questionsAnswered,
                            history: []
                        },
                        null
                    );
                    
                    snippet = await generateAndCacheLearningSnippet(
                        session.id,
                        question.id,
                        { history: [], topic: session.topic } as any,
                        { question_text: question.text, correct_answer: question.correct_answer, is_correct: evaluation.isCorrect, user_answer: payload.userAnswer } as any,
                        microResult,
                        null
                    );
                } catch (e) {
                    console.error('[AssessmentEngine] Snippet generation failed:', e);
                }
            }

            // 9. Calculate persona impact
            const personaImpact = calculatePersonaBase({
                score: evaluation.score,
                timeTakenMs: payload.timeTakenMs,
                expectedTimeMs: ENGINE_CONFIG.EXPECTED_ANSWER_TIME_MS,
                hesitationIndex: biometrics.hesitationIndex,
                agitationIndex: biometrics.agitationIndex,
            });

            // 10. Fire off async telemetry (non-blocking sideband)
            this.telemetryRepo.logBiometrics({
                session_id: session.id,
                event_type: 'answer_submission_summary',
                payload: { ...biometrics, timeTakenMs: payload.timeTakenMs, questionNumber: flowState.questionsAnswered },
            });

            // 11. Check session completion (PORTED FROM LEGACY shouldEndSession)
            const completionCheck = this.shouldEndSession(flowState, newAbility, oldAbility);

            // 12. Generate next question or complete session
            let nextQuestion: Question | null = null;
            if (!completionCheck.end) {
                nextQuestion = await this.generateNextQuestion(session, question, flowState, newAbility);
                if (nextQuestion) {
                    await this.contentRepo.saveQuestion(nextQuestion);
                    await this.sessionRepo.updateSession(session.id, {
                        current_question_id: nextQuestion.id,
                        current_difficulty: nextQuestion.difficulty,
                    });
                }
            } else {
                // Finalize session
                await this.finalizeSession(session, flowState, personaImpact);
            }

            // 13. Update session counters
            await this.sessionRepo.updateSession(session.id, {
                total_questions: flowState.questionsAnswered,
                correct_count: flowState.recentHistory.filter(h => h.isCorrect).length,
                consecutive_correct: flowState.consecutiveCorrect,
                consecutive_incorrect: flowState.consecutiveIncorrect,
            });

            return {
                evaluation,
                personaImpact,
                newAbility,
                nextQuestion,
                learningSnippet: snippet,
                sessionPhase: flowState.phase,
                isComplete: completionCheck.end,
                completionReason: completionCheck.reason,
                questionNumber: flowState.questionsAnswered,
            };
        } catch (error) {
            console.error('[AssessmentEngine] submitAnswer failed:', error);
            throw new Error(`Failed to submit answer: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ─── Session Termination Logic (PORTED FROM LEGACY) ────────────

    private shouldEndSession(
        flowState: SessionFlowState,
        newAbility: number,
        oldAbility: number,
    ): { end: boolean; reason?: string } {
        const { questionsAnswered, consecutiveCorrect, consecutiveIncorrect, recentHistory } = flowState;

        // 1. Minimum length — not enough data yet
        if (questionsAnswered < ENGINE_CONFIG.MIN_QUESTIONS) {
            return { end: false };
        }

        // 2. Maximum length safety cap
        if (questionsAnswered >= ENGINE_CONFIG.MAX_QUESTIONS) {
            return { end: true, reason: 'maximum_length_reached' };
        }

        // 3. Frustration / persistent struggling
        if (consecutiveIncorrect >= ENGINE_CONFIG.FRUSTRATION_CONSECUTIVE_INCORRECT) {
            return { end: true, reason: 'struggling_persistently' };
        }

        // 4. Mastery demonstrated (high consecutive correct at high difficulty)
        if (consecutiveCorrect >= ENGINE_CONFIG.MASTERY_CONSECUTIVE_CORRECT) {
            const recentDifficulties = recentHistory.slice(-ENGINE_CONFIG.MASTERY_CONSECUTIVE_CORRECT);
            const avgDifficulty = recentDifficulties.reduce((sum, h) => sum + h.difficulty, 0) / recentDifficulties.length;
            if (avgDifficulty >= ENGINE_CONFIG.MASTERY_MIN_DIFFICULTY) {
                return { end: true, reason: 'mastery_demonstrated' };
            }
        }

        // 5. Pattern stability — performance has plateaued
        if (questionsAnswered >= ENGINE_CONFIG.STABILITY_MIN_QUESTIONS) {
            const recent = recentHistory.slice(-ENGINE_CONFIG.STABILITY_WINDOW);
            const allCorrect = recent.every(h => h.isCorrect);
            const allIncorrect = recent.every(h => !h.isCorrect);
            if (allCorrect || allIncorrect) {
                return { end: true, reason: 'pattern_stable_sufficient_data' };
            }
        }

        // 6. Ability convergence — IRT theta is no longer changing meaningfully
        if (questionsAnswered >= ENGINE_CONFIG.CONFIDENCE_SATURATION_MIN_QUESTIONS) {
            const abilityDelta = Math.abs(newAbility - oldAbility);
            if (abilityDelta <= ENGINE_CONFIG.CONFIDENCE_SATURATION_THRESHOLD) {
                return { end: true, reason: 'ability_estimate_converged' };
            }
        }

        return { end: false };
    }

    // ─── Adaptive Question Selection (PORTED FROM LEGACY) ──────────

    private async generateNextQuestion(
        session: Session,
        lastQuestion: Question,
        flowState: SessionFlowState,
        currentAbility: number,
    ): Promise<Question | null> {
        // Map IRT ability back to difficulty scale (1-10)
        let rawDifficulty = Math.round((currentAbility * 2) + 5);
        let targetDifficulty = Math.max(1, Math.min(10, rawDifficulty));

        // Familiarity-First Phase Constraints
        if (flowState.phase === 'warmup') {
            targetDifficulty = Math.min(targetDifficulty, 4); // Keep it easy initially
        } else if (flowState.phase === 'calibration') {
            targetDifficulty = Math.min(targetDifficulty, 6);
        }

        // Concept rotation: try to avoid repeating the same concept consecutively
        let targetConcept: string | undefined;
        const excludeConcepts: string[] = [];

        // If the learner got the last question wrong, probe the same concept at lower difficulty
        if (!flowState.recentHistory[flowState.recentHistory.length - 1]?.isCorrect) {
            targetConcept = lastQuestion.concept;
        } else {
            // Breadth-first: prefer untested concepts
            excludeConcepts.push(lastQuestion.concept);
        }

        try {
            const nextQuestion = await this.llm.generateQuestion({
                objective: session.topic,
                difficulty: targetDifficulty,
                concept: targetConcept,
                excludeConcepts,
            });
            return nextQuestion;
        } catch (error) {
            console.error('[AssessmentEngine] Failed to generate next question:', error);
            // Fallback: try from question pool
            const poolQuestion = await this.contentRepo.findPoolQuestion(
                session.topic,
                lastQuestion.concept,
                targetDifficulty,
            );
            return poolQuestion;
        }
    }

    // ─── Error Fingerprinting ──────────────────────────────────────

    private classifyError(
        evaluation: EvaluationResult,
        question: Question,
        flowState: SessionFlowState,
    ): 'conceptual' | 'procedural' | 'careless' | 'prerequisite_gap' {
        // If the LLM detected a misconception, it's likely conceptual
        if (evaluation.detectedMisconception) {
            return 'conceptual';
        }

        // If confidence is high but answer is wrong, likely careless
        if (evaluation.confidence >= 7 && evaluation.score > 0.3) {
            return 'careless';
        }

        // If this concept's prerequisites haven't been tested or were failed, it's a prerequisite gap
        const conceptHistory = flowState.recentHistory.filter(h => h.concept === question.concept);
        if (conceptHistory.length === 0 && question.difficulty >= 6) {
            return 'prerequisite_gap';
        }

        // If the question was procedural (multi-step) and score is very low
        if (evaluation.score < 0.2) {
            return 'procedural';
        }

        return 'conceptual'; // Default
    }

    // ─── Session Finalization ──────────────────────────────────────

    private async finalizeSession(
        session: Session,
        flowState: SessionFlowState,
        finalPersona: PersonaTraits,
    ): Promise<void> {
        try {
            // 1. Mark session as completed
            await this.sessionRepo.updateSession(session.id, {
                status: 'completed',
                completed_at: new Date().toISOString(),
            });

            // 2. Update user persona
            await this.profileRepo.updatePersona(session.user_id, {
                depth: finalPersona.analytical,
                breadth: flowState.conceptsTestedSet.size * 10,
                creativity: finalPersona.creative,
                persistence: finalPersona.evaluative,
                curiosity: finalPersona.synthesizing,
                overall_mastery: Math.round(flowState.currentAbility * 12.5 + 50), // Map -4..+4 → 0..100
                total_sessions: 1, // Will be incremented by the DB
            });

            // 3. Update user's IRT ability
            await this.profileRepo.updateProfile(session.user_id, {
                irt_theta: flowState.currentAbility,
            } as any); // Profile update type doesn't have irt_theta yet

            // 4. Save session analytics
            const allHistory = flowState.recentHistory;
            const accuracy = allHistory.length > 0
                ? allHistory.filter(h => h.isCorrect).length / allHistory.length
                : 0;

            await this.telemetryRepo.saveAnalytics(session.id, {
                user_id: session.user_id,
                questions_answered: flowState.questionsAnswered,
                accuracy: Math.round(accuracy * 100),
                concepts_covered: Array.from(flowState.conceptsTestedSet),
                final_ability: flowState.currentAbility,
            });

            // 5. Log knowledge gaps
            const failedConcepts = new Map<string, number>();
            for (const h of allHistory) {
                if (!h.isCorrect) {
                    failedConcepts.set(h.concept, (failedConcepts.get(h.concept) || 0) + 1);
                }
            }
            for (const [concept, failCount] of failedConcepts) {
                const severity = failCount >= 3 ? 'critical' : failCount >= 2 ? 'moderate' : 'minor';
                await this.knowledgeRepo.logKnowledgeGap(session.user_id, {
                    user_id: session.user_id,
                    assessment_id: session.id,
                    concept,
                    mastery_score: Math.max(0, 100 - failCount * 25),
                    gap_severity: severity,
                    addressed: false,
                });
            }
        } catch (error) {
            // Session finalization should not crash the return payload
            console.error('[AssessmentEngine] finalizeSession failed:', error);
        }
    }

    // ─── Flow State Recovery ───────────────────────────────────────

    private async recoverFlowState(session: Session): Promise<SessionFlowState> {
        try {
            const responses = await this.sessionRepo.getResponses(session.id);
            const state: SessionFlowState = {
                conceptsTestedSet: new Set(),
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
                currentAbility: session.config_snapshot?.initialAbility || 0.0,
                questionsAnswered: responses.length,
                recentHistory: [],
                phase: 'warmup'
            };

            for (const r of responses) {
                const isCorrect = r.evaluation?.isCorrect || false;
                state.recentHistory.push({
                    concept: r.question_id, // We only have the question ID in stored responses
                    isCorrect,
                    difficulty: 5, // Default since we don't store difficulty in responses
                });
                if (isCorrect) {
                    state.consecutiveCorrect++;
                    state.consecutiveIncorrect = 0;
                } else {
                    state.consecutiveIncorrect++;
                    state.consecutiveCorrect = 0;
                }
            }
            
            if (state.questionsAnswered < 2) state.phase = 'warmup';
            else if (state.questionsAnswered < 5) state.phase = 'calibration';
            else state.phase = 'investigation';

            return state;
        } catch {
            // If recovery fails, start with defaults
            return {
                conceptsTestedSet: new Set(),
                consecutiveCorrect: 0,
                consecutiveIncorrect: 0,
                currentAbility: 0.0,
                questionsAnswered: 0,
                recentHistory: [],
                phase: 'warmup'
            };
        }
    }
}
