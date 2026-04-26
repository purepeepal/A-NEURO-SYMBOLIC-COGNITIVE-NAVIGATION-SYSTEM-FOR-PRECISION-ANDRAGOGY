/**
 * Schema Index — Re-exports all assessment schemas
 * 
 * Import from '@/lib/assessment/schemas' for any schema or type
 */

// Response & submission
export {
    ErrorTypeSchema,
    QuestionTypeSchema,
    CompetencyLevelSchema,
    ResponseSchema,
    SubmissionPayloadSchema,
    type ErrorType,
    type QuestionType,
    type CompetencyLevel,
    type Response,
    type SubmissionPayload,
} from './response.schema'

// Question schemas (strict + raw)
export {
    ExpectedErrorSchema,
    DeductionSpaceSchema,
    GeneratedQuestionSchema,
    RawGeneratedQuestionSchema,
    ConceptNodeSchema,
    PrerequisiteTreeSchema,
    type DeductionSpace,
    type ExpectedError,
    type GeneratedQuestion,
    type RawGeneratedQuestion,
    type ConceptNode,
    type PrerequisiteTree,
} from './question.schema'

// Assessment state
export {
    HistoryEntrySchema,
    InvestigativeObjectiveSchema,
    MicroAnalysisResultSchema,
    AssessmentStateSchema,
    type HistoryEntry,
    type InvestigativeObjective,
    type MicroAnalysisResult,
    type AssessmentState,
} from './state.schema'

// Report schemas
export {
    KnowledgeTreeNodeSchema,
    KnowledgeTreeEdgeSchema,
    KnowledgeTreeSchema,
    ConceptPerformanceSchema,
    InvestigativeInsightSchema,
    InvestigativeReportSchema,
    ActionPlanSchema,
    AssessmentReportSchema,
    type KnowledgeTreeNode,
    type KnowledgeTreeEdge,
    type KnowledgeTree,
    type ConceptPerformance,
    type InvestigativeInsight,
    type ActionPlan,
    type AssessmentReport,
} from './report.schema'

// Calibration & evaluation
export {
    SelfAssessmentRatingSchema,
    CalibrationResultSchema,
    EvaluateAnswerResultSchema,
    RawEvaluateAnswerResultSchema,
    ConfidenceIndicatorSchema,
    type SelfAssessmentRating,
    type CalibrationResult,
    type EvaluateAnswerResult,
    type RawEvaluateAnswerResult,
    type ConfidenceIndicator,
} from './calibration.schema'
