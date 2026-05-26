"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/components/modal";

type Option = {
  code: string;
  name: string;
};

type HolidayCalendarResponse = {
  holidayCountryCode?: string | null;
  holidaySubdivisionCode?: string | null;
  syncYears?: number[];
  importedCount?: number;
  manualOverrideCount?: number;
  countries?: Option[];
  subdivisions?: Option[];
  error?: string;
};

export function HolidayCalendarSettings({
  initialCountryCode,
  initialSubdivisionCode,
  initialSyncYears,
  initialCountries,
  initialSubdivisions,
  onClose,
  onSaved,
}: {
  initialCountryCode: string | null;
  initialSubdivisionCode: string | null;
  initialSyncYears: number[];
  initialCountries: Option[];
  initialSubdivisions: Option[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [loadingSubdivisions, setLoadingSubdivisions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [country, setCountry] = useState(initialCountryCode ?? "");
  const [subdivision, setSubdivision] = useState(initialSubdivisionCode ?? "");
  const [countries] = useState<Option[]>(initialCountries);
  const [subdivisions, setSubdivisions] = useState<Option[]>(initialSubdivisions);
  const [syncYears] = useState<number[]>(initialSyncYears);

  const countryName = useMemo(
    () => countries.find((option) => option.code === country)?.name ?? country,
    [countries, country],
  );
  const subdivisionName = useMemo(
    () => subdivisions.find((option) => option.code === subdivision)?.name ?? subdivision,
    [subdivisions, subdivision],
  );

  async function loadOptions(requestedCountry?: string) {
    const query = requestedCountry ? `?countryCode=${encodeURIComponent(requestedCountry)}` : "";
    try {
      const res = await fetch(`/api/roster/holiday-calendar${query}`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as HolidayCalendarResponse;
      if (!res.ok) {
        setError(body.error ?? "Could not load holiday calendar settings.");
        return;
      }
      setSubdivisions(body.subdivisions ?? []);
    } catch {
      setError("Network error while loading holiday calendar settings.");
    } finally {
      setLoadingSubdivisions(false);
    }
  }

  async function onCountryChange(nextCountry: string) {
    setCountry(nextCountry);
    setSubdivision("");
    setSubdivisions([]);
    setError(null);
    if (!nextCountry) {
      return;
    }
    setLoadingSubdivisions(true);
    await loadOptions(nextCountry);
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/roster/holiday-calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidayCountryCode: country || null,
          holidaySubdivisionCode: subdivision || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as HolidayCalendarResponse;
      if (!res.ok) {
        setError(body.error ?? "Could not save holiday calendar settings.");
        setPending(false);
        return;
      }

      const savedYears = body.syncYears ?? [];
      const importedCount = body.importedCount ?? 0;
      const manualOverrideCount = body.manualOverrideCount ?? 0;
      onClose();
      router.refresh();
      if (!country) {
        onSaved("Holiday calendar disabled for this location.");
        return;
      }

      const yearsLabel =
        savedYears.length > 1
          ? `${savedYears[0]}-${savedYears[savedYears.length - 1]}`
          : String(savedYears[0] ?? "");
      const scope = subdivisionName ? `${countryName} (${subdivisionName})` : countryName;
      const manualSuffix =
        manualOverrideCount > 0
          ? ` ${manualOverrideCount} manual holiday override${manualOverrideCount === 1 ? " remains" : "s remain"}.`
          : "";
      onSaved(
        `Holiday calendar synced for ${scope}. Imported ${importedCount} holidays for ${yearsLabel}.${manualSuffix}`,
      );
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Holiday Calendar" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Pick the default location&apos;s country so SRP can automatically label major holidays on
          the roster. Imported holidays stay schedulable by default; they only become blocking days
          when marked closed later.
        </p>

        <div>
          <label
            htmlFor="holiday-country"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Country
          </label>
          <select
            id="holiday-country"
            value={country}
            onChange={(e) => void onCountryChange(e.target.value)}
            disabled={pending}
            className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">None</option>
            {countries.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {country && subdivisions.length > 0 ? (
          <div>
            <label
              htmlFor="holiday-subdivision"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
            >
              State / province / region
            </label>
            <select
              id="holiday-subdivision"
              value={subdivision}
              onChange={(e) => setSubdivision(e.target.value)}
              disabled={pending || loadingSubdivisions}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">National holidays only</option>
              {subdivisions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            {loadingSubdivisions ? (
              <p className="mt-1 text-xs text-zinc-500">Loading subdivisions…</p>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-semibold uppercase tracking-wide text-zinc-500">Sync window</p>
          <p className="mt-1">
            Saving refreshes the holiday list for{" "}
            <span className="font-medium">
              {syncYears.length > 1
                ? `${syncYears[0]}-${syncYears[syncYears.length - 1]}`
                : syncYears[0] ?? "the selected years"}
            </span>
            .
          </p>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || loadingSubdivisions}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save & sync"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
