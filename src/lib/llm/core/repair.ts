// src/lib/llm/core/repair.ts
import { z, ZodError } from 'zod';

/**
 * Attempts to parse LLM output. If it fails Zod validation, it calls the LLM again
 * with the exact error message, asking it to repair the JSON.
 */
export async function generateAndParseWithRepair<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    generatorFn: (prompt: string) => Promise<string>,
    maxRetries = 2
): Promise<T['_output']> {
    let currentAttempt = 0;
    let currentPrompt = prompt;

    while (currentAttempt <= maxRetries) {
        try {
            // Wait for LLM response
            const responseText = await generatorFn(currentPrompt);

            // Clean markdown blocks if the LLM ignored instructions
            const rawJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
            const parsedJson = JSON.parse(rawJson);

            // Validate against Zod schema
            return schema.parse(parsedJson);

        } catch (error) {
            currentAttempt++;

            if (currentAttempt > maxRetries) {
                console.error(`LLM Repair failed after ${maxRetries} retries`, error);
                throw new Error("Failed to parse LLM response into required schema.");
            }

            let errorMessage = '';
            if (error instanceof ZodError) {
                errorMessage = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
            } else if (error instanceof SyntaxError) {
                errorMessage = "Invalid JSON syntax.";
            } else {
                errorMessage = String(error);
            }

            console.warn(`[LLM Repair] Attempt ${currentAttempt} failed. Retrying... Error: ${errorMessage}`);

            // Re-prompt the LLM with the error
            currentPrompt = `${prompt}\n\nERROR ON PREVIOUS ATTEMPT: Your previous response failed validation with the following errors:\n${errorMessage}\n\nPlease fix the JSON and try again.`;
        }
    }
    throw new Error("Unreachable");
}
