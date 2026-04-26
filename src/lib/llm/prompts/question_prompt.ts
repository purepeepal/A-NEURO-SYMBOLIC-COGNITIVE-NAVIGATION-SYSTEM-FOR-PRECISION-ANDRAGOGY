// src/lib/llm/prompts/question_prompt.ts

export function buildQuestionPrompt(
    objective: string,
    targetDifficulty: number,
    userContext?: any
): string {
    return `
You are generating an assessment question for the objective: "${objective}".
The Item Response Theory (IRT) target difficulty for this item is ${targetDifficulty}/10.

CRITICAL INSTRUCTIONS:
1. The question MUST directly measure the stated objective.
2. The format should be engaging and practical, avoiding rote memorization checks.
3. You MUST format your response as a valid JSON object.

JSON SCHEMA REQUIREMENT:
{
  "id": "<generate a random uuid>",
  "text": "The question... (markdown supported)",
  "type": "mcq" | "open_ended",
  "options": ["A", "B", "C", "D"], // Only if mcq
  "difficulty": ${targetDifficulty},
  "concept": "The specific subtopic"
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY the raw JSON string.
    `.trim();
}
