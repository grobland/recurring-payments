import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiInstance = new OpenAI({
      apiKey,
      timeout: 60000, // 60 seconds for document processing
      maxRetries: 2,  // Retry 408, 429, 5xx errors automatically
    });
  }
  return openaiInstance;
}
