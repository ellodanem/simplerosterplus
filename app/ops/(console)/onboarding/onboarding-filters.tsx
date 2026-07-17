"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { ONBOARDING_STAGES } from "@/lib/onboarding-funnel/stages";
import { STAGE_LABELS } from "@/lib/ops/onboarding-data";

export function OnboardingFilters({
  range,
  from,
  to,
}: {
  range: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      }
      if (!("page" in patch)) params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  const presets: Array<{ id: string; label: string }> = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 days" },
    { id: "30d", label: "Last 30 days" },
    { id: "90d", label: "Last 90 days" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className={`space-y-3 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => update({ range: p.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              range === p.id
                ? "bg-emerald-700 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {range === "custom" ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            update({
              range: "custom",
              from: String(fd.get("from") || ""),
              to: String(fd.get("to") || ""),
            });
          }}
        >
          <label className="text-xs text-zinc-600">
            From
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            To
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Apply
          </button>
        </form>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          update({
            q: String(fd.get("q") || "") || null,
            stage: String(fd.get("stage") || "") || null,
            activated: String(fd.get("activated") || "") || null,
            stalled: String(fd.get("stalled") || "") || null,
            followUp: String(fd.get("followUp") || "") || null,
            doNotContact: String(fd.get("doNotContact") || "") || null,
            source: String(fd.get("source") || "") || null,
          });
        }}
      >
        <label className="text-xs text-zinc-600">
          Search
          <input
            name="q"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Name, email, business…"
            className="mt-1 block w-56 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-zinc-600">
          Stage
          <select
            name="stage"
            defaultValue={searchParams.get("stage") ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {ONBOARDING_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Activated
          <select
            name="activated"
            defaultValue={searchParams.get("activated") ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="yes">Activated</option>
            <option value="no">Not activated</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Stalled
          <select
            name="stalled"
            defaultValue={searchParams.get("stalled") ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="yes">Stalled</option>
            <option value="no">Active</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Follow-up
          <select
            name="followUp"
            defaultValue={searchParams.get("followUp") ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="due">Due / recommended</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Do not contact
          <select
            name="doNotContact"
            defaultValue={searchParams.get("doNotContact") ?? ""}
            className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Source
          <input
            name="source"
            defaultValue={searchParams.get("source") ?? ""}
            placeholder="e.g. self_serve"
            className="mt-1 block w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Filter
        </button>
      </form>
    </div>
  );
}
