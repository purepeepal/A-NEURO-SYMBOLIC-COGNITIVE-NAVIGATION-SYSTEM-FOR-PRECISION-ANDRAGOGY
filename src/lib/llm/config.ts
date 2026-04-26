// LLM Configuration for STREETS Assessment Engine
// Optimized for zero-cost Gemini Free Tier + Groq Free Tier

export const LLM_CONFIG = {
    // Provider selection ('gemini' | 'groq' | 'institute')
    // DEPRECATED: We now use Active Load Balancing. This is kept for backward compat.
    provider: (process.env.LLM_PROVIDER || 'groq') as 'gemini' | 'groq' | 'institute',

    // Active Load Balancing Routing Map with Disaster Recovery Fallbacks
    // The first element is the Primary choice, followed by Secondary and Tertiary fallbacks
    PROVIDER_ROUTING: {
        question: ['gemini', 'groq', 'institute'],       // Needs high creativity + JSON adhering
        evaluation: ['institute', 'groq', 'gemini'],     // Needs deep reasoning + grading logic
        analysis: ['groq', 'institute', 'gemini'],       // Needs lightning fast profiling
        report: ['gemini', 'groq', 'institute'],         // Complex narrative generation
        chat: ['groq', 'gemini', 'institute'],           // Needs conversation speed
    } as Record<string, ReadonlyArray<'gemini' | 'groq' | 'institute'>>,

    // Model selection - using gemini-2.5-flash
    model: process.env.LLM_MODEL || 'gemini-2.5-flash',

    // Groq model
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',

    // Rate limiting (Gemini Free Tier: 15 RPM, 1M TPM, 1.5M TPD)
    rateLimit: {
        requestsPerMinute: 15,
        tokensPerMinute: 1_000_000,
        tokensPerDay: 1_500_000,
    },

    // Default generation config (Gemini) — overridden per-prompt via TOKEN_BUDGETS
    generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 4096, // Default cap, overridden per-prompt
        responseMimeType: 'application/json',
    },

    // Safety settings (relaxed for educational content)
    safetySettings: [
        {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
    ],

    // Retry configuration
    retry: {
        maxAttempts: 2,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
    },

    // Cache TTL settings
    cache: {
        prerequisiteTreeTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
        questionCacheTTL: 7 * 24 * 60 * 60 * 1000,     // 7 days
        reportCacheTTL: 24 * 60 * 60 * 1000,            // 24 hours (report re-gen is expensive)
    },
} as const

export type LLMConfig = typeof LLM_CONFIG

/**
 * Per-prompt temperature overrides.
 * Lower = more deterministic, higher = more creative.
 */
export const PROMPT_TEMPERATURES = {
    questionGeneration: 0.8,
    evaluateAnswer: 0.3,
    verifyAnswer: 0.2,
    subTopics: 0.5,
    prerequisiteTree: 0.4,
    chatResponse: 0.7,
    sessionAnalysis: 0.4,
    behavioralPatterns: 0.4,
    anomalyDetection: 0.3,
    insightSynthesis: 0.5,
    cognitiveBehavioralProfile: 0.4,
    investigativeReport: 0.5,
    microAnalysis: 0.3,
    probingQuestion: 0.7,
    investigativeObjective: 0.5,
    actionPlan: 0.6,
    calibrationInsight: 0.4,
    narrativeMoment: 0.7,
    errorFingerprint: 0.3,
} as const

/**
 * Per-prompt maxOutputTokens budgets.
 * Right-sized to avoid paying for unused token headroom.
 * Each value is the max output tokens for that prompt type.
 *
 * Rationale:
 * - Simple JSON outputs (verify, fingerprint, narrative) need ~256-512 tokens
 * - Medium JSON (evaluation, micro-analysis, chat) need ~512-1024
 * - Complex JSON (question gen, profiles) need ~1024-2048
 * - Large outputs (prerequisite tree, reports, session analysis) need ~2048-4096
 */
// Keys MUST match the requestType strings passed by services to generateWithRetry().
// e.g. question.service.ts passes 'question', analysis.service.ts passes 'micro_analysis', etc.
export const TOKEN_BUDGETS: Record<string, number> = {
    // ── Tiny (≤512) ────────────────────────────────────────────
    verify: 256,
    fingerprint: 384,
    narrative: 256,
    calibration_insight: 384,

    // ── Small (≤1024) ──────────────────────────────────────────
    evaluation: 1024,
    micro_analysis: 1024,
    chat: 768,
    probing_question: 512,
    subtopics: 384,

    // ── Medium (≤2048) ─────────────────────────────────────────
    question: 2048,
    investigative_objective: 1024,
    behavioral_patterns: 1536,
    anomaly_detection: 1024,
    insight_synthesis: 1536,
    cognitive_profile: 1536,

    // ── Large (≤4096) ──────────────────────────────────────────
    prerequisite: 4096,
    analysis: 2048,
    investigative_report: 3072,
    action_plan: 2048,
}
