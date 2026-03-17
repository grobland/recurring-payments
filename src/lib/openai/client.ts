import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

/** Default timeout for all OpenAI API calls */
export const OPENAI_DEFAULT_TIMEOUT = 120_000; // 120s

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiInstance = new OpenAI({
      apiKey,
      timeout: OPENAI_DEFAULT_TIMEOUT,
      maxRetries: 1,
    });
  }
  return openaiInstance;
}
