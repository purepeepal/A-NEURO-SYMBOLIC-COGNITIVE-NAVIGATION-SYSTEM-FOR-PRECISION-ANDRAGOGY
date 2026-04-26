// src/lib/llm/prompts/persona_prompt.ts

import { ResponseRecord, PersonaTraits } from '@/lib/domain/assessment/repositories';

export function buildPersonaSynthesisPrompt(
    responses: ResponseRecord[],
    traits: PersonaTraits,
): string {
    const totalResponses = responses.length;
    const correctCount = responses.filter(r => r.evaluation.isCorrect).length;
    const accuracy = totalResponses > 0 ? (correctCount / totalResponses * 100).toFixed(1) : '0';

    // Extract error patterns
    const errorTypes = responses
        .filter(r => !r.evaluation.isCorrect)
        .map(r => r.error_type || r.evaluation.errorType || 'unknown');

    const errorBreakdown = errorTypes.reduce<Record<string, number>>((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    return `
You are synthesizing a 5-Dimensional Learner Persona based on assessment performance data.

ASSESSMENT DATA:
- Total Questions: ${totalResponses}
- Accuracy: ${accuracy}%
- Error Breakdown: ${JSON.stringify(errorBreakdown)}

CURRENT QUANTITATIVE TRAITS (0-100 scale):
- Analytical: ${traits.analytical}
- Creative: ${traits.creative}
- Practical: ${traits.practical}
- Synthesizing: ${traits.synthesizing}
- Evaluative: ${traits.evaluative}

TASK:
Analyze the performance data and provide refined persona scores with a narrative summary.

The summary should:
1. Describe the learner's cognitive style in 2-3 sentences
2. Identify their primary strength and weakness dimensions
3. Suggest how content should be adapted for this learner profile

CRITICAL INSTRUCTIONS:
Return ONLY a valid JSON object matching this schema:
{
  "analytical": <number 0-100>,
  "creative": <number 0-100>,
  "practical": <number 0-100>,
  "synthesizing": <number 0-100>,
  "evaluative": <number 0-100>,
  "summary": "<narrative string>"
}

Do NOT wrap the JSON in markdown code blocks. Return ONLY the raw JSON string.
    `.trim();
}
