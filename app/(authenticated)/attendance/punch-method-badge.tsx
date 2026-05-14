"use client";

import type { PunchVerifyMethod } from "@/lib/attendance-week";

/**
 * Small inline badge for the "how was this punch captured" column on the attendance log.
 * Maps the punch `source` + `verifyMethod` pair to a single glyph + short label:
 *
 *   manual              → ✍  Manual
 *   device + fingerprint→ 👆  Finger
 *   device + face       → 🙂  Face
 *   device + card       → 💳  Card
 *   device + password   → 🔢  PIN
 *   device + palm       → 🤚  Palm
 *   device + null/other → 📱  Device
 *
 * Icons are Unicode glyphs (no SVG dep) — same family the rest of the UI uses (↓ ↑ ✍ 🔍).
 * Labels are always short so the badge fits in the narrow source column without wrapping.
 */
export type PunchMethodVariant = "row" | "chip";

export function PunchMethodBadge({
  source,
  verifyMethod,
  variant = "row",
}: {
  source: "manual" | "device_adms" | "device_pull";
  verifyMethod: PunchVerifyMethod | null;
  variant?: PunchMethodVariant;
}) {
  const { glyph, label, full } = methodPresentation(source, verifyMethod);
  if (variant === "chip") {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1 text-[10px] font-medium text-zinc-700"
        title={full}
      >
        <span aria-hidden="true">{glyph}</span>
        <span>{label.toLowerCase()}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-zinc-500"
      title={full}
    >
      <span aria-hidden="true">{glyph}</span>
      <span>{label.toLowerCase()}</span>
    </span>
  );
}

/** Exposed for the row editor's read-only audit line. */
export function methodFullLabel(
  source: "manual" | "device_adms" | "device_pull",
  verifyMethod: PunchVerifyMethod | null,
): string {
  return methodPresentation(source, verifyMethod).full;
}

/** Bare glyph for tight contexts (e.g. grid punch chips). */
export function methodGlyph(
  source: "manual" | "device_adms" | "device_pull",
  verifyMethod: PunchVerifyMethod | null,
): string {
  return methodPresentation(source, verifyMethod).glyph;
}

function methodPresentation(
  source: "manual" | "device_adms" | "device_pull",
  verifyMethod: PunchVerifyMethod | null,
): { glyph: string; label: string; full: string } {
  if (source === "manual") {
    return { glyph: "✍", label: "Manual", full: "Manual entry" };
  }
  switch (verifyMethod) {
    case "fingerprint":
      return { glyph: "👆", label: "Finger", full: "Device · fingerprint" };
    case "face":
      return { glyph: "🙂", label: "Face", full: "Device · face recognition" };
    case "card":
      return { glyph: "💳", label: "Card", full: "Device · card scan" };
    case "password":
      return { glyph: "🔢", label: "PIN", full: "Device · password / PIN" };
    case "palm":
      return { glyph: "🤚", label: "Palm", full: "Device · palm scan" };
    case "other":
      return { glyph: "📱", label: "Device", full: "Device · unrecognized verify mode" };
    case null:
      return { glyph: "📱", label: "Device", full: "Device punch" };
  }
}
