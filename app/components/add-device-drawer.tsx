"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import type { ConnectionMode } from "@/lib/device-input";

export type LocationOption = { id: string; name: string };

type Pairing = {
  serverHost: string;
  serverPort: number;
  serverPath: string;
  commKey: string;
};

type FormState = {
  name: string;
  locationId: string;
  notes: string;
  serialNumber: string;
  ipAddress: string;
  port: string;
};

function emptyForm(defaultLocationId: string): FormState {
  return {
    name: "",
    locationId: defaultLocationId,
    notes: "",
    serialNumber: "",
    ipAddress: "",
    port: "4370",
  };
}

export function AddDeviceButton({ locations }: { locations: LocationOption[] }) {
  const [open, setOpen] = useState(false);
  const disabled = locations.length === 0;
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        title={
          disabled
            ? "No locations exist for this organization yet"
            : "Add a ZKTeco terminal"
        }
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        Add device
      </button>
      <AddDeviceDrawer
        open={open}
        onClose={() => setOpen(false)}
        locations={locations}
      />
    </>
  );
}

function AddDeviceDrawer({
  open,
  onClose,
  locations,
}: {
  open: boolean;
  onClose: () => void;
  locations: LocationOption[];
}) {
  const router = useRouter();
  const defaultLocationId = locations[0]?.id ?? "";

  const [mode, setMode] = useState<ConnectionMode>("adms_push");
  const [form, setForm] = useState<FormState>(emptyForm(defaultLocationId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [savedDeviceName, setSavedDeviceName] = useState<string | null>(null);

  function reset() {
    setMode("adms_push");
    setForm(emptyForm(defaultLocationId));
    setError(null);
    setSaving(false);
    setPairing(null);
    setSavedDeviceName(null);
  }

  function handleClose() {
    if (saving) return;
    onClose();
    // Defer reset so we don't see fields wiped during the close transition.
    setTimeout(reset, 0);
    if (savedDeviceName) {
      // A device was created in this session; surface it in the list.
      router.refresh();
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const portTrimmed = form.port.trim();
      const portValue =
        mode === "pull_tcp" && portTrimmed !== "" ? Number(portTrimmed) : null;
      const body: Record<string, unknown> = {
        name: form.name,
        locationId: form.locationId,
        connectionMode: mode,
        notes: form.notes,
      };
      if (mode === "pull_tcp") {
        body.serialNumber = form.serialNumber;
        body.ipAddress = form.ipAddress;
        body.port = portValue;
      }
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        device?: { name: string };
        pairing?: Pairing | null;
      };
      if (!res.ok) {
        setError(data.error || "Could not add device");
        return;
      }
      setSavedDeviceName(data.device?.name ?? form.name);
      setPairing(data.pairing ?? null);
    } finally {
      setSaving(false);
    }
  }

  const showLocation = locations.length > 1;
  const isPairingScreen = savedDeviceName !== null;
  const title = isPairingScreen
    ? mode === "adms_push"
      ? "Configure your device"
      : "Device added"
    : "Add device";

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {isPairingScreen ? (
        <PostCreatePanel
          deviceName={savedDeviceName ?? ""}
          pairing={pairing}
          onClose={handleClose}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <ModeTabs mode={mode} onChange={setMode} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="ad-name"
              label="Name"
              required
              value={form.name}
              onChange={(x) => update("name", x)}
              help="Unique within this location."
            />
            {showLocation ? (
              <SelectField
                id="ad-loc"
                label="Location"
                value={form.locationId}
                onChange={(x) => update("locationId", x)}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
              />
            ) : null}

            {mode === "pull_tcp" ? (
              <>
                <Field
                  id="ad-serial"
                  label="Serial number"
                  value={form.serialNumber}
                  onChange={(x) => update("serialNumber", x)}
                  help="Printed on the back of the device. Required so we can route punches."
                />
                <Field
                  id="ad-ip"
                  label="IP address"
                  required
                  value={form.ipAddress}
                  onChange={(x) => update("ipAddress", x)}
                  help="LAN IP, e.g. 192.168.1.201."
                />
                <Field
                  id="ad-port"
                  label="Port"
                  type="number"
                  value={form.port}
                  onChange={(x) => update("port", x)}
                  help="ZKTeco default is 4370."
                />
              </>
            ) : null}

            <div className="sm:col-span-2">
              <Field
                id="ad-notes"
                label="Notes"
                value={form.notes}
                onChange={(x) => update("notes", x)}
                help="Optional. Visible only inside the app."
              />
            </div>
          </div>

          <ModeHint mode={mode} />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="text-sm text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim() || !form.locationId}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add device"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: ConnectionMode;
  onChange: (m: ConnectionMode) => void;
}) {
  const tabs: Array<{ value: ConnectionMode; label: string; sub: string }> = [
    {
      value: "adms_push",
      label: "Pair via ADMS",
      sub: "Device calls our server",
    },
    {
      value: "pull_tcp",
      label: "Add by IP / port",
      sub: "We call the device",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
      {tabs.map((t) => {
        const active = t.value === mode;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`rounded-md px-3 py-2 text-left transition-colors ${
              active
                ? "bg-white shadow-sm ring-1 ring-zinc-200"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <div
              className={`text-sm font-semibold ${
                active ? "text-zinc-900" : "text-zinc-700"
              }`}
            >
              {t.label}
            </div>
            <div className="text-xs text-zinc-500">{t.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function ModeHint({ mode }: { mode: ConnectionMode }) {
  if (mode === "adms_push") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        We&apos;ll generate a one-time communication key after you add the device (optional on many
        F22 units — ADMS v1 matches devices by serial number only). Enter the server address on the
        terminal; the serial number is captured on the first callback.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
      Pull mode requires reachable network from this server to the device. Test connection (and
      the actual sync job) lands with the ADMS/pull plumbing pass.
    </div>
  );
}

function PostCreatePanel({
  deviceName,
  pairing,
  onClose,
}: {
  deviceName: string;
  pairing: Pairing | null;
  onClose: () => void;
}) {
  if (!pairing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-700">
          <span className="font-semibold">{deviceName}</span> is in your devices list. Once the
          pull-sync job exists, it will fetch users and punches on the configured schedule.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">
        On the device&apos;s <span className="font-semibold">Network → Cloud Server Setting</span>{" "}
        (or <span className="font-semibold">ADMS</span>) screen, enter the values below and save.
        The device will reach out, and <span className="font-semibold">{deviceName}</span> will
        flip to <span className="font-semibold">Online</span> on the list.
      </p>

      <dl className="grid gap-3 sm:grid-cols-2">
        <PairingRow label="Server address" value={pairing.serverHost} />
        <PairingRow label="Server port" value={String(pairing.serverPort)} />
        <PairingRow label="Server path" value={pairing.serverPath} />
        <PairingRow label="HTTPS" value={pairing.serverPort === 443 ? "Yes" : "No"} />
        <div className="sm:col-span-2">
          <PairingRow
            label="Communication key"
            value={pairing.commKey}
            mono
            warn="Shown once. Copy it now — we only store its hash."
          />
        </div>
      </dl>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        If <span className="font-mono">{pairing.serverHost}</span> isn&apos;t publicly reachable
        (e.g. you&apos;re running locally), the device won&apos;t be able to call back. Use the
        public host the operator can route to from the device LAN.
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          I&apos;ve configured it
        </button>
      </div>
    </div>
  );
}

function PairingRow({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: string;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded bg-zinc-100 px-2 py-1 text-zinc-800 ${
            mono ? "font-mono text-sm" : "text-sm"
          }`}
        >
          {value}
        </code>
        <CopyButton value={value} />
      </dd>
      {warn ? <p className="mt-1 text-xs text-amber-700">{warn}</p> : null}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available (insecure context, etc.); silent failure is fine here.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Field(props: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  help?: string;
}) {
  const { id, label, value, onChange, type, required, help } = props;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
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
