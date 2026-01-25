import { getOpenAIClient } from "./client";

export interface DetectedSubscription {
  name: string;
  amount: number;
  currency: string;
  frequency: "monthly" | "yearly";
  confidence: number; // 0-100
  rawText?: string;
}

export interface ParseResult {
  subscriptions: DetectedSubscription[];
  pageCount: number;
  processingTime: number;
}

const SYSTEM_PROMPT = `You are an expert at analyzing bank statements and financial documents to identify recurring subscriptions and payments.

Your task is to analyze the provided document image(s) and identify any recurring subscription payments.

For each subscription found, extract:
1. Name of the service/company
2. Amount charged
3. Currency (use ISO 4217 codes like USD, EUR, GBP)
4. Frequency (monthly or yearly) - infer from the pattern if not explicit
5. Your confidence level (0-100) in this being a recurring subscription

Look for patterns like:
- Streaming services (Netflix, Spotify, Disney+, etc.)
- Software subscriptions (Adobe, Microsoft 365, etc.)
- Cloud services (AWS, Google Cloud, iCloud, etc.)
- News/Media subscriptions
- Fitness/Gym memberships
- Insurance payments (if recurring)
- Utility services
- Any other recurring charges

Respond ONLY with a JSON array of objects. Each object should have:
{
  "name": "Service Name",
  "amount": 9.99,
  "currency": "USD",
  "frequency": "monthly",
  "confidence": 85,
  "rawText": "The exact text from the statement (optional)"
}

If no subscriptions are found, return an empty array: []

Important:
- Be conservative - only include items you're reasonably confident are recurring subscriptions
- Normalize company names (e.g., "NETFLIX.COM" -> "Netflix")
- Convert amounts to numbers (remove currency symbols)
- Default to "monthly" if frequency is unclear but appears to be a subscription`;

/**
 * Parses a PDF/image to detect recurring subscriptions using GPT-4 Vision
 */
export async function parseDocumentForSubscriptions(
  base64Images: string[],
  mimeType: string = "image/png"
): Promise<ParseResult> {
  const startTime = Date.now();
  const openai = getOpenAIClient();

  try {
    // Prepare image content for the API
    const imageContent = base64Images.map((base64) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${mimeType};base64,${base64}`,
        detail: "high" as const,
      },
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this bank statement or financial document and identify any recurring subscription payments. Return the results as a JSON array.",
            },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temperature for more consistent extraction
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return {
        subscriptions: [],
        pageCount: base64Images.length,
        processingTime: Date.now() - startTime,
      };
    }

    // Parse the JSON response
    let subscriptions: DetectedSubscription[] = [];
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        subscriptions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw response:", content);
    }

    // Validate and clean the subscriptions
    subscriptions = subscriptions
      .filter((sub) => {
        return (
          typeof sub.name === "string" &&
          typeof sub.amount === "number" &&
          sub.amount > 0 &&
          typeof sub.currency === "string" &&
          (sub.frequency === "monthly" || sub.frequency === "yearly")
        );
      })
      .map((sub) => ({
        ...sub,
        name: sub.name.trim(),
        currency: sub.currency.toUpperCase(),
        confidence: Math.min(100, Math.max(0, sub.confidence || 50)),
      }));

    return {
      subscriptions,
      pageCount: base64Images.length,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw error;
  }
}

/**
 * Detects potential duplicates among detected subscriptions and existing ones
 */
export function detectDuplicates(
  detected: DetectedSubscription[],
  existing: { name: string; amount: string; currency: string }[]
): Map<number, { existingName: string; similarity: number }> {
  const duplicates = new Map<number, { existingName: string; similarity: number }>();

  detected.forEach((sub, index) => {
    const normalizedName = sub.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const existingSub of existing) {
      const existingNormalized = existingSub.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check for name similarity
      const nameSimilarity = calculateSimilarity(normalizedName, existingNormalized);

      // Check for amount match
      const amountMatch =
        sub.currency === existingSub.currency &&
        Math.abs(sub.amount - parseFloat(existingSub.amount)) < 0.01;

      if (nameSimilarity > 0.7 || (nameSimilarity > 0.5 && amountMatch)) {
        const existingDup = duplicates.get(index);
        if (!existingDup || existingDup.similarity < nameSimilarity) {
          duplicates.set(index, {
            existingName: existingSub.name,
            similarity: nameSimilarity,
          });
        }
      }
    }
  });

  return duplicates;
}

/**
 * Simple string similarity calculation (Dice coefficient)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const aBigrams = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) {
    aBigrams.add(a.substring(i, i + 2));
  }

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.substring(i, i + 2);
    if (aBigrams.has(bigram)) {
      matches++;
    }
  }

  return (2 * matches) / (a.length - 1 + (b.length - 1));
}
