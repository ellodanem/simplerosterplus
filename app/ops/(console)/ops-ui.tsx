import type { ReactNode } from "react";

// Shared, server-renderable presentational pieces for the operator console. Tones map to
// the SR+ palette (emerald = ok, amber = warn, rose = danger, zinc = neutral) so the
// console matches the tenant app. See docs/OPERATOR_CONSOLE.md (Visual consistency).

export type Tone = "ok" | "warn" | "danger" | "neutral";

const TONE_PILL: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-rose-100 text-rose-800",
  neutral: "bg-zinc-200 text-zinc-700",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE_PILL[tone]}`}
    >
      {children}
    </span>
  );
}

export type StatTint = "emerald" | "sky" | "amber" | "violet" | "teal";

const STAT_TINT: Record<StatTint, string> = {
  emerald: "border-emerald-100 bg-emerald-50/80",
  sky: "border-sky-100 bg-sky-50/80",
  amber: "border-amber-100 bg-amber-50/80",
  violet: "border-violet-100 bg-violet-50/70",
  teal: "border-teal-100 bg-teal-50/80",
};

export function StatCard({
  label,
  value,
  hint,
  tint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Soft background tint — overview KPIs use this to stay distinct at a glance. */
  tint?: StatTint;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${tint ? STAT_TINT[tint] : "border-zinc-200 bg-white"}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// Lightweight inline SVG area sparkline — avoids adding a charting dependency.
export function Sparkline({
  points,
  width = 560,
  height = 120,
  className = "text-emerald-600",
}: {
  points: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (points.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-zinc-400">
        No data yet
      </div>
    );
  }
  const max = Math.max(...points, 1);
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - (p / max) * (height - 8) - 4;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`h-[120px] w-full ${className}`}
      role="img"
      aria-label="Trend sparkline"
    >
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
