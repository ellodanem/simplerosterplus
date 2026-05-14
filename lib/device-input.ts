import { parseOptionalString } from "./staff-input";

export { parseOptionalString };

export type ConnectionMode = "adms_push" | "pull_tcp";

export const CONNECTION_MODES: ConnectionMode[] = ["adms_push", "pull_tcp"];

export function parseConnectionMode(value: unknown): ConnectionMode | undefined {
  return value === "adms_push" || value === "pull_tcp" ? value : undefined;
}

/**
 * Optional integer in 1..65535 (TCP port range). Returns:
 *   - `undefined` when the field was not provided
 *   - `null` when explicitly cleared (empty string or `null`)
 *   - the integer when valid
 *   - `undefined` again when present-but-invalid; callers should distinguish "not provided"
 *     from "invalid" by checking whether the key is in the body.
 */
export function parseOptionalPort(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 1 || n > 65535) return undefined;
    return n;
  }
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 1 || value > 65535) return undefined;
    return value;
  }
  return undefined;
}
