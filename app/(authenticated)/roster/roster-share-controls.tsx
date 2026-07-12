"use client";

import html2canvas from "html2canvas";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/app/components/modal";
import { RosterShareTable } from "@/app/components/roster-share-table";
import { buildRosterManualWhatsAppText } from "@/lib/roster-personal-message";
import type { RosterShareViewData } from "@/lib/roster-share-data";

type ShareAction = "copyLink" | "openSharePage" | "print" | "whatsapp";

type WhatsappPublishSummary = {
  configured: boolean;
  enabled: boolean;
  attempted: number;
  sent: number;
  skipped: number;
  failed: number;
  capReached: boolean;
  reasons: string[];
};

function formatWhatsappPublishSummary(summary: WhatsappPublishSummary): string | null {
  if (summary.reasons.includes("not_entitled")) {
    return "WhatsApp alerts need Plus with the WhatsApp add-on, or Pro.";
  }
  if (summary.reasons.includes("disabled")) {
    return "WhatsApp alerts are off — enable them in Settings → WhatsApp alerts.";
  }
  if (summary.reasons.includes("not_configured")) {
    return "Server WhatsApp is not configured (Twilio credentials, template, or Blob storage missing).";
  }
  if (summary.reasons.includes("cap")) {
    return "Monthly WhatsApp limit reached. Manual share still works.";
  }
  if (summary.sent > 0) {
    return `WhatsApp roster image sent to ${summary.sent} staff member${summary.sent === 1 ? "" : "s"}.`;
  }
  if (summary.failed > 0) {
    return `WhatsApp failed for ${summary.failed} staff — check Twilio logs (template or number may be invalid).`;
  }
  if (summary.attempted === 0 && summary.skipped > 0) {
    return "No WhatsApp sent — no opted-in staff with contact numbers on this roster.";
  }
  if (summary.attempted === 0) {
    return "No WhatsApp sent — no opted-in staff with contact numbers.";
  }
  return null;
}

type PublishGapInfo = {
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

function absoluteShareUrl(base: string | null | undefined, sharePathValue: string): string {
  const origin =
    base?.trim().replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "");
  return `${origin}${sharePathValue}`;
}

