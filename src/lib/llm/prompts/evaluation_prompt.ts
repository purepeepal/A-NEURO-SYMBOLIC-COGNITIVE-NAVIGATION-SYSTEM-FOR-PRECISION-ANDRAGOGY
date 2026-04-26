// src/lib/llm/prompts/evaluation_prompt.ts

export function buildEvaluationPrompt(
    questionText: string,
    userAnswer: string,
    timeTakenMs: number,
    confidenceReported: number
): string {
    return `
You are evaluating a learner's response to an assessment question.
    
QUESTION:
${questionText}

USER ANSWER:
${userAnswer}

METRICS:
Time Taken: ${timeTakenMs}ms
User Self-Reported Confidence: ${confidenceReported}/4

CRITICAL INSTRUCTIONS:
1. Evaluate if the answer demonstrates mastery.
2. If incorrect, identify the specific logical fallacy or misconception.
3. You MUST format your response as a valid JSON object.

JSON SCHEMA REQUIREMENT:
{
  "isCorrect": boolean,
  "score": 0.0 to 1.0,
  "feedback": "Constructive feedback...",
  "detectedMisconception": "Optional short description...",
  "confidence": 1 to 10
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY the raw JSON string.
    `.trim();
}
