# STREETS-v3 Source Manifest

> Auto-generated after architectural restructuring. Last updated: 2026-03-03 (LLM token/request optimization pass).

## Architecture Overview

```
src/
Γö£ΓöÇΓöÇ app/           ΓåÆ Next.js 15 App Router (pages + API routes)
Γö£ΓöÇΓöÇ components/    ΓåÆ React components organized by domain
Γö£ΓöÇΓöÇ hooks/         ΓåÆ Custom React hooks
Γö£ΓöÇΓöÇ lib/           ΓåÆ 3-tier library architecture
Γöé   Γö£ΓöÇΓöÇ core/          ΓåÆ Shared utilities (logging, sanitization, API helpers)
Γöé   Γö£ΓöÇΓöÇ domain/        ΓåÆ Business logic (assessment engine, IRT, reports)
Γöé   Γö£ΓöÇΓöÇ infrastructure/ΓåÆ External services (Supabase client)
Γöé   ΓööΓöÇΓöÇ llm/           ΓåÆ LLM integration (Gemini, Groq, prompt management)
Γö£ΓöÇΓöÇ scripts/       ΓåÆ CLI utilities
Γö£ΓöÇΓöÇ types/         ΓåÆ Shared TypeScript type definitions
ΓööΓöÇΓöÇ middleware.ts   ΓåÆ Next.js middleware (auth via Supabase)
```

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/auth/login` | `app/auth/login/page.tsx` | Authentication |
| `/dashboard` | `app/dashboard/page.tsx` | User dashboard with history |
| `/assessment` | `app/assessment/page.tsx` | Topic selection + onboarding |
| `/assessment/framing` | `app/assessment/framing/page.tsx` | Pre-quiz contextual framing |
| `/assessment/self-assess` | `app/assessment/self-assess/page.tsx` | Self-assessment questionnaire |
| `/assessment/[id]` | `app/assessment/[id]/page.tsx` | Live quiz session (81 lines ΓÇö orchestrator) |
| `/assessment/[id]/results` | `app/assessment/[id]/results/page.tsx` | Results dashboard (97 lines ΓÇö orchestrator) |

## API Routes

| Endpoint | File | Method | Purpose |
|----------|------|--------|---------|
| `/api/assessment/start` | `route.ts` | POST | Create new assessment session |
| `/api/assessment/subtopics` | `route.ts` | POST | Generate subtopics for a topic |
| `/api/assessment/next` | `route.ts` | POST | Get next adaptive question |
| `/api/assessment/submit` | `route.ts` | POST | Submit answer (rapid save) |
| `/api/assessment/evaluate` | `route.ts` | POST | Grade answer + get feedback |
| `/api/assessment/chat` | `route.ts` | POST | In-quiz chat/dispute system |
| `/api/assessment/feedback` | `route.ts` | POST | Submit feedback on questions |
| `/api/assessment/terminate` | `route.ts` | POST | End session early |
| `/api/assessment/[id]/report` | `route.ts` | GET | Get full report JSON |
| `/api/assessment/[id]/report/stream` | `route.ts` | GET | Stream report via SSE |
| `/api/assessment/[id]/responses` | `route.ts` | GET | Get question/answer history |
| `/api/user/assessments` | `route.ts` | GET | List user's assessments |

## Components

### `components/assessment/` ΓÇö Quiz Session
| File | Lines | Purpose |
|------|-------|---------|
| `QuestionCard.tsx` | ΓÇö | Renders current question with answer input |
| `ChatFloatingButton.tsx` | ΓÇö | Floating chat button for disputes/feedback |
| `FeedbackPanel.tsx` | ~50 | Post-answer feedback with error-type messaging |
| `QuizLoadingScreen.tsx` | ~30 | Cyberpunk-styled loading animation |
| `OnboardingModal.tsx` | ΓÇö | Pre-assessment topic selection modal |
| `FeedbackInterface.tsx` | ΓÇö | Chat interface for question disputes |
| `NarrativeMoment.tsx` | ΓÇö | Narrative storytelling integration |

### `components/results/` ΓÇö Results Dashboard
| File | Lines | Purpose |
|------|-------|---------|
| `OverviewTab.tsx` | ~72 | Executive summary + stat cards + key findings |
| `CalibrationTab.tsx` | ~103 | Self-perception map + confidence calibration grid |
| `NarrativeTab.tsx` | ~18 | Detective case file narrative prose |
| `GapsStrengthsTab.tsx` | ~140 | Strengths/gaps grid + error pattern stacked bars |
| `ActionPlanTab.tsx` | ~65 | Mastery plan + predictions |
| `ResultsLoadingScreen.tsx` | ~60 | Streaming report loading animation |
| `ResultsSidebar.tsx` | ~82 | Tab navigation sidebar |
| `SelfPerceptionMap.tsx` | ΓÇö | Radar chart for calibration data |
| `ActionPlanList.tsx` | ΓÇö | Hierarchical action plan renderer |
| `KnowledgeMap.tsx` | ΓÇö | Interactive knowledge topology graph |
| `ReviewAnswers.tsx` | ΓÇö | Q&A review with explanations |

### `components/ui/` ΓÇö Shared UI Primitives
| File | Purpose |
|------|---------|
| `AnimatedNumber.tsx` | Scroll-triggered number counter animation |
| `RevealSection.tsx` | Scroll-triggered fade-in wrapper (respects prefers-reduced-motion) |
| `CollapsibleSection.tsx` | Brutalist accordion component |
| `ConfirmDialog.tsx` | Modal confirmation dialog with severity variants |
| `ErrorBoundary.tsx` | React error boundary with reset capability |
| `brutal-button.tsx` | Brutalist button component |
| `brutal-card.tsx` | Brutalist card component |
| `brutal-badge.tsx` | Brutalist badge component |

## Hooks

| File | Purpose |
|------|---------|
| `useQuizSession.ts` | All quiz state, submission, session recovery, terminate logic |
| `useStreamingReport.ts` | SSE-based streaming report consumer |
| `useInView.ts` | IntersectionObserver hook for scroll animations |

## Library ΓÇö `lib/core/`
| File | Purpose |
|------|---------|
| `logger.ts` | Structured logging utility |
| `sanitize.ts` | Input sanitization helpers |
| `api-response.ts` | Standardized API response builders |
| `api-schemas.ts` | Shared Zod schemas for API validation |
| `rate-limiter.ts` | Token-bucket rate limiter |

## Library ΓÇö `lib/domain/assessment/`
| File | Purpose |
|------|---------|
| `engine.ts` | Core adaptive assessment engine |
| `flow.ts` | Assessment flow orchestration |
| `irt.ts` | Item Response Theory (3PL) calculations |
| `report.ts` | Report data fetching + `generateReport()` wrapper |
| `report-types.ts` | Report type definitions (AssessmentReport, KnowledgeTreeNode, etc.) |
| `report-analysis.ts` | Heavy analysis functions (investigative, action plan, knowledge tree) |
| `repository.ts` | Supabase data access layer |
| `strategies.ts` | Question selection strategies (Recall, Procedural, Conceptual) |
| `investigative-strategy.ts` | Investigative strategy ΓÇö hypothesis-driven AI probing |
| `uncertainty.ts` | Wilson score confidence intervals |
| `biometrics.ts` | Client-side behavioral biometrics capture |
| `investigative-analyzer.ts` | Deep narrative + pattern analysis |
| `mastery-config.ts` | Mastery threshold configuration |
| `persona-engine.ts` | Learner persona classification |
| `self-assessment.ts` | Self-assessment processing |
| `schemas/` | Zod validation schemas (calibration, question, report, response, state) |

## Library ΓÇö `lib/infrastructure/supabase/`
| File | Purpose |
|------|---------|
| `client.ts` | Browser-side Supabase client |
| `server.ts` | Server-side Supabase client (cookies) |
| `middleware.ts` | Auth middleware helpers |

## Library ΓÇö `lib/llm/`
| File | Purpose |
|------|---------|
| `gemini.ts` | Thin facade ΓÇö delegates to services via GeminiProvider |
| `groq.ts` | Thin facade ΓÇö delegates to services via GroqProvider |
| `call.ts` | LLM call orchestration with retry + validation |
| `repair.ts` | JSON repair for malformed LLM outputs |
| `factory.ts` | Provider factory pattern |
| `config.ts` | Model configuration, per-prompt `TOKEN_BUDGETS`, `PROMPT_TEMPERATURES`, provider routing |
| `validators.ts` | Zod schemas for LLM output validation |
| `cache.ts` | Response caching layer |
| `context-manager.ts` | Conversation context windowing |
| `cost-tracker.ts` | Token usage + cost tracking |
| `queue.ts` | Request queue for rate limiting |
| `index.ts` | Public API barrel export |

### `lib/llm/providers/` ΓÇö LLM Provider Implementations
| File | Purpose |
|------|---------|
| `types.ts` | `LLMProviderCore` interface (shared contract for all providers) |
| `gemini.ts` | GeminiProvider — init, generateWithRetry + queue + cost tracking + per-prompt token budgets |
| `groq.ts` | GroqProvider — init, generateWithRetry + per-prompt `max_tokens` + temperature routing |
| `institute.ts` | InstituteProvider — OpenAI-compatible endpoint + per-prompt `max_tokens` |

### `lib/llm/services/` ΓÇö Provider-Agnostic Domain Services
| File | Purpose |
|------|---------|
| `question.service.ts` | generatePrerequisiteTree, generateSubTopics, generateQuestion, generateInvestigativeObjective, recommendProbingQuestion |
| `evaluation.service.ts` | fingerprintError, evaluateAnswer, verifyAnswer |
| `analysis.service.ts` | extractBehavioralPatterns, detectAnomalies, synthesizeInsights, buildCognitiveBehavioralProfile, generateInvestigativeReport, performMicroAnalysis |
| `report.service.ts` | analyzeSession, generateNarrative, generateCalibrationInsight, generateActionPlan |
| `chat.service.ts` | chat |

### `lib/llm/prompts/` ΓÇö Prompt Templates (split from 824-line monolith)
| File | Purpose |
|------|---------|
| `assessment.ts` | Core assessment prompts (prerequisiteTree, subTopics, questionGeneration, errorFingerprint, evaluateAnswer, sessionAnalysis, verifyAnswer) |
| `chat.ts` | Chat/dispute prompt (chatResponse) |
| `investigative.ts` | Investigative prompts pt.1 — token-optimized v1.1 (investigativeObjective, behavioralPatterns, anomalyDetection, insightSynthesis) |
| `investigative-deep.ts` | Investigative prompts pt.2 — token-optimized v1.1 (cognitiveBehavioralProfile, investigativeReport, microAnalysis, probingQuestion) |
| `report.ts` | Report generation prompts (narrativeMoment, calibrationInsight, actionPlan) |
| `index.ts` | Barrel ΓÇö unified `PROMPTS` object + `PromptType` |

### `lib/llm/types/` ΓÇö Type Definitions (split from 454-line monolith)
| File | Purpose |
|------|---------|
| `assessment.ts` | Core types (AssessmentSnapshot, GeneratedQuestion, DeductionSpace, PrerequisiteTree, ConceptNode, UserPersona, SessionPersona, LLMProvider interface, ActionPlan, EvaluateAnswerResult) |
| `investigative.ts` | Investigative types (InvestigativeObjective, BehavioralPatternAnalysis, AnomalyAnalysis, CognitiveBehavioralProfile, InvestigativeReport, MicroAnalysisResult, ProbingQuestionRecommendation) |
| `index.ts` | Barrel ΓÇö re-exports all types |

## Types

| File | Purpose |
|------|---------|
| `types/database.ts` | Supabase generated database types |
| `types/db-rows.ts` | Typed row interfaces |

## Design System

- **Style**: Brutalist UI ΓÇö `border-4 border-black`, `shadow-brutal`, `uppercase tracking-wider`, `font-mono`
- **Colors**: Black/white primary, semantic accents (green=strength, red=gap, blue=calibrated, purple=predictions)
- **Animation**: Scroll-triggered reveals, animated counters, cyber marquee backgrounds
- **Accessibility**: `prefers-reduced-motion` respected, ARIA roles on tabs, focus indicators
