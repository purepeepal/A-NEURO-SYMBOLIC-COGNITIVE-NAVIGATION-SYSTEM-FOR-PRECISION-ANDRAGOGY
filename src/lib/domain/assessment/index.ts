// src/lib/domain/assessment/index.ts
// Unit 3 Barrel File — the ONLY entry point for Unit 2

export { AssessmentEngine } from './engine';
export type { AssessmentConfig, AnswerPayload, SubmitResult } from './engine';
export type {
    SessionRepository,
    ProfileRepository,
    ContentRepository,
    TelemetryRepository,
    KnowledgeRepository,
    ExperimentsRepository,
    SelfAssessRepository,
    LLMService,
    Session,
    Question,
    EvaluationResult,
    ResponseRecord,
    PersonaTraits,
    PersonaSynthesis,
} from './repositories';

// Pure functions (for testing or direct use)
export { calculateProbabilityCorrect, updateAbilityEstimate } from './irt';
export { analyzeBiometrics } from './biometrics';
export { calculatePersonaBase } from './persona-engine';
