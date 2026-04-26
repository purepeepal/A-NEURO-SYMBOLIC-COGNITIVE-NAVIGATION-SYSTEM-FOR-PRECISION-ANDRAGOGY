/**
 * Mastery Configuration
 * 
 * Single source of truth for all mastery thresholds, consecutive-answer
 * triggers, and calibration parameters. Previously hardcoded across
 * engine.ts, report.ts, self-assessment.ts, and results page.
 * 
 * CEO Standard: 85% mastery threshold for concept mastery determination.
 */
export const MASTERY_CONFIG = {
    // ΓöÇΓöÇΓöÇ Mastery Thresholds (accuracy ratios 0-1) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    /** Concept is considered mastered */
    MASTERED: 0.85,
    /** Concept is proficient but not mastered */
    PROFICIENT: 0.70,
    /** Partial understanding ΓÇö needs reinforcement */
    PARTIAL: 0.50,
    /** Below this = critical gap */
    DEVELOPING: 0.40,

    // ΓöÇΓöÇΓöÇ Consecutive Answer Triggers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    /** Consecutive correct answers needed to flag mastery */
    MASTERY_CONSECUTIVE: 5,
    /** Minimum difficulty level for mastery flag */
    MASTERY_MIN_DIFFICULTY: 6,
    /** Consecutive incorrect answers to flag struggling */
    STRUGGLING_CONSECUTIVE: 5,

    // ΓöÇΓöÇΓöÇ Data Sufficiency ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    /** Minimum questions per concept for calibration analysis */
    MIN_QUESTIONS_PER_CONCEPT: 2,

    // ΓöÇΓöÇΓöÇ Calibration ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    /** Gap below this threshold = well-calibrated */
    CALIBRATION_GAP_THRESHOLD: 0.8,
} as const

export type MasteryConfig = typeof MASTERY_CONFIG
