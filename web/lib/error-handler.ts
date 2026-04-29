/**
 * Centralized error handling utility.
 * Replaces all `catch (err: any)` with properly typed error extraction.
 */

/**
 * Extracts a human-readable error message from any thrown value.
 * Handles Error objects, strings, Supabase error shapes, and unknown types.
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  // Supabase-style error objects: { message: string, ... }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }

  // PostgrestError shape: { details: string, hint: string, code: string, message: string }
  if (error && typeof error === 'object' && 'details' in error) {
    const details = (error as { details: unknown }).details;
    if (typeof details === 'string') return details;
  }

  return 'An unexpected error occurred.';
}

/**
 * Logs an error with a consistent prefix for debugging.
 * Use this instead of raw console.error for traceability.
 */
export function logError(context: string, error: unknown): void {
  const message = extractErrorMessage(error);
  console.error(`[${context}] ${message}`, error);
}

/**
 * Type guard: checks if a value is a Supabase error response shape
 */
export function isSupabaseError(
  value: unknown
): value is { error: { message: string; code?: string } } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as Record<string, unknown>).error === 'object' &&
    (value as Record<string, unknown>).error !== null &&
    'message' in ((value as Record<string, unknown>).error as Record<string, unknown>)
  );
}
