"use client";

import { useId, useMemo } from "react";

/**
 * Curated fallback used when `Intl.supportedValuesOf` isn't available (very old
 * runtimes). The real list is ~600 entries; this is just a safety net so the field still
 * works as a text input with a few sensible suggestions.
 */
const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/St_Lucia",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

let CACHED_TIMEZONES: string[] | null = null;

function getTimezones(): string[] {
  if (CACHED_TIMEZONES) return CACHED_TIMEZONES;
  try {
    const intlAny = Intl as unknown as {
      supportedValuesOf?: (key: "timeZone") => string[];
    };
    const list = intlAny.supportedValuesOf?.("timeZone");
    if (Array.isArray(list) && list.length > 0) {
      CACHED_TIMEZONES = [...list].sort((a, b) => a.localeCompare(b));
      return CACHED_TIMEZONES;
    }
  } catch {
    // fall through
  }
  CACHED_TIMEZONES = [...FALLBACK_TIMEZONES];
  return CACHED_TIMEZONES;
}

export function TimeZoneCombobox(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  help?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const { id, label, value, onChange, help, placeholder, required } = props;
  const listId = useId();
  const timezones = useMemo(getTimezones, []);
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        list={listId}
        type="text"
        value={value}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <datalist id={listId}>
        {timezones.map((tz) => (
          <option key={tz} value={tz} />
        ))}
      </datalist>
      {help ? <p className="mt-1 text-xs text-zinc-500">{help}</p> : null}
    </div>
  );
}
