const SENSITIVE_KEY = /(?:authorization|secret|api.?key|password|passcode|pin|otp|token|mobile|phone|email|customer|signature|signed.?data|payment.?url|redirect.?url)/i;
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;

/** @internal */
export function sanitizeProviderData(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MAX_DEPTH]';
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeProviderData(item, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeProviderData(item, depth + 1),
    ]));
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

/** @internal */
export function sanitizedProviderRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return sanitizeProviderData(value) as Record<string, unknown>;
}
