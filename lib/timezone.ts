/**
 * Returns true when `value` is a valid IANA time zone the runtime recognizes.
 * Implementation uses Intl.DateTimeFormat construction, which throws RangeError on
 * unknown zones — works in both Node and browser environments and matches what the
 * `Intl.supportedValuesOf("timeZone")` list (used by the combobox) considers valid.
 */
export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
