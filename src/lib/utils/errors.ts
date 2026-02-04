/**
 * Error utilities for transforming technical errors to user-friendly messages
 * and detecting retryable errors.
 */

/**
 * Extract error message from various error types
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    // Handle Response-like objects
    if ("status" in error && typeof (error as { status: unknown }).status === "number") {
      return `HTTP ${(error as { status: number }).status}`;
    }
    // Handle objects with message property
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

/**
 * Extract status code from various error types
 */
function extractStatusCode(error: unknown): number | null {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && typeof (error as { status: unknown }).status === "number") {
      return (error as { status: number }).status;
    }
    if ("statusCode" in error && typeof (error as { statusCode: unknown }).statusCode === "number") {
      return (error as { statusCode: number }).statusCode;
    }
  }
  return null;
}

/**
 * Transform technical errors to user-friendly messages.
 * Maps common error patterns to clear, actionable messages.
 */
export function getErrorMessage(error: unknown): string {
  const message = extractMessage(error);
  const statusCode = extractStatusCode(error);
  const lowerMessage = message.toLowerCase();

  // Auth errors
  if (lowerMessage.includes("unauthorized") || statusCode === 401) {
    return "Your session has expired. Please sign in again.";
  }

  // Validation errors
  if (lowerMessage.includes("invalid category")) {
    return "The selected category is not valid. Please choose another.";
  }

  // Trial/billing errors
  if (lowerMessage.includes("trial has expired")) {
    return "Your trial has expired. Please upgrade to continue.";
  }

  // Network errors
  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    error instanceof TypeError
  ) {
    return "Unable to connect. Please check your internet connection and try again.";
  }

  // File errors
  if (lowerMessage.includes("too large")) {
    return "File too large. Please use a smaller file.";
  }

  // PDF processing errors
  if (lowerMessage.includes("invalid pdf")) {
    return "Invalid PDF format. Please upload a valid PDF file.";
  }

  if (lowerMessage.includes("no transactions")) {
    return "No transactions found. Try a different file or add subscriptions manually.";
  }

  // AI service errors
  if (lowerMessage.includes("openai") || lowerMessage.includes("ai service")) {
    return "AI service temporarily unavailable. Please try again in a moment.";
  }

  // Service unavailable
  if (statusCode === 503) {
    return "Service temporarily unavailable. Please try again in a moment.";
  }

  // Generic fallback
  return "Something went wrong. Please try again.";
}

/**
 * Determine if an error is retryable (transient failure).
 * Returns true for network errors and temporary service unavailability.
 */
export function isRetryableError(error: unknown): boolean {
  const message = extractMessage(error);
  const statusCode = extractStatusCode(error);
  const lowerMessage = message.toLowerCase();

  // Network errors are retryable
  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    error instanceof TypeError
  ) {
    return true;
  }

  // 503 Service Unavailable is retryable
  if (statusCode === 503) {
    return true;
  }

  // 408 Request Timeout is retryable
  if (statusCode === 408) {
    return true;
  }

  // All other errors are not retryable
  return false;
}
