/**
 * Strip secrets and unnecessary PII from onboarding event metadata before persistence.
 */

const BLOCKED_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|api[_-]?key|cookie|session|biometric|ssn|card[_-]?number|cvv|cvc|pin)/i;

const MAX_STRING_LEN = 500;
const MAX_DEPTH = 4;
const MAX_KEYS = 40;

export type SanitizedMetadata = Record<string, unknown>;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LEN ? `${value.slice(0, MAX_STRING_LEN)}…` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((v) => sanitizeValue(v, depth + 1));
  }
  if (typeof value === "object") {
    return sanitizeMetadata(value as Record<string, unknown>, depth + 1);
  }
  return String(value).slice(0, MAX_STRING_LEN);
}

/** Returns a JSON-safe object safe to store on OnboardingEvent.metadata. */
export function sanitizeMetadata(
  input: Record<string, unknown> | null | undefined,
  depth = 0,
): SanitizedMetadata | undefined {
  if (!input || typeof input !== "object") return undefined;
  const out: SanitizedMetadata = {};
  let count = 0;
  for (const [key, value] of Object.entries(input)) {
    if (count >= MAX_KEYS) break;
    if (BLOCKED_KEY_PATTERN.test(key)) continue;
    out[key] = sanitizeValue(value, depth);
    count += 1;
  }
  return out;
}

/** Operator-facing error payload — no stack traces. */
export function sanitizeErrorDetails(input: {
  category: string;
  message?: string | null;
  step?: string | null;
  requestId?: string | null;
  traceId?: string | null;
}): SanitizedMetadata {
  return sanitizeMetadata({
    category: input.category,
    message: input.message?.slice(0, 200) ?? undefined,
    step: input.step ?? undefined,
    requestId: input.requestId ?? undefined,
    traceId: input.traceId ?? undefined,
  })!;
}
