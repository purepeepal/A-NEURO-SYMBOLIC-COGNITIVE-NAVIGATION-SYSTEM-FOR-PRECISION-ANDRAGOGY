// scripts/domain_harness.ts
// Pure headless test script for the Domain Assessment Core (Unit 3).
// Run with: npx tsx scripts/domain_harness.ts

import { AssessmentEngine } from '../src/lib/domain/assessment/engine';
import {
    SessionRepository, Session, SessionConfig, ResponseRecord,
    ProfileRepository, UserProfile, PersonaMetrics, ProgressSnapshot,
    ContentRepository, Question, FeedbackRecord,
    TelemetryRepository, TelemetryRecord, LLMCallLog,
    KnowledgeRepository, TopicSubtopics, KnowledgeGap,
    LLMService, EvaluationResult, PersonaSynthesis,
} from '../src/lib/domain/assessment/repositories';

// 1. Define Concrete Mocks
class MockSessionRepo implements SessionRepository {
    sessions = new Map<string, Session>();
    responses = new Map<string, ResponseRecord[]>();

    async createSession(uId: string, objId: string, cfg: SessionConfig): Promise<Session> {
        const s: Session = {
            id: 'mock-session-123', user_id: uId, objective_uid: objId, topic: objId,
            status: 'in_progress', config_snapshot: cfg, total_questions: 0,
            correct_count: 0, current_difficulty: cfg.targetDifficulty,
            consecutive_correct: 0, consecutive_incorrect: 0, started_at: new Date().toISOString(),
        };
        this.sessions.set(s.id, s);
        return s;
    }
    async getSession(id: string): Promise<Session> { return this.sessions.get(id)!; }
    async updateSession(id: string, updates: Partial<Session>) {
        Object.assign(this.sessions.get(id)!, updates);
    }
    async saveResponse(id: string, res: ResponseRecord) {
        if (!this.responses.has(id)) this.responses.set(id, []);
        this.responses.get(id)!.push(res);
    }
    async getResponseCount(id: string): Promise<number> { return this.responses.get(id)?.length || 0; }
    async getResponses(id: string): Promise<ResponseRecord[]> { return this.responses.get(id) || []; }
}

class MockProfileRepo implements ProfileRepository {
    async getProfile(): Promise<UserProfile | null> {
        return { id: 'test-user', irt_theta: 0.5, created_at: '', updated_at: '' };
    }
    async updateProfile() { }
    async getPersona(): Promise<PersonaMetrics | null> { return null; }
    async updatePersona() { }
    async saveSnapshot() { }
    async awardBadge() { }
}

class MockContentRepo implements ContentRepository {
    async getQuestion(): Promise<Question> {
        return { id: 'q1', text: 'Mock Q', difficulty: 5, type: 'mcq', concept: 'Mock Concept' };
    }
    async saveQuestion() { }
    async saveFeedback() { }
    async findPoolQuestion(): Promise<Question | null> { return null; }
}

class MockTelemetryRepo implements TelemetryRepository {
    async logBiometrics(data: TelemetryRecord) { console.log('[Telemetry]:', data.event_type); }
    async saveAnalytics() { }
    async logLLMCall() { }
}

class MockKnowledgeRepo implements KnowledgeRepository {
    async getSubtopics(): Promise<TopicSubtopics | null> { return null; }
    async saveSubtopics() { }
    async getPrerequisites() { return null; }
    async logKnowledgeGap() { }
    async getKnowledgeGaps(): Promise<KnowledgeGap[]> { return []; }
}

class MockLLM implements LLMService {
    async generateQuestion(ctx: { objective: string; difficulty: number }): Promise<Question> {
        console.log(`[LLM]: Generating Question for diff ${ctx.difficulty}`);
        return {
            id: 'mock-q-1', text: 'What is 2+2?', type: 'mcq' as const,
            options: ['3', '4', '5'], difficulty: ctx.difficulty, concept: 'Math',
        };
    }
    async evaluateResponse(ans: string): Promise<EvaluationResult> {
        console.log(`[LLM]: Evaluating Answer "${ans}"`);
        const isCorrect = ans.includes("4");
        return { isCorrect, score: isCorrect ? 1.0 : 0.0, feedback: isCorrect ? 'Great!' : 'Try again.', confidence: 9 };
    }
    async synthesizePersona(): Promise<PersonaSynthesis> {
        return { analytical: 70, creative: 60, practical: 65, synthesizing: 55, evaluative: 50, summary: 'Mock persona.' };
    }
}

// 2. The Execution Harness
async function runHarness() {
    console.log("=== STREETS Domain Core Headless Harness ===");

    // Dependency Injection (now with 6 dependencies)
    const engine = new AssessmentEngine(
        new MockSessionRepo(),
        new MockProfileRepo(),
        new MockContentRepo(),
        new MockTelemetryRepo(),
        new MockKnowledgeRepo(),
        new MockLLM(),
    );

    console.log("\n--- Starting Session ---");
    const init = await engine.startSession({
        userId: 'test-user',
        objectiveId: 'obj-math-101',
        targetDifficulty: 4,
    });
    console.log("Started:", init.sessionId);
    console.log("First Question:", init.question.text);

    console.log("\n--- Submitting Correct Answer ---");
    const result1 = await engine.submitAnswer({
        sessionId: init.sessionId,
        questionId: init.question.id,
        userAnswer: "The answer is 4",
        timeTakenMs: 5000,
        biometricEvents: [
            { type: 'mousemove', timestamp: 100, x: 10, y: 10 },
            { type: 'click', timestamp: 1500, x: 50, y: 50 },
        ],
    });
    console.log("Eval:", result1.evaluation.feedback);
    console.log("New IRT Ability:", result1.newAbility.toFixed(2));
    console.log("Persona Impact (Analytical):", result1.personaImpact.analytical);
    console.log("Next Question Difficulty:", result1.nextQuestion?.difficulty);
    console.log("Is Complete:", result1.isComplete);

    if (result1.nextQuestion) {
        console.log("\n--- Submitting Incorrect Answer ---");
        const result2 = await engine.submitAnswer({
            sessionId: init.sessionId,
            questionId: result1.nextQuestion.id,
            userAnswer: "I think it is 5",
            timeTakenMs: 25000,
            biometricEvents: [], // High hesitation
        });
        console.log("Eval:", result2.evaluation.feedback);
        console.log("New IRT Ability:", result2.newAbility.toFixed(2));
        console.log("Persona Impact (Synthesizing):", result2.personaImpact.synthesizing);
        console.log("Is Complete:", result2.isComplete);
    }

    console.log("\n=== Harness Complete ===");
}

runHarness().catch(console.error);
