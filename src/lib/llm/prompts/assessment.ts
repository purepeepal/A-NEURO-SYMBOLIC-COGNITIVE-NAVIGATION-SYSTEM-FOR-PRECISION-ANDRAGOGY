/**
 * Assessment prompts ΓÇö question generation, evaluation, error fingerprinting
 */

import type {
  UserPersona,
  InvestigativeObjective,
  DeductionSpace
} from '../types'

export const ASSESSMENT_PROMPTS = {
  prerequisiteTree: {
    version: '1.2',
    template: (topic: string) => `
You are an expert curriculum designer. Create a prerequisite concept tree for learning: "${topic}"

Return a JSON object with this EXACT structure (no markdown, just JSON):
{
  "topic": "${topic}",
  "concepts": [
    {
      "name": "Concept Name",
      "difficulty": 1-10,
      "prerequisites": ["list of prerequisite concept names from this same list"],
      "type": "recall|procedural|conceptual|analytical", // Added type classification
      "description": "Brief description of what this concept covers"
    }
  ]
}

Requirements:
- Order concepts from foundational (difficulty 1-3) to advanced (difficulty 8-10)
- Include 8-15 core concepts that together cover the topic
- Prerequisites must reference other concepts in the same list
- Foundational concepts should have empty prerequisites arrays
- Be specific and educational, not vague
`,
  },

  subTopics: {
    version: '1.0',
    template: (topic: string) => `
You are an expert curriculum designer. A learner wants to do a self-assessment on the topic: "${topic}".
To help them gauge their confidence, break this topic down into EXACTLY 5 to 7 core sub-topics or themes.
Make the sub-topics MECE (Mutually Exclusive, Collectively Exhaustive) as much as possible, covering 
foundations, applications, and advanced areas.

Return ONLY a JSON object in this format:
{
  "subtopics": ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3", "Sub-topic 4", "Sub-topic 5"]
}
`,
  },

  questionGeneration: {
    version: '3.0',
    template: (params: {
      concept: string
      difficulty: number
      topic: string
      questionType: string
      previousConcepts: string[]
      pastQuestions?: string[]
      userPersona?: Partial<UserPersona> | null
      probingGuidance?: string
      distractorStrategy?: string
      investigativeObjective?: InvestigativeObjective
    }) => {
      const { concept, difficulty, topic, questionType, pastQuestions, userPersona, probingGuidance, distractorStrategy, investigativeObjective } = params

      const personaContext = userPersona
        ? `USER PERSONA: Depth ${userPersona.depth}/100, Persistence ${userPersona.persistence}/100. Strong in: ${userPersona.strongConcepts?.join(', ')}. Weak in: ${userPersona.weakConcepts?.join(', ')}.`
        : 'USER PERSONA: Unknown (First Session)'

      const investigativeContext = probingGuidance || investigativeObjective
        ? `
INVESTIGATIVE DIRECTIVE:
${probingGuidance ? `Probing Guidance: ${probingGuidance}` : ''}
${investigativeObjective ? `
Hypothesis to Test: ${investigativeObjective.hypothesis}
Success Indicators: ${investigativeObjective.successIndicators?.join(', ')}
Failure Indicators: ${investigativeObjective.failureIndicators?.join(', ')}
` : ''}
${distractorStrategy ? `Distractor Strategy (MCQ): ${distractorStrategy}` : ''}

CRITICAL: Design this question to MAXIMIZE INFORMATION GAIN. Every question is an investigative probe.
The wrong answer options (for MCQ) should be carefully crafted to reveal SPECIFIC misconceptions or gaps.
`
        : ''

      return `
You are an expert educational diagnostician and question designer. Generate a question that serves as an INVESTIGATIVE PROBE.

TOPIC: ${topic}
CONCEPT: ${concept}
CURRENT DIFFICULTY: ${difficulty}/10
${personaContext}
${investigativeContext}

PAST QUESTIONS (Do NOT Repeat):
${pastQuestions?.map(q => `- ${q}`).join('\n') || 'None'}

Generate a question with:
1. Clear testing objective (What specific skill/knowledge is tested?)
2. Pre-defined deduction space (What different answer patterns reveal about the user)
3. Appropriate difficulty for the user's persona
4. INVESTIGATIVE VALUE - what will we learn regardless of correct/incorrect?
${questionType === 'mcq' ? `
MCQ INTEGRITY RULES (MANDATORY — violations make the question useless):
- There must be EXACTLY ONE correct answer. If the question could have multiple valid answers, REWRITE the question to be more specific.
- Every distractor (wrong option) must be UNAMBIGUOUSLY wrong. A knowledgeable person must be able to eliminate each distractor with certainty.
- SELF-CHECK: Before finalizing, mentally verify: "Does the correct answer ACTUALLY answer the question? Could any other option ALSO be correct?" If yes, fix it.
- For identification questions (e.g. "Which word contains X?"), verify that X appears ONLY in the correct answer's option, not in any distractor.
- NEVER create a question where the correct answer is debatable, ambiguous, or where multiple options satisfy the condition.
` : ''}
${questionType === 'short_answer' ? `
SHORT ANSWER / DESCRIPTIVE INTEGRITY RULES (MANDATORY):
- The correctAnswer MUST be factually accurate. SELF-CHECK: verify that your correctAnswer actually answers the question correctly before submitting.
- If the question asks to list items (e.g. "List the vowels in..."), the correctAnswer should contain ALL valid items — do not omit any. Order does not matter.
- The correctAnswer should be the MOST COMPLETE valid answer, not a partial one. If multiple valid phrasings exist, use the clearest and most inclusive one.
- Do NOT ask questions with infinitely many valid answers (e.g. "Name a word that...") unless the concept truly requires open-ended recall.
- Prefer questions that have a DEFINITE, VERIFIABLE answer over subjective/opinion questions at lower difficulty levels.
- SELF-CHECK: "If a student gave the correct answer in different words or different order, would it still be recognizably correct?" If not, rephrase the question to be more specific.
` : ''}
Respond in JSON format (no markdown):
{
  "concept": "${concept}",
  "difficulty": ${difficulty},
  "questionText": "The question to ask",
  "questionType": "${questionType === 'mcq' ? 'mcq' : questionType === 'true_false' ? 'true_false' : 'short_answer'}",
  ${questionType === 'mcq' ? `"options": {"a": "Option text", "b": "Option text", "c": "Option text", "d": "Option text"},` : ''}
  "correctAnswer": "${questionType === 'mcq' ? 'a|b|c|d (the letter of the ONLY correct option)' : 'The correct answer'}",
  "explanation": "Brief explanation",
  "prerequisites": ["required", "prior", "knowledge"],
  "objective": "What this question specifically tests (e.g. 'Test understanding of chain rule application')",
  "competencyLevel": "remember|understand|apply|analyze|evaluate|create",
  "investigativeValue": "What we will learn from ANY response to this question",
  "deductionSpace": {
    "expectedErrors": [
      {
        "pattern": "Description of a common wrong answer pattern",
        "implies": "What choosing this reveals (e.g. 'Confuses derivative with integral')",
        "errorType": "conceptual|procedural|careless|prerequisite_gap"
      }
    ],
    "unexpectedPatterns": [
      {
        "description": "Unusual but insightful pattern",
        "action": "flag_for_review|probe_deeper|record_insight"
      }
    ],
    "futuresFeedback": {
      "contentStyle": "visual|step-by-step|analogy",
      "cognitiveLoad": "high|medium|low",
      "engagementHint": "How to re-engage if struggling"
    }
  }
}
`
    },
  },

  errorFingerprint: {
    version: '1.0',
    template: (params: {
      question: string
      correctAnswer: string
      userAnswer: string
      concept: string
    }) => `
You are an expert educational diagnostician. Analyze why a student answered incorrectly.

QUESTION: ${params.question}
CORRECT ANSWER: ${params.correctAnswer}
STUDENT'S ANSWER: ${params.userAnswer}
CONCEPT BEING TESTED: ${params.concept}

Classify the error and return JSON (no markdown):
{
  "errorType": "conceptual|procedural|careless|prerequisite_gap",
  "explanation": "Brief specific explanation of what went wrong",
  "prerequisiteGaps": ["list", "of", "missing", "prerequisites"]
}
`,
  },

  evaluateAnswer: {
    version: '3.0',
    template: (params: {
      question: string
      correctAnswer: string
      userAnswer: string
      concept: string
      objective: string
      deductionSpace: DeductionSpace | Record<string, unknown>
      userPersona?: Partial<UserPersona> | null
    }) => `
You are an expert educational diagnostician. Evaluate a student's answer using deductive analysis.

QUESTION: ${params.question}
OBJECTIVE: ${params.objective}
CORRECT ANSWER: ${params.correctAnswer}
USER'S ANSWER: ${params.userAnswer}
DEDUCTION SPACE: ${JSON.stringify(params.deductionSpace)}
USER PERSONA: ${params.userPersona ? JSON.stringify(params.userPersona) : 'Unknown'}

Perform deductive analysis:
1. QUESTION QUALITY CHECK: First assess whether the question itself is flawed, vague, subjective, or open-ended. If the question allows multiple valid interpretations or the "correct answer" provided is actually wrong or incomplete, be GENEROUS in grading. Do not penalize the student for a bad question.
2. MCQ AMBIGUITY CHECK: For MCQ questions, check if MULTIPLE options could validly answer the question. If the user selected a different option that also satisfies the question's condition, mark their answer CORRECT. For example, if the question asks "Which word contains the letter X?" and multiple options contain X, ANY option containing X is correct.
3. SEMANTIC EQUIVALENCE (applies to ALL question types): Grade the answer correct ('isCorrect': true) if it conveys the same core meaning as the correct answer, even if worded differently, uses synonyms, is less formal, or approaches the concept from a different but valid angle. The student should never be penalized for expressing a correct idea in their own words.
4. FORMAT TOLERANCE (for short answer / descriptive): Accept answers that differ only in:
   - Order of items in a list (e.g. "a,e,i,o,u" vs "e,u,a,i,o" — both correct)
   - Punctuation, spacing, or capitalization
   - Level of detail (a complete answer that includes extra valid information is still correct)
   - Phrasing or synonym use ("big" vs "large", "happy" vs "joyful")
   Mark these CORRECT with a high correctnessScore.
5. FACTUAL VERIFICATION: When evaluating, independently verify the facts in BOTH the correct answer AND the user's answer against the question. If the provided "correct answer" is actually wrong or incomplete, and the user's answer is factually correct, mark the USER correct.
6. If wrong (or partially complete), what does this specific answer reveal about the learner? Match against Deduction Space.
7. Generate specific deductions to update the User Persona.
8. UNDEFINED/MISSING CORRECT ANSWER: If the correct answer field is "undefined", "null", empty, contains "[NO REFERENCE ANSWER AVAILABLE", or is clearly a template placeholder, you MUST evaluate the user's answer purely on FACTUAL CORRECTNESS using your own knowledge of the topic and concept. Do NOT mark the answer wrong just because no reference answer was provided. When in doubt, give the learner the benefit of the doubt and mark correct. Set errorType to "correct" in this case.

Respond in JSON format (no markdown):
{
  "isCorrect": true,
  "correctnessScore": 85,
  "reasoning": "Detailed explanation of why the answer is correct/incorrect",
  "errorType": "conceptual|procedural|careless|prerequisite_gap|correct",
  "userPerspective": "How the user viewed the problem",
  "feedback": "Encouraging, Socratic feedback for the user",
  "learningInsights": ["trait 1", "trait 2"],
  "deductions": [
    {
      "concept": "${params.concept}",
      "deduction": "Specific insight about user state (e.g. 'Struggles with negative exponents')",
      "deductionType": "strength|weakness|misconception|learning_style|behavioral|insight",
      "confidence": 0.85
    }
  ],
  "personaUpdates": {
    "strongConcepts": ["add if mastered"],
    "weakConcepts": ["add if failed"],
    "persistence": 5,
    "curiosity": 2
  }
}
`,
  },

  sessionAnalysis: {
    version: '2.0',
    template: (params: {
      topic: string
      history: { question: string; isCorrect: boolean; concept: string; difficulty: number }[]
      userPersona?: Partial<UserPersona> | null
    }) => `
You are an expert educational analyst. Generate a comprehensive session analysis.

SESSION DATA:
Topic: ${params.topic}
History: ${params.history.length} questions.
Performance String: ${params.history.map((h, i) => `Q${i + 1}: [${h.concept}] ${h.isCorrect ? 'OK' : 'FAIL'} (Diff ${h.difficulty})`).join(', ')}
Prior Persona: ${params.userPersona ? JSON.stringify(params.userPersona) : 'None'}

Generate a COMPREHENSIVE SESSION PERSONA JSON:
{
  "accuracy": number, // 0-100
  "avgDifficulty": number,
  "difficultyProgression": [number],
  "errorBreakdown": {"conceptual": count, "procedural": count, ...},
  "conceptsStruggled": ["list"],
  "conceptsMastered": ["list"],
  "synthesizedDeductions": [
    {"concept": "...", "deduction": "Merged insight from session", "deductionType": "insight", "confidence": 0.9}
  ],
  "descriptiveAnalysis": "2-3 paragraph prose summary of the session. Be specific about cognitive patterns.",
  "immediateActions": ["action 1", "action 2"],
  "nextSessionFocus": ["topic 1", "topic 2"],
  "longTermPath": ["milestone 1", "milestone 2"]
}
`,
  },

  verifyAnswer: {
    version: '1.1',
    template: (params: {
      question: string
      correctAnswer: string
      userAnswer: string
    }) => `
You are an expert auto-grader that prioritizes SEMANTIC EQUIVALENCE over exact wording.

Question: ${params.question}
Correct Answer: ${params.correctAnswer}
Student Answer: ${params.userAnswer}

GRADING RULES:
1. FACTUAL VERIFICATION FIRST: Independently verify that the provided "correct answer" is actually correct for the given question. If the correct answer is wrong or incomplete and the student's answer is factually right, mark the STUDENT correct.
2. SEMANTIC EQUIVALENCE: If the student's answer conveys the same core meaning as the correct answer — even if worded differently, less formally, or from a different angle — mark it CORRECT.
3. FORMAT TOLERANCE: Accept variations in:
   - List ordering ("a,e,i,o,u" = "e,u,a,i,o" = "u,o,i,e,a" — all correct)
   - Punctuation, capitalization, spacing differences
   - Extra valid detail beyond what was asked
   - Synonyms, paraphrases, alternative valid formulations
4. If the question is vague or open-ended, be LENIENT. A vague question should accept a range of valid answers.
5. For MCQs: If multiple options satisfy the question's condition, any valid option is correct.
6. Only mark incorrect if the student demonstrates a genuine misunderstanding or factual error — NOT for formatting, ordering, or phrasing differences.

Return JSON:
{
  "isCorrect": boolean,
  "confidence": number,
  "explanation": "Brief reason for your decision"
}
`,
  },
}
