"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import type { ConnectionMode } from "@/lib/device-input";

export type LocationOption = { id: string; name: string };

type Pairing = {
  publicBaseUrl: string;
  pushUrl: string;
  pollUrl: string;
  commKey: string;
  serverHost: string;
  serverPort: number;
  serverPath: string;
};

type FormState = {
  name: string;
  locationId: string;
  serialNumber: string;
  ipAddress: string;
  port: string;
};

function emptyForm(defaultLocationId: string): FormState {
  return {
    name: "",
    locationId: defaultLocationId,
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
      <AddDeviceDrawer open={open} onClose={() => setOpen(false)} locations={locations} />
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
  const [showPullTcp, setShowPullTcp] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(defaultLocationId));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [savedDeviceName, setSavedDeviceName] = useState<string | null>(null);

  function reset() {
    setMode("adms_push");
    setShowPullTcp(false);
    setForm(emptyForm(defaultLocationId));
    setError(null);
    setSaving(false);
    setPairing(null);
    setSavedDeviceName(null);
  }

  function handleClose() {
    if (saving) return;
    onClose();
    setTimeout(reset, 0);
    if (savedDeviceName) {
      router.refresh();
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function openPullTcp() {
    setShowPullTcp(true);
    setMode("pull_tcp");
  }

  function backToAdms() {
    setShowPullTcp(false);
    setMode("adms_push");
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
        serialNumber: form.serialNumber,
      };
      if (mode === "pull_tcp") {
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
  const title = isPairingScreen ? "Set up your terminal" : "Add device";

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      {isPairingScreen ? (
        <PostCreatePanel
          deviceName={savedDeviceName ?? ""}
          pairing={pairing}
          mode={mode}
          onClose={handleClose}
        />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {showPullTcp ? <PullTcpBanner onBack={backToAdms} /> : null}

          <p className="text-sm text-zinc-600">
            {showPullTcp
              ? "On-site setup only. Most customers use cloud setup instead."
              : "Add your device here first. We\u2019ll show you what to enter on the terminal next."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="ad-name"
              label="Device name"
              required
              placeholder="e.g. Front door"
              value={form.name}
              onChange={(x) => update("name", x)}
            />
            <Field
              id="ad-serial"
              label="Serial number"
              required
              placeholder="From the sticker on the device"
              value={form.serialNumber}
              onChange={(x) => update("serialNumber", x)}
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

            {showPullTcp ? (
              <>
                <Field
                  id="ad-ip"
                  label="IP address"
                  required
                  placeholder="e.g. 192.168.1.201"
                  value={form.ipAddress}
                  onChange={(x) => update("ipAddress", x)}
                />
                <Field
                  id="ad-port"
                  label="Port"
                  type="number"
                  value={form.port}
                  onChange={(x) => update("port", x)}
                />
              </>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {!showPullTcp ? (
              <button
                type="button"
                onClick={openPullTcp}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                On-site setup
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
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
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.locationId ||
                  !form.serialNumber.trim() ||
                  (showPullTcp && !form.ipAddress.trim())
                }
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Continue"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function PullTcpBanner({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p>On-site setup is not available in the cloud app yet.</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-1 text-sm font-medium text-amber-900 underline hover:text-amber-950"
      >
        Use cloud setup instead
      </button>
    </div>
  );
}

function PostCreatePanel({
  deviceName,
  pairing,
  mode,
  onClose,
}: {
  deviceName: string;
  pairing: Pairing | null;
  mode: ConnectionMode;
  onClose: () => void;
}) {
  if (!pairing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-700">
          <span className="font-semibold">{deviceName}</span> is in your devices list.
          {mode === "pull_tcp" ? " On-site sync is not available yet." : null}
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

  const server = {
    serverHost: pairing.serverHost,
    serverPort: pairing.serverPort,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">
        <span className="font-semibold">{deviceName}</span> is saved. On the device, open{" "}
        <span className="font-semibold">Menu → Cloud Server</span> and enter:
      </p>

      {server.serverHost ? (
        <dl className="grid gap-3 sm:grid-cols-3">
          <CopyField label="Server address" value={server.serverHost} highlight />
          <CopyField label="Port" value={String(server.serverPort)} highlight />
          <CopyField label="Protocol" value="HTTPS" highlight />
        </dl>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The server address is not set yet. Use <span className="font-semibold">Public URL</span>{" "}
          on the Devices page, then open this device again.
        </p>
      )}

      <p className="text-sm text-zinc-600">
        Turn on <span className="font-semibold">real-time attendance</span>, save, and you&apos;re
        done. This device will show as active once it connects.
      </p>

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer hover:text-zinc-700">Technical details</summary>
        <dl className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <CopyField label="Push URL" value={pairing.pushUrl} />
          <CopyField label="Poll URL" value={pairing.pollUrl} />
        </dl>
      </details>

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

function CopyField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available; silent failure is fine.
    }
  }

  return (
    <div
      className={
        highlight ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2" : undefined
      }
    >
      <dt
        className={`text-xs uppercase tracking-wide ${
          highlight ? "text-emerald-700" : "text-zinc-500"
        }`}
      >
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <code
          className={`flex-1 rounded px-2 py-1 font-mono text-sm break-all whitespace-normal ${
            highlight ? "bg-white font-semibold text-emerald-950" : "bg-zinc-100 text-zinc-800"
          }`}
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </dd>
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
  placeholder?: string;
}) {
  const { id, label, value, onChange, type, required, placeholder } = props;
  return (
    <div>
      <label className="text-sm font-medium text-zinc-700" htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      <input
        id={id}
        type={type ?? "text"}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
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
      <label className="text-sm font-medium text-zinc-700" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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
