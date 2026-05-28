"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TimeZoneCombobox } from "@/app/components/timezone-combobox";
import { WEEKDAY_OPTIONS, weekStartWeekdayLabel } from "@/lib/roster-week-settings";
import { TemplatesManager, type Template } from "@/app/(authenticated)/roster/templates-manager";
import { AddStaffForm } from "@/app/components/add-staff-form";
import {
  TaxonomyListManager,
  type TaxonomyItem,
} from "@/app/components/taxonomy-list-manager";
import type { SetupCompleteness, SetupState } from "@/lib/onboarding";
import { OvertimeSettingsModal } from "@/app/components/overtime-settings-modal";
import { ROLE_PRESETS } from "@/lib/role-presets";

type StepId = "business" | "shifts" | "roles" | "staff" | "attendance" | "go-live";

export function SetupWizard({
  initialState,
  initialCompleteness,
  initialTemplates,
  initialRoles,
  initialLocations,
  initialStaffCount,
}: {
  initialState: SetupState;
  initialCompleteness: SetupCompleteness;
  initialTemplates: Template[];
  initialRoles: TaxonomyItem[];
  initialLocations: Array<{ id: string; name: string }>;
  initialStaffCount: number;
}) {
  const router = useRouter();

  const [step, setStep] = useState<StepId>("business");
  const [state, setState] = useState<SetupState>(initialState);
  const [completeness, setCompleteness] = useState<SetupCompleteness>(initialCompleteness);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [roles, setRoles] = useState<TaxonomyItem[]>(initialRoles);
  const [staffCount, setStaffCount] = useState<number>(initialStaffCount);

  const [orgName, setOrgName] = useState(state.organization.name);
  const [timeZone, setTimeZone] = useState(state.organization.timeZone);
  const [locationName, setLocationName] = useState(state.defaultLocation?.name ?? "Main");
  const [weekStart, setWeekStart] = useState<number>(state.rosterWeekStartWeekday);
  const [businessSaving, setBusinessSaving] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);

  const [graceMinutes, setGraceMinutes] = useState<string>(String(state.attendanceGraceMinutes));
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [showOvertime, setShowOvertime] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const progress = useMemo(() => {
    const order: StepId[] = ["business", "shifts", "roles", "staff", "attendance", "go-live"];
    return { order, index: order.indexOf(step) };
  }, [step]);

  async function refreshState() {
    const res = await fetch("/api/setup/state", { method: "GET" });
    const body = (await res.json().catch(() => ({}))) as
      | { state: SetupState; completeness: SetupCompleteness }
      | { error?: string };
    if (!res.ok || !("state" in body)) return;
    setState(body.state);
    setCompleteness(body.completeness);
  }

  async function saveBusiness() {
    setBusinessError(null);
    setBusinessSaving(true);
    try {
      const res = await fetch("/api/setup/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: orgName,
          timeZone,
          defaultLocationName: locationName,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBusinessError(body.error ?? "Could not save.");
        return;
      }

      const res2 = await fetch("/api/roster/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartWeekday: weekStart }),
      });
      const body2 = (await res2.json().catch(() => ({}))) as { error?: string };
      if (!res2.ok) {
        setBusinessError(body2.error ?? "Could not save week start.");
        return;
      }

      await refreshState();
      setToast("Saved business settings.");
      setStep("shifts");
    } finally {
      setBusinessSaving(false);
    }
  }

  async function saveAttendance() {
    setAttendanceError(null);
    setAttendanceSaving(true);
    try {
      const parsed = Number(graceMinutes);
      const res = await fetch("/api/attendance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ graceMinutes: Number.isFinite(parsed) ? parsed : graceMinutes }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; graceMinutes?: number };
      if (!res.ok) {
        setAttendanceError(body.error ?? "Could not save grace window.");
        return;
      }
      setToast(`Grace window set to ${body.graceMinutes ?? graceMinutes} min.`);
      await refreshState();
      setStep("go-live");
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function finishSetup() {
    const res = await fetch("/api/setup/complete", { method: "POST" });
    if (!res.ok) return;
    try {
      sessionStorage.setItem("srp_setup_incomplete", "0");
    } catch {
      // ignore
    }
    router.push("/");
    router.refresh();
  }

  const canGoLive = completeness.complete;

  return (
    <div className="space-y-6">
      <ProgressBar steps={progress.order} current={step} />

      {toast ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      ) : null}

      {step === "business" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Business</h2>
          <p className="mt-1 text-sm text-zinc-600">
            These settings control calendar logic across roster and attendance.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              id="org-name"
              label="Organization name"
              required
              value={orgName}
              onChange={setOrgName}
            />
            <Field
              id="loc-name"
              label="Default location"
              required
              value={locationName}
              onChange={setLocationName}
              help="Single-location orgs can leave this as Main."
            />
            <div className="sm:col-span-2">
              <TimeZoneCombobox
                id="tz"
                label="Timezone (IANA)"
                required
                value={timeZone}
                onChange={setTimeZone}
                help="Example: America/Toronto. Used to determine week boundaries and calendar days."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600" htmlFor="week-start">
                Week starts on
              </label>
              <select
                id="week-start"
                value={String(weekStart)}
                onChange={(e) => setWeekStart(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
              >
                {WEEKDAY_OPTIONS.map((o) => (
                  <option key={o.value} value={String(o.value)}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                Roster weeks snap to {weekStartWeekdayLabel(weekStart)}.
              </p>
            </div>
          </div>

          {businessError ? <p className="mt-3 text-sm text-red-600">{businessError}</p> : null}

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={saveBusiness}
              disabled={businessSaving || !orgName.trim() || !timeZone.trim() || !locationName.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {businessSaving ? "Saving…" : "Save and continue"}
            </button>
          </div>
        </section>
      ) : null}

      {step === "shifts" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Shift presets</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Create the shifts you’ll assign on the roster.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("business")}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  await refreshState();
                  setStep("roles");
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Continue
              </button>
            </div>
          </div>

          <div className="mt-4">
            <TemplatesManager
              initial={templates}
              onChange={(next) => {
                setTemplates(next);
                setTimeout(refreshState, 0);
              }}
            />
          </div>

          {templates.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700">
              Add at least one preset to continue.
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "roles" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Roles</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Job titles for your team. Click common roles or type your own.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("shifts")}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  await refreshState();
                  setStep("staff");
                }}
                disabled={roles.length === 0}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>

          <div className="mt-4">
            <TaxonomyListManager
              kind="role"
              apiBase="/api/roles"
              initial={roles}
              presets={ROLE_PRESETS}
              onChange={setRoles}
            />
          </div>

          {roles.length === 0 ? (
            <p className="mt-3 text-sm text-amber-700">Add at least one role to continue.</p>
          ) : null}
        </section>
      ) : null}

      {step === "staff" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Staff</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Add a few people so you can start building the week. Location and role are required.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("roles")}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  await refreshState();
                  setStep("attendance");
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Continue
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            Current staff count: <span className="font-semibold">{staffCount}</span>{" "}
            <span className="text-zinc-500">
              (you can always manage details later on{" "}
              <Link href="/staff" className="font-medium text-emerald-800 hover:text-emerald-950">
                Staff
              </Link>
              )
            </span>
          </div>

          <div className="mt-4">
            <AddStaffForm
              requiredOnly
              variant="page"
              locations={initialLocations}
              roles={roles.map(({ id, name }) => ({ id, name }))}
              onRolesChange={(next) =>
                setRoles(next.map((r) => ({ ...r, sortOrder: 0, staffCount: 0 })))
              }
              onSuccess={() => {
                setStaffCount((n) => n + 1);
                setTimeout(refreshState, 0);
              }}
            />
          </div>
        </section>
      ) : null}

      {step === "attendance" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Attendance</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Keep it simple. These settings affect how attendance is classified.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("staff")}
                className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Back
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Grace window</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Minutes after shift start before a punch is counted as late.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={240}
                  step={1}
                  value={graceMinutes}
                  onChange={(e) => setGraceMinutes(e.target.value)}
                  className="w-28 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <span className="text-sm text-zinc-600">minutes</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Overtime alerts</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Optional. Flags staff nearing weekly overtime (roster vs attendance).
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOvertime(true)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Configure
                </button>
                <span className="text-xs text-zinc-500">
                  Currently:{" "}
                  <span className="font-mono">
                    {state.overtime.enabled ? "enabled" : "disabled"} ·{" "}
                    {state.overtime.weeklyThresholdHours}h/week
                  </span>
                </span>
              </div>
            </div>
          </div>

          {attendanceError ? <p className="mt-3 text-sm text-red-600">{attendanceError}</p> : null}

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={saveAttendance}
              disabled={attendanceSaving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {attendanceSaving ? "Saving…" : "Save and continue"}
            </button>
          </div>

          {showOvertime ? (
            <OvertimeSettingsModal
              initialSettings={state.overtime}
              onClose={() => setShowOvertime(false)}
              onSaved={(settings, message) => {
                setShowOvertime(false);
                setToast(message);
                setState((s) => ({ ...s, overtime: settings }));
                setTimeout(refreshState, 0);
              }}
            />
          ) : null}
        </section>
      ) : null}

      {step === "go-live" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Go live</h2>
          <p className="mt-1 text-sm text-zinc-600">
            You’re ready once you have a location, shift presets, roles, and at least one staff member.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryRow
              label="Organization"
              value={`${state.organization.name} · ${state.organization.timeZone}`}
              ok
            />
            <SummaryRow
              label="Default location"
              value={state.defaultLocation?.name ?? "Missing"}
              ok={Boolean(state.defaultLocation)}
            />
            <SummaryRow label="Shift presets" value={String(templates.length)} ok={templates.length > 0} />
            <SummaryRow label="Roles" value={String(roles.length)} ok={roles.length > 0} />
            <SummaryRow label="Staff" value={String(staffCount)} ok={staffCount > 0} />
          </div>

          {!canGoLive ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Missing: <span className="font-semibold">{completeness.missing.join(", ")}</span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={() => setStep("attendance")}
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              <Link
                href="/devices"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Connect a device (optional)
              </Link>
              <button
                type="button"
                onClick={finishSetup}
                disabled={!canGoLive}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                Open the app
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProgressBar({ steps, current }: { steps: StepId[]; current: StepId }) {
  const labels: Record<StepId, string> = {
    business: "Business",
    shifts: "Shifts",
    roles: "Roles",
    staff: "Staff",
    attendance: "Attendance",
    "go-live": "Go live",
  };
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {steps.map((s) => {
          const active = s === current;
          return (
            <li
              key={s}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                active ? "bg-emerald-50 text-emerald-900" : "bg-zinc-50 text-zinc-600"
              }`}
            >
              <span className={`text-xs font-semibold ${active ? "text-emerald-800" : "text-zinc-500"}`}>
                {labels[s]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
        </div>
        <span
          className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }`}
        >
          {ok ? "OK" : "Missing"}
        </span>
      </div>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  help?: string;
}) {
  const { id, label, value, onChange, required, help } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      {help ? <p className="mt-1 text-xs text-zinc-500">{help}</p> : null}
    </div>
  );
}

