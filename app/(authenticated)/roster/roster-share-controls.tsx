"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/app/components/modal";

type ShareAction = "copyLink" | "openSharePage" | "print";

type ReleaseGapInfo = {
  openShiftCount: number;
  openShiftDayLabel: string | null;
};

function ShareMenuChevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="opacity-80"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function RosterShareControls({
  weekId,
  initialLive,
  sharePath,
  shareUrl,
  openShiftCountFromToday,
}: {
  weekId: string;
  initialLive: boolean;
  sharePath: string | null;
  shareUrl: string | null;
  openShiftCountFromToday: number;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(initialLive);
  const [path, setPath] = useState(sharePath);
  const [url, setUrl] = useState(shareUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseGapInfo, setReleaseGapInfo] = useState<ReleaseGapInfo | null>(null);
  const [pendingAction, setPendingAction] = useState<ShareAction | null>(null);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  const displayUrl = useMemo(() => {
    if (url) return url;
    if (path && typeof window !== "undefined") {
      return `${window.location.origin}${path}`;
    }
    return path;
  }, [url, path]);

  useEffect(() => {
    setLive(initialLive);
    setPath(sharePath);
    setUrl(shareUrl);
  }, [initialLive, sharePath, shareUrl]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  function resolveShareUrl(sharePathValue: string | null | undefined): string | null {
    if (!sharePathValue) return null;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${sharePathValue}`;
    }
    return sharePathValue;
  }

  async function releaseWeek(
    acknowledgeGaps = false,
  ): Promise<{ ok: boolean; shareUrl: string | null }> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/roster/weeks/${weekId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", acknowledgeGaps }),
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
        setReleaseGapInfo({
          openShiftCount: data.openShiftCount ?? 0,
          openShiftDayLabel: data.openShiftDayLabel ?? null,
        });
        setShowReleaseModal(true);
        return { ok: false, shareUrl: null };
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Could not release roster for sharing");
      }
      const isLive = data.status === "published";
      const releasedUrl = resolveShareUrl(data.sharePath);
      setLive(isLive);
      if (data.sharePath) {
        setPath(data.sharePath);
        if (releasedUrl) setUrl(releasedUrl);
      }
      router.refresh();
      return { ok: isLive, shareUrl: releasedUrl };
    } catch (e) {
      setError((e as Error).message);
      return { ok: false, shareUrl: null };
    } finally {
      setBusy(false);
    }
  }

  async function returnToDraft() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/roster/weeks/${weekId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpublish" }),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not return roster to draft");
      }
      setLive(data.status === "published");
      setShowDraftConfirm(false);
      setMenuOpen(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(link: string) {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link — select and copy manually.");
    }
  }

  function executeShareAction(action: ShareAction, link: string) {
    if (!link) return;
    switch (action) {
      case "copyLink":
        void copyLink(link);
        break;
      case "openSharePage":
        window.open(link, "_blank", "noopener,noreferrer");
        break;
      case "print":
        window.open(link, "_blank", "noopener,noreferrer")?.print();
        break;
    }
  }

  async function ensureLiveThen(action: ShareAction) {
    setMenuOpen(false);
    const existingLink = displayUrl;
    if (live && existingLink) {
      executeShareAction(action, existingLink);
      return;
    }
    setPendingAction(action);
    if (openShiftCountFromToday > 0) {
      setReleaseGapInfo({
        openShiftCount: openShiftCountFromToday,
        openShiftDayLabel: null,
      });
      setShowReleaseModal(true);
      return;
    }
    const { ok, shareUrl: releasedUrl } = await releaseWeek();
    if (ok && releasedUrl) {
      setPendingAction(null);
      executeShareAction(action, releasedUrl);
    }
  }

  async function confirmReleaseWithGaps() {
    setShowReleaseModal(false);
    const action = pendingAction;
    setPendingAction(null);
    const { ok, shareUrl: releasedUrl } = await releaseWeek(true);
    if (ok && action && releasedUrl) {
      executeShareAction(action, releasedUrl);
    }
  }

  function cancelReleaseModal() {
    setShowReleaseModal(false);
    setPendingAction(null);
    setReleaseGapInfo(null);
  }

  const menuItemClass =
    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed";
  const menuItemEnabled = `${menuItemClass} text-zinc-800 hover:bg-zinc-50`;
  const menuItemDisabled = `${menuItemClass} text-zinc-400`;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {live ? (
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Live
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
          ) : live ? (
            <span className="text-zinc-500">Staff can view the share link</span>
          ) : (
            <span className="text-zinc-500">Not shared yet — use Share when ready</span>
          )}
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={busy}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {busy ? "Working…" : copied ? "Link copied!" : "Share"}
            <ShareMenuChevron />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void ensureLiveThen("copyLink")}
                className={menuItemEnabled}
              >
                Copy share link
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void ensureLiveThen("openSharePage")}
                className={menuItemEnabled}
              >
                Open share page
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void ensureLiveThen("print")}
                className={menuItemEnabled}
              >
                Print
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                title="Coming soon"
                className={menuItemDisabled}
              >
                Email
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Soon
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                title="Coming soon"
                className={menuItemDisabled}
              >
                Export (PDF)
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Soon
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                disabled
                title="Not available yet"
                className={menuItemDisabled}
              >
                WhatsApp
                <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  Soon
                </span>
              </button>
              {live ? (
                <>
                  <div className="my-1 border-t border-zinc-100" aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDraftConfirm(true);
                    }}
                    className={`${menuItemClass} text-rose-800 hover:bg-rose-50`}
                  >
                    Back to draft
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {showReleaseModal && releaseGapInfo ? (
        <Modal
          open={showReleaseModal}
          title="Share this roster?"
          onClose={cancelReleaseModal}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            Sharing makes this week official for anyone with the link. This week still has{" "}
            <strong>
              {releaseGapInfo.openShiftCount} open slot
              {releaseGapInfo.openShiftCount === 1 ? "" : "s"}
            </strong>
            {releaseGapInfo.openShiftDayLabel
              ? ` (most on ${releaseGapInfo.openShiftDayLabel})`
              : " from today on"}
            . Staff may see gaps if you share now.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Share anyway, or go back and fill slots first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelReleaseModal}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Fill slots first
            </button>
            <button
              type="button"
              onClick={() => void confirmReleaseWithGaps()}
              disabled={busy}
              className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Share anyway
            </button>
          </div>
        </Modal>
      ) : null}

      {showDraftConfirm ? (
        <Modal
          open={showDraftConfirm}
          title="Back to draft?"
          onClose={() => setShowDraftConfirm(false)}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            The share link will stop working until you share again. You can still edit the roster
            while it is a draft.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDraftConfirm(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void returnToDraft()}
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
