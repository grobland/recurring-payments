/**
 * Category guessing utility for pattern recognition.
 * Uses keyword matching to suggest categories based on merchant names.
 */

import type { Category } from "@/lib/db/schema";

/**
 * Keyword mapping to category slugs.
 * Each slug maps to an array of keywords to search for in merchant names.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  streaming: [
    "netflix",
    "hulu",
    "disney",
    "hbo",
    "prime video",
    "amazon prime",
    "paramount",
    "peacock",
    "apple tv",
    "max",
    "crunchyroll",
    "funimation",
  ],
  software: [
    "adobe",
    "microsoft",
    "github",
    "figma",
    "notion",
    "slack",
    "zoom",
    "dropbox",
    "google workspace",
    "jetbrains",
    "1password",
    "lastpass",
    "bitwarden",
    "canva",
    "grammarly",
  ],
  gaming: [
    "xbox",
    "playstation",
    "nintendo",
    "steam",
    "epic games",
    "twitch",
    "ea play",
    "ubisoft",
    "game pass",
    "ps plus",
  ],
  music: [
    "spotify",
    "apple music",
    "youtube music",
    "tidal",
    "soundcloud",
    "deezer",
    "pandora",
    "amazon music",
    "audible",
  ],
  news: [
    "nytimes",
    "new york times",
    "wsj",
    "wall street journal",
    "washington post",
    "atlantic",
    "economist",
    "bloomberg",
    "medium",
    "substack",
  ],
  health: [
    "fitness",
    "peloton",
    "calm",
    "headspace",
    "myfitnesspal",
    "strava",
    "noom",
    "gym",
    "yoga",
  ],
  cloud: [
    "icloud",
    "google one",
    "onedrive",
    "backblaze",
    "aws",
    "digitalocean",
    "heroku",
    "vercel",
    "netlify",
  ],
  finance: [
    "quickbooks",
    "mint",
    "ynab",
    "turbotax",
    "robinhood",
    "acorns",
    "betterment",
    "wealthfront",
  ],
  utilities: [
    "phone",
    "internet",
    "electric",
    "gas",
    "water",
    "verizon",
    "at&t",
    "t-mobile",
    "comcast",
    "xfinity",
    "spectrum",
  ],
  productivity: [
    "evernote",
    "todoist",
    "asana",
    "trello",
    "monday",
    "clickup",
    "linear",
    "miro",
  ],
  communication: [
    "discord",
    "whatsapp",
    "telegram",
    "skype",
    "signal",
  ],
  education: [
    "coursera",
    "udemy",
    "skillshare",
    "masterclass",
    "linkedin learning",
    "duolingo",
    "brilliant",
  ],
  security: [
    "vpn",
    "nordvpn",
    "expressvpn",
    "surfshark",
    "proton",
    "norton",
    "mcafee",
    "kaspersky",
  ],
  shopping: [
    "amazon prime",
    "costco",
    "walmart",
    "target",
    "instacart",
  ],
};

/**
 * Guess category from merchant name using keyword matching.
 * Returns the category ID if a match is found, null otherwise.
 *
 * @param merchantName - The merchant name from the detected pattern
 * @param categories - Available categories from the database
 * @returns Category ID if match found, null otherwise
 *
 * @example
 * ```ts
 * const categoryId = guessCategory("NETFLIX INC", categories);
 * // Returns the ID of the "streaming" category if it exists
 * ```
 */
export function guessCategory(
  merchantName: string,
  categories: Category[]
): string | null {
  const lowerMerchant = merchantName.toLowerCase();

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMerchant.includes(keyword)) {
        // Find matching category by slug (case-insensitive)
        const category = categories.find(
          (c) => c.slug.toLowerCase() === slug.toLowerCase()
        );
        return category?.id ?? null;
      }
    }
  }

  return null;
}

/**
 * Get the category slug that would match a merchant name.
 * Useful for testing or displaying the guessed category type.
 *
 * @param merchantName - The merchant name to check
 * @returns Category slug if match found, null otherwise
 */
export function guessCategorySlug(merchantName: string): string | null {
  const lowerMerchant = merchantName.toLowerCase();

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMerchant.includes(keyword)) {
        return slug;
      }
    }
  }

  return null;
}
