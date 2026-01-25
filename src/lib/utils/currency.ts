import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/constants/currencies";

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string,
  locale: string = "en-US"
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch {
    // Fallback for unsupported currencies
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${numAmount.toFixed(2)}`;
  }
}

/**
 * Get the symbol for a currency code
 */
export function getCurrencySymbol(code: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return currency?.symbol ?? code;
}

/**
 * Get currency details by code
 */
export function getCurrencyDetails(code: string) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code);
}

/**
 * Check if a currency code is supported
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code);
}

/**
 * Convert an amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Rates are typically relative to USD
  const fromRate = rates[fromCurrency] ?? 1;
  const toRate = rates[toCurrency] ?? 1;

  // Convert: amount in FROM -> USD -> TO
  const inUSD = amount / fromRate;
  return inUSD * toRate;
}

/**
 * Format amount with compact notation for large numbers
 */
export function formatCompactCurrency(
  amount: number,
  currencyCode: string,
  locale: string = "en-US"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    const symbol = getCurrencySymbol(currencyCode);
    if (amount >= 1000000) {
      return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(1)}K`;
    }
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Parse a currency string to a number
 */
export function parseCurrencyString(value: string): number {
  // Remove currency symbols and thousands separators
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return parseFloat(cleaned) || 0;
}
