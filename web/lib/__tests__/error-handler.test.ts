import { describe, it, expect } from 'vitest';
import { extractErrorMessage, logError, isSupabaseError } from '../error-handler';

// ═══════════════════════════════════════════════════════════════════
// Tests: error-handler.ts
// Validates centralized error extraction and type guards
// ═══════════════════════════════════════════════════════════════════

describe('extractErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(extractErrorMessage(new Error('test error'))).toBe('test error');
  });

  it('extracts message from TypeError', () => {
    expect(extractErrorMessage(new TypeError('type mismatch'))).toBe('type mismatch');
  });

  it('returns string directly when thrown as string', () => {
    expect(extractErrorMessage('simple string error')).toBe('simple string error');
  });

  it('extracts message from Supabase-like error objects', () => {
    expect(extractErrorMessage({ message: 'Row not found' })).toBe('Row not found');
  });

  it('extracts details from PostgrestError shape', () => {
    expect(extractErrorMessage({
      details: 'column "foo" does not exist',
      hint: null,
      code: '42703',
      message: 'PostgrestError',
    })).toBe('PostgrestError');
    // message takes precedence over details
  });

  it('extracts details when message is not a string', () => {
    expect(extractErrorMessage({
      message: 42, // not a string
      details: 'fallback details',
    })).toBe('fallback details');
  });

  it('returns default message for null', () => {
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred.');
  });

  it('returns default message for undefined', () => {
    expect(extractErrorMessage(undefined)).toBe('An unexpected error occurred.');
  });

  it('returns default message for numbers', () => {
    expect(extractErrorMessage(42)).toBe('An unexpected error occurred.');
  });

  it('returns default message for empty objects', () => {
    expect(extractErrorMessage({})).toBe('An unexpected error occurred.');
  });

  it('returns default for arrays', () => {
    expect(extractErrorMessage([1, 2, 3])).toBe('An unexpected error occurred.');
  });
});

describe('logError', () => {
  it('does not throw when called with various error types', () => {
    // Just verify it doesn't throw — we don't test console.error output
    expect(() => logError('test', new Error('boom'))).not.toThrow();
    expect(() => logError('test', 'string error')).not.toThrow();
    expect(() => logError('test', null)).not.toThrow();
    expect(() => logError('test', undefined)).not.toThrow();
    expect(() => logError('test', { message: 'obj' })).not.toThrow();
  });
});

describe('isSupabaseError', () => {
  it('returns true for valid Supabase error shape', () => {
    expect(isSupabaseError({ error: { message: 'Not found' } })).toBe(true);
  });

  it('returns true with extra fields', () => {
    expect(isSupabaseError({
      error: { message: 'Invalid token', code: 'PGRST301' },
    })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isSupabaseError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSupabaseError(undefined)).toBe(false);
  });

  it('returns false for plain strings', () => {
    expect(isSupabaseError('error')).toBe(false);
  });

  it('returns false for objects without error key', () => {
    expect(isSupabaseError({ message: 'no error key' })).toBe(false);
  });

  it('returns false when error is not an object', () => {
    expect(isSupabaseError({ error: 'string' })).toBe(false);
  });

  it('returns false when error.message is missing', () => {
    expect(isSupabaseError({ error: { code: 'ABC' } })).toBe(false);
  });
});
