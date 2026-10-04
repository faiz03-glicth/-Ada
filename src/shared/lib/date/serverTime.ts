/**
 * PURE helpers for timestamps that come from the server. Postgres writes "2026-10-04T10:00:00.123456+00:00"
 * while the app stores "2026-10-04T10:00:00.123Z", so a server time is turned into the app's form before
 * it's compared or stored. A sync bookmark is the exception: it stays exactly as the server wrote it.
 */

// Postgres keeps microseconds; Date understands milliseconds.
const toMillis = (value: string) => value.trim().replace(/(\.\d{3})\d+/, '$1');

/** The app's ISO form (UTC, milliseconds, "Z"), or null when it isn't a timestamp. */
export function fromServerTime(value: string): string | null {
  const parsed = Date.parse(toMillis(value));
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** `value` moved back by `seconds`, in the app's ISO form (null when it isn't a timestamp). */
export function secondsBefore(value: string, seconds: number): string | null {
  const parsed = Date.parse(toMillis(value));
  return Number.isNaN(parsed) ? null : new Date(parsed - seconds * 1000).toISOString();
}
