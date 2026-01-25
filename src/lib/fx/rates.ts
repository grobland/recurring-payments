import { db } from "@/lib/db";
import { fxRatesCache } from "@/lib/db/schema";
import { eq, gt } from "drizzle-orm";

const OPEN_EXCHANGE_RATES_API = "https://openexchangerates.org/api/latest.json";
const CACHE_DURATION_HOURS = 6;

export type FxRates = Record<string, number>;

interface OpenExchangeRatesResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: FxRates;
}

/**
 * Fetches current exchange rates from Open Exchange Rates API
 * Uses USD as the base currency
 */
async function fetchRatesFromAPI(): Promise<FxRates> {
  const apiKey = process.env.OPEN_EXCHANGE_RATES_APP_ID;

  if (!apiKey) {
    console.warn("OPEN_EXCHANGE_RATES_APP_ID not configured, using fallback rates");
    return getFallbackRates();
  }

  try {
    const response = await fetch(`${OPEN_EXCHANGE_RATES_API}?app_id=${apiKey}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: OpenExchangeRatesResponse = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates:", error);
    return getFallbackRates();
  }
}

/**
 * Fallback rates in case API is unavailable
 * These are approximate rates and should only be used as a last resort
 */
function getFallbackRates(): FxRates {
  return {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
    JPY: 149.5,
    CHF: 0.88,
    CNY: 7.24,
    INR: 83.1,
    MXN: 17.15,
    BRL: 4.97,
    KRW: 1320,
    SEK: 10.42,
    NOK: 10.65,
    DKK: 6.87,
    NZD: 1.64,
    SGD: 1.34,
    HKD: 7.82,
    PLN: 3.98,
    ZAR: 18.65,
  };
}

/**
 * Gets cached exchange rates from the database
 * Returns null if cache is expired or doesn't exist
 */
async function getCachedRates(): Promise<FxRates | null> {
  try {
    const now = new Date();
    const cached = await db.query.fxRatesCache.findFirst({
      where: gt(fxRatesCache.expiresAt, now),
      orderBy: (table, { desc }) => [desc(table.fetchedAt)],
    });

    if (cached) {
      return cached.rates as FxRates;
    }

    return null;
  } catch (error) {
    console.error("Failed to get cached rates:", error);
    return null;
  }
}

/**
 * Saves exchange rates to the database cache
 */
async function cacheRates(rates: FxRates): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000);

    await db.insert(fxRatesCache).values({
      baseCurrency: "USD",
      rates,
      fetchedAt: now,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to cache rates:", error);
  }
}

/**
 * Gets current exchange rates, using cache when available
 */
export async function getExchangeRates(): Promise<FxRates> {
  // Try to get cached rates first
  const cached = await getCachedRates();
  if (cached) {
    return cached;
  }

  // Fetch fresh rates from API
  const rates = await fetchRatesFromAPI();

  // Cache the rates for future use
  await cacheRates(rates);

  return rates;
}

/**
 * Converts an amount from one currency to another
 * All conversions go through USD as the base currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRates
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Missing rate for ${fromCurrency} or ${toCurrency}`);
    return amount;
  }

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

/**
 * Converts an amount to USD
 */
export function convertToUSD(
  amount: number,
  fromCurrency: string,
  rates: FxRates
): number {
  return convertCurrency(amount, fromCurrency, "USD", rates);
}

/**
 * Gets the rate for a specific currency relative to USD
 */
export function getRate(currency: string, rates: FxRates): number {
  return rates[currency] ?? 1;
}
