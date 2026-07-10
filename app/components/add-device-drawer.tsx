"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { buildAdmsServerFields } from "@/lib/public-url";
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

export function AddDeviceButton({
  locations,
  publicBaseUrl,
}: {
  locations: LocationOption[];
  publicBaseUrl: string;
}) {
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
        publicBaseUrl={publicBaseUrl}
      />
    </>
  );
}

function AddDeviceDrawer({
  open,
  onClose,
  locations,
  publicBaseUrl,
}: {
  open: boolean;
  onClose: () => void;
  locations: LocationOption[];
  publicBaseUrl: string;
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
      ? "Configure your terminal"
      : "Device added"
    : "Add device";

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
          {!showPullTcp ? (
            <AdmsSetupChecklist publicBaseUrl={publicBaseUrl} />
          ) : (
            <PullTcpBanner onBack={backToAdms} />
          )}

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

            {showPullTcp ? (
              <>
                <Field
                  id="ad-serial"
                  label="Serial number"
                  required
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

          {!showPullTcp ? (
            <p className="text-xs text-zinc-500">
              After you add the device, type the server address above into the terminal. The serial
              number is captured on the first ADMS callback if you do not enter it on the device
              screen.
            </p>
          ) : (
            <p className="text-xs text-amber-800">
              Pull TCP is for on-site networks where this server can reach the device directly. It
              is not used for the cloud MVP; scheduled pull sync is not wired yet.
            </p>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {!showPullTcp ? (
              <button
                type="button"
                onClick={openPullTcp}
                className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800"
              >
                Advanced: Pull TCP (on-site only)
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
                  (showPullTcp &&
                    (!form.serialNumber.trim() || !form.ipAddress.trim()))
                }
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add device"}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function AdmsSetupChecklist({ publicBaseUrl }: { publicBaseUrl: string }) {
  const base = publicBaseUrl.trim();
  const server = base ? buildAdmsServerFields(base) : null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-950">
      <p className="text-sm font-semibold text-emerald-900">ADMS push (recommended)</p>
      <p className="mt-1 text-emerald-900">
        On the terminal&apos;s <span className="font-semibold">Comm → Cloud Server</span> (or{" "}
        <span className="font-semibold">ADMS</span>) screen, enter just these three values, then
        turn on attendance upload:
      </p>

      {server ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          <ServerHeroField label="Server address" value={server.serverHost} />
          <ServerHeroField label="Port" value={String(server.serverPort)} />
          <ServerHeroField label="Protocol" value="HTTPS" />
        </dl>
      ) : (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
          Set your <span className="font-semibold">Public URL</span> on the Devices page (or{" "}
          <span className="font-mono">APP_URL</span> in the deployment env) so we can show the exact
          domain to type into the terminal.
        </p>
      )}

      <ul className="mt-3 list-disc space-y-1 pl-4 text-emerald-900">
        <li>
          Turn on <span className="font-semibold">Domain name</span> / DNS so the terminal uses the
          address above (not an IP).
        </li>
        <li>
          Enable <span className="font-semibold">ATTLOG</span> / real-time attendance — not
          OPERLOG-only.
        </li>
        <li>
          Each staff member&apos;s <span className="font-semibold">Device user ID</span> in SR+
          must match their enrolment PIN on the terminal.
        </li>
      </ul>
      <p className="mt-2 text-emerald-800">
        No comm key or full URL needed — the terminal adds the <span className="font-mono">/iclock</span>{" "}
        path itself. We match punches by the device serial on first contact.
      </p>
    </div>
  );
}

function ServerHeroField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-white px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold break-all text-emerald-950">{value}</dd>
    </div>
  );
}

function PullTcpBanner({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      <p className="font-semibold text-amber-900">Pull TCP — advanced / on-site only</p>
      <p className="mt-1">
        Not used for the cloud MVP. Use only when this server can reach the device on the LAN.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 text-xs font-medium text-amber-900 underline hover:text-amber-950"
      >
        ← Use ADMS push instead
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
          {mode === "pull_tcp" ? (
            <>
              {" "}
              Pull TCP sync is not wired in the cloud MVP — punches will not arrive until that job
              ships.
            </>
          ) : null}
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
        <span className="font-semibold">{deviceName}</span> is registered. On the terminal&apos;s{" "}
        <span className="font-semibold">Comm → Cloud Server</span> or{" "}
        <span className="font-semibold">ADMS</span> screen, enter these three values, enable ATTLOG,
        then save. <span className="font-semibold">Last active</span> updates once we receive{" "}
        <span className="font-mono">/iclock/*</span> traffic from a matching serial.
      </p>

      <dl className="grid gap-3 sm:grid-cols-3">
        <PairingRow label="Server address" value={pairing.serverHost} mono big />
        <PairingRow label="Port" value={String(pairing.serverPort)} big />
        <PairingRow label="Protocol" value="HTTPS" big />
      </dl>

      <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-600">
        <li>Turn on Domain name / DNS so the terminal uses the address (not an IP).</li>
        <li>Enable ATTLOG (real-time attendance upload) — not OPERLOG-only.</li>
        <li>Staff device user IDs must match terminal enrolment PINs.</li>
      </ul>

      <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <summary className="cursor-pointer font-medium text-zinc-800">
          Older firmware that wants full URLs (and curl testing)
        </summary>
        <p className="mt-2 text-zinc-600">
          Some older ZKTeco screens (or a curl test) want the complete push/poll URLs and path
          instead of just a server address. A comm key is not required — SR+ ADMS v1 identifies
          devices by serial number.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <PairingRow label="Push URL" value={pairing.pushUrl} mono />
          <PairingRow label="Poll URL" value={pairing.pollUrl} mono />
          <PairingRow label="Server path" value={pairing.serverPath} />
          <PairingRow
            label="Communication key (optional)"
            value={pairing.commKey}
            mono
            warn="Shown once. Only needed if your firmware requires it — we store a hash, not the plaintext."
          />
        </dl>
      </details>

      {!pairing.publicBaseUrl ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Use <span className="font-medium">Public URL</span> on the Devices page, or set{" "}
          <span className="font-mono">APP_URL</span> /{" "}
          <span className="font-mono">NEXT_PUBLIC_APP_URL</span>, so pairing URLs match what
          devices on the LAN can reach.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          If <span className="font-mono">{pairing.publicBaseUrl}</span> is not reachable from the
          device network (e.g. localhost during dev), use a public host or tunnel the operator can
          route to.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          I&apos;ve configured the terminal
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
  big,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: string;
  big?: boolean;
}) {
  return (
    <div className={big ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2" : undefined}>
      <dt
        className={`text-xs uppercase tracking-wide ${big ? "text-emerald-700" : "text-zinc-500"}`}
      >
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded px-2 py-1 ${
            big ? "bg-white font-semibold text-emerald-950" : "bg-zinc-100 text-zinc-800"
          } ${mono ? "font-mono text-sm break-all whitespace-normal" : "text-sm"}`}
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
      className="shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
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