export function RosterShareControls({
  weekId,
  initialLive,
  sharePath,
  shareUrl,
  shareBaseUrl,
  openShiftCountFromToday,
  orgName,
  weekStartYmd,
  weekEndYmd,
  captureData,
}: {
  weekId: string;
  initialLive: boolean;
  sharePath: string | null;
  shareUrl: string | null;
  shareBaseUrl: string | null;
  openShiftCountFromToday: number;
  orgName: string;
  weekStartYmd: string;
  weekEndYmd: string;
  captureData: RosterShareViewData;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(initialLive);
  const [path, setPath] = useState(sharePath);
  const [url, setUrl] = useState(shareUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishGapInfo, setPublishGapInfo] = useState<PublishGapInfo | null>(null);
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);
  const [whatsappNotice, setWhatsappNotice] = useState<string | null>(null);

  const displayUrl = useMemo(() => {
    if (url) return url;
    if (path) return absoluteShareUrl(shareBaseUrl, path);
    return null;
  }, [url, path, shareBaseUrl]);

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
    return absoluteShareUrl(shareBaseUrl, sharePathValue);
  }

  async function generateRosterImage(): Promise<string | null> {
    if (!imageRef.current) return null;
    const canvas = await html2canvas(imageRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL("image/png");
  }

  async function sendWhatsappImageBlast(mode: "publish" | "direct" = "publish"): Promise<void> {
    try {
      const imageBase64 = await generateRosterImage();
      if (!imageBase64) {
        setWhatsappNotice("Could not capture roster image for WhatsApp.");
        return;
      }
      const res = await fetch(`/api/roster/weeks/${weekId}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        whatsapp?: WhatsappPublishSummary;
      };
      if (!res.ok) {
        setWhatsappNotice(data.error ?? "Could not send WhatsApp roster image.");
        return;
      }
      if (data.whatsapp) {
        setWhatsappNotice(formatWhatsappPublishSummary(data.whatsapp));
      }
    } catch {
      setWhatsappNotice("Could not send WhatsApp roster image.");
    }
  }

  async function handleWhatsappDirect() {
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    setWhatsappNotice(null);
    try {
      await sendWhatsappImageBlast("direct");
    } finally {
      setBusy(false);
    }
  }

  async function publishWeek(acknowledgeGaps = false): Promise<boolean> {
    setBusy(true);
    setError(null);
    setWhatsappNotice(null);
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
        setPublishGapInfo({
          openShiftCount: data.openShiftCount ?? 0,
          openShiftDayLabel: data.openShiftDayLabel ?? null,
        });
        setShowPublishModal(true);
        return false;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Could not publish roster");
      }
      const isLive = data.status === "published";
      const publishedUrl = resolveShareUrl(data.sharePath);
      setLive(isLive);
      if (data.sharePath) {
        setPath(data.sharePath);
        if (publishedUrl) setUrl(publishedUrl);
      }
      if (isLive) {
        await sendWhatsappImageBlast("publish");
      }
      router.refresh();
      return isLive;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function returnToDraft() {
    setBusy(true);
    setError(null);
    setWhatsappNotice(null);
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
      case "whatsapp": {
        const text = buildRosterManualWhatsAppText({
          orgName,
          weekStartYmd,
          weekEndYmd,
          shareUrl: link,
        });
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        break;
      }
    }
  }

  function startPublish() {
    if (openShiftCountFromToday > 0) {
      setPublishGapInfo({
        openShiftCount: openShiftCountFromToday,
        openShiftDayLabel: null,
      });
      setShowPublishModal(true);
      return;
    }
    void publishWeek();
  }

  async function confirmPublishWithGaps() {
    setShowPublishModal(false);
    await publishWeek(true);
  }

  function cancelPublishModal() {
    setShowPublishModal(false);
    setPublishGapInfo(null);
  }

  function handleShareAction(action: ShareAction) {
    setMenuOpen(false);
    if (!displayUrl) return;
    executeShareAction(action, displayUrl);
  }

  const menuItemClass =
    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed";
  const menuItemEnabled = `${menuItemClass} text-zinc-800 hover:bg-zinc-50`;
  const menuItemDisabled = `${menuItemClass} text-zinc-400`;

  return (
    <>
      {/* Off-screen capture target for WhatsApp media template (Shift Close pattern). */}
      <div
        className="pointer-events-none fixed -left-[9999px] -top-[9999px] z-[-1]"
        aria-hidden="true"
      >
        <div ref={imageRef} className="w-[1100px] bg-white p-6">
          <div className="mb-4">
            <p className="text-lg font-semibold text-zinc-900">{captureData.orgName}</p>
            <p className="text-sm text-zinc-600">
              {captureData.locationName} · {captureData.weekStartYmd} – {captureData.weekEndYmd}
            </p>
          </div>
          <RosterShareTable data={captureData} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {live ? (
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
          ) : live ? (
            <span className="text-zinc-500">Staff can view the share link</span>
          ) : (
            <span className="text-zinc-500">Publish when ready — share options unlock after</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!live ? (
            <button
              type="button"
              onClick={startPublish}
              disabled={busy}
              className="inline-flex items-center rounded-md border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy ? "Publishing…" : "Publish"}
            </button>
          ) : (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                disabled={busy || !displayUrl}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy ? "Sending…" : copied ? "Link copied!" : "Share"}
                <ShareMenuChevron />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => handleShareAction("copyLink")}
                    className={menuItemEnabled}
                  >
                    Copy share link
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => handleShareAction("openSharePage")}
                    className={menuItemEnabled}
                  >
                    Open share page
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => handleShareAction("print")}
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
                    disabled={busy}
                    onClick={() => void handleWhatsappDirect()}
                    className={menuItemEnabled}
                  >
                    WhatsApp (Direct)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => handleShareAction("whatsapp")}
                    className={menuItemEnabled}
                  >
                    WhatsApp (Link)
                  </button>
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
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {whatsappNotice ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {whatsappNotice}
        </div>
      ) : null}

      {showPublishModal && publishGapInfo ? (
        <Modal
          open={showPublishModal}
          title="Publish this roster?"
          onClose={cancelPublishModal}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            Publishing makes this week official and sends a WhatsApp roster image to opted-in
            staff. This week still has{" "}
            <strong>
              {publishGapInfo.openShiftCount} open slot
              {publishGapInfo.openShiftCount === 1 ? "" : "s"}
            </strong>
            {publishGapInfo.openShiftDayLabel
              ? ` (most on ${publishGapInfo.openShiftDayLabel})`
              : " from today on"}
            . Staff may see gaps if you publish now.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Publish anyway, or go back and fill slots first.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelPublishModal}
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

      {showDraftConfirm ? (
        <Modal
          open={showDraftConfirm}
          title="Back to draft?"
          onClose={() => setShowDraftConfirm(false)}
          size="md"
        >
          <p className="text-sm text-zinc-700">
            The share link will stop working until you publish again. You can edit the roster while
            it is a draft.
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
