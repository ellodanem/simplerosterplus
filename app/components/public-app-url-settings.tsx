"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/app/components/modal";
import { buildAdmsIclockUrls } from "@/lib/public-url";

/**
 * Per-org public app URL for ADMS pairing copy on the Devices page.
 */
export function PublicAppUrlSettingsButton({
  initialOrgPublicAppUrl,
  resolvedPublicAppUrl,
  resolvedSource,
  hostnameHyphenWarning,
}: {
  initialOrgPublicAppUrl: string;
  resolvedPublicAppUrl: string;
  resolvedSource: string;
  hostnameHyphenWarning: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        title="Set the public HTTPS base used in ADMS push/poll URL copy"
      >
        Public URL
      </button>
      {open ? (
        <PublicAppUrlSettingsModal
          initialOrgPublicAppUrl={initialOrgPublicAppUrl}
          initialResolvedPublicAppUrl={resolvedPublicAppUrl}
          initialResolvedSource={resolvedSource}
          initialHostnameHyphenWarning={hostnameHyphenWarning}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function sourceLabel(source: string): string {
  switch (source) {
    case "org":
      return "organization setting";
    case "env":
      return "APP_URL / VERCEL_URL env";
    case "request":
      return "current request host";
    default:
      return "not set";
  }
}

function PublicAppUrlSettingsModal({
  initialOrgPublicAppUrl,
  initialResolvedPublicAppUrl,
  initialResolvedSource,
  initialHostnameHyphenWarning,
  onClose,
}: {
  initialOrgPublicAppUrl: string;
  initialResolvedPublicAppUrl: string;
  initialResolvedSource: string;
  initialHostnameHyphenWarning: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialOrgPublicAppUrl);
  const [resolved, setResolved] = useState(initialResolvedPublicAppUrl);
  const [resolvedSource, setResolvedSource] = useState(initialResolvedSource);
  const [hyphenWarning, setHyphenWarning] = useState(initialHostnameHyphenWarning);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrls = resolved.trim() ? buildAdmsIclockUrls(resolved) : null;

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/public-url", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicAppUrl: value }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        orgPublicAppUrl?: string;
        resolvedPublicAppUrl?: string;
        resolvedSource?: string;
        hostnameHyphenWarning?: string | null;
      };
      if (!res.ok) {
        setError(body.error ?? "Could not save public URL.");
        setPending(false);
        return;
      }
      setValue(body.orgPublicAppUrl ?? "");
      setResolved(body.resolvedPublicAppUrl ?? "");
      setResolvedSource(body.resolvedSource ?? "none");
      setHyphenWarning(body.hostnameHyphenWarning ?? null);
      onClose();
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Public app URL (ADMS)" size="md">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          HTTPS origin devices use to reach <span className="font-mono">/iclock/*</span>. Set once
          per organization when deployment env vars do not match your custom domain (staging vs
          production, Vercel preview URL vs production host).
        </p>

        <div>
          <label
            htmlFor="public-app-url"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            Organization override
          </label>
          <input
            id="public-app-url"
            type="url"
            inputMode="url"
            placeholder="https://app.example.com"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 font-mono text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            autoFocus
          />
          <p className="mt-1 text-xs text-zinc-500">
            No trailing slash. Leave empty to use{" "}
            <span className="font-mono">APP_URL</span> /{" "}
            <span className="font-mono">NEXT_PUBLIC_APP_URL</span> /{" "}
            <span className="font-mono">VERCEL_URL</span>, then the request host in dev.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          <p className="font-medium text-zinc-800">Effective URL for pairing copy</p>
          <p className="mt-1 font-mono text-sm break-all">
            {resolved.trim() || "— not set —"}
          </p>
          <p className="mt-1 text-zinc-500">Source: {sourceLabel(resolvedSource)}</p>
          {previewUrls ? (
            <dl className="mt-3 space-y-1">
              <div>
                <dt className="font-medium text-zinc-600">Push</dt>
                <dd className="font-mono break-all">{previewUrls.pushUrl}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600">Poll</dt>
                <dd className="font-mono break-all">{previewUrls.pollUrl}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        {hyphenWarning ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {hyphenWarning}
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
