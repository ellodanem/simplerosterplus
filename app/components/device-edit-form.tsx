"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { TimeZoneCombobox } from "@/app/components/timezone-combobox";
import type { ConnectionMode } from "@/lib/device-input";

export type DeviceEditValues = {
  id: string;
  name: string;
  locationId: string;
  serialNumber: string;
  /** True once the device has reported in (`lastSeenAt !== null`); locks the serial input. */
  serialLocked: boolean;
  connectionMode: ConnectionMode;
  ipAddress: string;
  /** String form for `<input type="number">`; "" means "unset". */
  port: string;
  timeZone: string;
  notes: string;
  enabled: boolean;
};

export type LocationOption = { id: string; name: string };

export type DeviceReportedFields = {
  model: string | null;
  firmwareVersion: string | null;
  lastSeenAt: Date | null;
  lastUserCount: number | null;
  lastFingerprintCount: number | null;
  lastPunchCount: number | null;
};

export function DeviceEditForm({
  initial,
  locations,
  reported,
}: {
  initial: DeviceEditValues;
  locations: LocationOption[];
  reported: DeviceReportedFields;
}) {
  const router = useRouter();
  const [v, setV] = useState<DeviceEditValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function update<K extends keyof DeviceEditValues>(key: K, value: DeviceEditValues[K]) {
    setV((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const portTrimmed = v.port.trim();
      const portValue = portTrimmed === "" ? null : Number(portTrimmed);
      const body: Record<string, unknown> = {
        name: v.name,
        locationId: v.locationId,
        connectionMode: v.connectionMode,
        ipAddress: v.ipAddress,
        port: portValue,
        timeZone: v.timeZone,
        notes: v.notes,
        enabled: v.enabled,
      };
      // Only send serialNumber when it's editable (server also enforces this).
      if (!v.serialLocked) {
        body.serialNumber = v.serialNumber;
      }
      const res = await fetch(`/api/devices/${encodeURIComponent(v.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save changes");
        return;
      }
      setNotice("Device updated.");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(v.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not remove device");
        setDeleting(false);
        return;
      }
      router.push("/devices");
    } catch {
      setDeleting(false);
    }
  }

  const showPullFields = v.connectionMode === "pull_tcp";

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        <Section title="Identity & assignment">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="d-name"
              label="Name"
              required
              value={v.name}
              onChange={(x) => update("name", x)}
              help="Unique within this location."
            />
            <SelectField
              id="d-loc"
              label="Location"
              value={v.locationId}
              onChange={(x) => update("locationId", x)}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
            <div className="sm:col-span-2">
              <Field
                id="d-notes"
                label="Notes"
                value={v.notes}
                onChange={(x) => update("notes", x)}
                help="Free-text. Visible only inside the app."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="size-4 rounded border-zinc-300"
                  checked={v.enabled}
                  onChange={(e) => update("enabled", e.target.checked)}
                />
                Enabled (accept punches and run sync jobs for this device)
              </label>
            </div>
          </div>
        </Section>

        <Section title="Connection">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              id="d-mode"
              label="Mode"
              value={v.connectionMode}
              onChange={(x) => update("connectionMode", x as ConnectionMode)}
              options={[
                { value: "adms_push", label: "ADMS push (device calls us)" },
                { value: "pull_tcp", label: "Pull TCP (we call the device)" },
              ]}
            />
            <Field
              id="d-serial"
              label="Serial number"
              value={v.serialNumber}
              onChange={(x) => update("serialNumber", x)}
              disabled={v.serialLocked}
              help={
                v.serialLocked
                  ? "Locked: this device has reported in. Soft-delete and re-add if the hardware changed."
                  : "From the back of the device. Locked once the first ADMS callback or pull arrives."
              }
            />
            <Field
              id="d-ip"
              label="IP address"
              value={v.ipAddress}
              onChange={(x) => update("ipAddress", x)}
              help={
                showPullFields
                  ? "Required for pull TCP."
                  : "Optional for ADMS push (informational)."
              }
            />
            <Field
              id="d-port"
              label="Port"
              type="number"
              value={v.port}
              onChange={(x) => update("port", x)}
              help={
                showPullFields
                  ? "ZKTeco default is 4370."
                  : "Optional for ADMS push (informational)."
              }
            />
            <TimeZoneCombobox
              id="d-tz"
              label="Time zone override"
              value={v.timeZone}
              onChange={(x) => update("timeZone", x)}
              placeholder="e.g. America/Toronto"
              help="IANA. Type to search; leave blank to inherit from the location."
            />
          </div>
        </Section>

        <ReportedPanel reported={reported} />

        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/devices")}
            disabled={saving || deleting}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>

        <DangerZone
          deviceName={initial.name}
          disabled={saving || deleting}
          onRequestDelete={() => setConfirmOpen(true)}
        />
      </form>

      <Modal
        open={confirmOpen}
        onClose={() => (deleting ? undefined : setConfirmOpen(false))}
        title="Remove device"
        size="md"
      >
        <ConfirmDeleteBody
          deviceName={initial.name}
          pending={deleting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={onConfirmDelete}
        />
      </Modal>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ReportedPanel({ reported }: { reported: DeviceReportedFields }) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Model", value: reported.model ?? "—" },
    { label: "Firmware", value: reported.firmwareVersion ?? "—" },
    {
      label: "Last seen",
      value: reported.lastSeenAt ? reported.lastSeenAt.toLocaleString() : "Never",
    },
    {
      label: "Users",
      value: reported.lastUserCount == null ? "—" : String(reported.lastUserCount),
    },
    {
      label: "Fingerprints",
      value:
        reported.lastFingerprintCount == null ? "—" : String(reported.lastFingerprintCount),
    },
    {
      label: "Punches (cached)",
      value: reported.lastPunchCount == null ? "—" : String(reported.lastPunchCount),
    },
  ];
  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800">Reported by device</h2>
        <span className="text-xs text-zinc-500">Read-only — refreshed on sync</span>
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{it.label}</dt>
            <dd className="mt-0.5 text-zinc-800">{it.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DangerZone({
  deviceName,
  disabled,
  onRequestDelete,
}: {
  deviceName: string;
  disabled: boolean;
  onRequestDelete: () => void;
}) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="text-sm font-semibold text-red-900">Danger zone</h2>
      <p className="mt-1 text-sm text-red-800">
        Removing <span className="font-semibold">{deviceName}</span> hides it from the device list
        and stops sync. Historical punches stay attributed to it. The row can be permanently
        purged later from a &quot;Recently removed&quot; view.
      </p>
      <button
        type="button"
        onClick={onRequestDelete}
        disabled={disabled}
        className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        Remove device…
      </button>
    </section>
  );
}

function ConfirmDeleteBody({
  deviceName,
  pending,
  onCancel,
  onConfirm,
}: {
  deviceName: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === deviceName;
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-700">
        This soft-deletes the device. To confirm, type its name exactly:
      </p>
      <p className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-800">
        {deviceName}
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoFocus
        placeholder="Type the device name"
        className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
      />
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!matches || pending}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Removing…" : "Remove device"}
        </button>
      </div>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  help?: string;
}) {
  const { id, label, value, onChange, type, required, disabled, help } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm disabled:bg-zinc-100 disabled:text-zinc-500"
      />
      {help ? <p className="mt-1 text-xs text-zinc-500">{help}</p> : null}
    </div>
  );
}

function SelectField(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const { id, label, value, onChange, options } = props;
  return (
    <div>
      <label className="text-xs font-medium text-zinc-600" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
