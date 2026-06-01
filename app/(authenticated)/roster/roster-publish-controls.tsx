"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Modal } from "@/app/components/modal";

type PublishGapInfo = {
  openShiftCount: number;
  openShiftDayLabel: string | null;
};

export function RosterPublishControls({
  weekId,
  initialPublished,
  sharePath,
  shareUrl,
  openShiftCountFromToday,
}: {
  weekId: string;
  initialPublished: boolean;
  sharePath: string | null;
  shareUrl: string | null;
  openShiftCountFromToday: number;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(initialPublished);
  const [path, setPath] = useState(sharePath);
  const [url, setUrl] = useState(shareUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showGapModal, setShowGapModal] = useState(false);
  const [gapInfo, setGapInfo] = useState<PublishGapInfo | null>(null);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const displayUrl = useMemo(() => {
    if (url) return url;
    if (path && typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    return path;
  }, [url, path]);

  async function postStatus(
    action: "publish" | "unpublish",
    acknowledgeGaps = false,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/roster/weeks/${weekId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, acknowledgeGaps }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        openShiftCount?: number;
        openShiftDayLabel?: string | null;
        status?: string;
        sharePath?: string | null;
      };
      if (res.status === 409 && data.code === "OPEN_SHIFTS") {
        setGapInfo({
          openShiftCount: data.openShiftCount ?? 0,
          openShiftDayLabel: data.openShiftDayLabel ?? null,
        });
        setShowGapModal(true);
        return false;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Could not update roster status");
      }
      const isPublished = data.status === "published";
      setPublished(isPublished);
      if (data.sharePath) {
        setPath(data.sharePath);
        if (typeof window !== "undefined") {
          setUrl(`${window.location.origin}${data.sharePath}`);
        }
      }
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handlePublishClick() {
    if (published) {
      const ok = await postStatus("publish");
      if (ok) setError(null);
      return;
    }
    if (openShiftCountFromToday > 0) {
      setGapInfo({
        openShiftCount: openShiftCountFromToday,
        openShiftDayLabel: null,
      });
      setShowGapModal(true);
      return;
    }
    await postStatus("publish");
  }

  async function confirmPublishWithGaps() {
    setShowGapModal(false);
    await postStatus("publish", true);
  }

  async function handleUnpublish() {
    setShowUnpublishConfirm(false);
    await postStatus("unpublish");
  }

  async function copyLink() {
    const text = displayUrl ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link — select and copy manually.");
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {published ? (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Published
            </span>
          ) : (
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
              Draft
            </span>
          )}
          {openShiftCountFromToday > 0 ? (
            <span className="text-amber-800">
              {openShiftCountFromToday} open slot{openShiftCountFromToday === 1 ? "" : "s"} from
              today on
            </span>
          ) : (
            <span className="text-zinc-500">Ready to share when you publish</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {published && displayUrl ? (
            <>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {copied ? "Copied!" : "Copy share link"}
              </button>
              <a
                href={displayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Open share page
              </a>
              <button
                type="button"
                onClick={() => window.open(displayUrl, "_blank")?.print()}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Print
              </button>
            </>
          ) : null}
          {published ? (
            <button
              type="button"
              onClick={() => setShowUnpublishConfirm(true)}
              disabled={busy}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Back to draft
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handlePublishClick()}
            disabled={busy}
            className="rounded-md border border-emerald-600 bg-emerald-700 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? "Saving…" : published ? "Re-publish" : "Publish"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {showGapModal && gapInfo ? (
        <Modal
          open={showGapModal}
          title="Open slots before publishing"
          onClose={() => setShowGapModal(false)}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            This week still has{" "}
            <strong>
              {gapInfo.openShiftCount} open slot{gapInfo.openShiftCount === 1 ? "" : "s"}
            </strong>
            {gapInfo.openShiftDayLabel ? ` (most on ${gapInfo.openShiftDayLabel})` : " from today on"}
            . Staff may see gaps if you share now.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Publish anyway to share the roster as-is, or go back and fill slots first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowGapModal(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Fill slots first
            </button>
            <button
              type="button"
              onClick={() => void confirmPublishWithGaps()}
              disabled={busy}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Publish anyway
            </button>
          </div>
        </Modal>
      ) : null}

      {showUnpublishConfirm ? (
        <Modal
          open={showUnpublishConfirm}
          title="Back to draft?"
          onClose={() => setShowUnpublishConfirm(false)}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            The share link will stop working until you publish again. You can still edit the roster
            while it is a draft.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUnpublishConfirm(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleUnpublish()}
              disabled={busy}
              className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              Back to draft
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
