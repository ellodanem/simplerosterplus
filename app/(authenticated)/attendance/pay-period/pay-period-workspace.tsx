"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/app/components/modal";
import type { PayPeriodListItem, PayPeriodRow } from "@/lib/pay-period-types";
import type { PayPeriodDetail } from "@/lib/pay-period-db";
import { PayPeriodPrintHeader, PayPeriodTable } from "./pay-period-table";

type Draft = {
  startDate: string;
  endDate: string;
  reportDate: string;
  entityName: string;
  rows: PayPeriodRow[];
  notes: string;
  savedId?: string;
  rowsBeforeLastEdit?: PayPeriodRow[] | null;
};

type Props = {
  organizationName: string;
  locationId: string;
  locations: { id: string; name: string }[];
  defaultStartYmd: string;
  defaultEndYmd: string;
};

export function PayPeriodWorkspace({
  organizationName,
  locationId,
  locations,
  defaultStartYmd,
  defaultEndYmd,
}: Props) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [startYmd, setStartYmd] = useState(defaultStartYmd);
  const [endYmd, setEndYmd] = useState(defaultEndYmd);
  const [periods, setPeriods] = useState<PayPeriodListItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<PayPeriodDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const locationQuery = `location=${encodeURIComponent(locationId)}`;

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/attendance/pay-period?${locationQuery}`);
    const body = (await res.json().catch(() => ({}))) as {
      periods?: PayPeriodListItem[];
      error?: string;
    };
    if (!res.ok) throw new Error(body.error || "Could not load saved periods");
    setPeriods(body.periods ?? []);
  }, [locationQuery]);

  useEffect(() => {
    loadList().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [loadList]);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/attendance/pay-period/generate?${locationQuery}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: startYmd, endDate: endYmd, entityName: organizationName }),
      });
      const body = (await res.json().catch(() => ({}))) as Draft & { error?: string };
      if (!res.ok) throw new Error(body.error || "Generate failed");
      setDraft({
        startDate: body.startDate,
        endDate: body.endDate,
        reportDate: body.reportDate,
        entityName: body.entityName,
        rows: body.rows,
        notes: "",
      });
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function openEdit(id: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/attendance/pay-period/${id}`);
      const body = (await res.json().catch(() => ({}))) as {
        period?: PayPeriodDetail;
        error?: string;
      };
      if (!res.ok || !body.period) throw new Error(body.error || "Could not load period");
      const p = body.period;
      setDraft({
        startDate: p.startDate,
        endDate: p.endDate,
        reportDate: p.reportDate,
        entityName: p.entityName,
        rows: p.rows,
        notes: p.notes,
        savedId: p.id,
        rowsBeforeLastEdit: p.rowsBeforeLastEdit,
      });
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setError(null);
    setBusy(true);
    try {
      const isEdit = Boolean(draft.savedId);
      const url = isEdit
        ? `/api/attendance/pay-period/${draft.savedId}`
        : `/api/attendance/pay-period?${locationQuery}`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { rows: draft.rows, notes: draft.notes }
            : {
                startDate: draft.startDate,
                endDate: draft.endDate,
                reportDate: draft.reportDate,
                entityName: draft.entityName,
                rows: draft.rows,
                notes: draft.notes,
                locationId,
              },
        ),
      });
      const body = (await res.json().catch(() => ({}))) as {
        period?: PayPeriodDetail;
        error?: string;
      };
      if (!res.ok || !body.period) throw new Error(body.error || "Save failed");
      setModalOpen(false);
      setDraft(null);
      setConfirmSaveOpen(false);
      await loadList();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleView(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/attendance/pay-period/${id}`);
      const body = (await res.json().catch(() => ({}))) as {
        period?: PayPeriodDetail;
        error?: string;
      };
      if (!res.ok || !body.period) throw new Error(body.error || "Could not load period");
      setExpandedId(id);
      setExpandedDetail(body.period);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }

  function handlePrint() {
    window.print();
  }

  function updateRow(index: number, patch: Partial<PayPeriodRow>) {
    setDraft((d) => {
      if (!d) return d;
      const rows = d.rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
      return { ...d, rows };
    });
  }

  function switchLocation(nextId: string) {
    router.push(`/attendance/pay-period?location=${encodeURIComponent(nextId)}`);
  }

  return (
    <div className="space-y-8">
      {locations.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-600">Location:</span>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => switchLocation(loc.id)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                loc.id === locationId
                  ? "bg-emerald-800 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">New report</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Generate from live punches, review and adjust, then save to file punches for this period.
          Email and Excel export are not available yet.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Start</span>
            <input
              type="date"
              value={startYmd}
              onChange={(e) => setStartYmd(e.target.value)}
              className="mt-1 block rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">End</span>
            <input
              type="date"
              value={endYmd}
              onChange={(e) => setEndYmd(e.target.value)}
              className="mt-1 block rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleGenerate()}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            Generate report
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Saved periods</h2>
        {periods.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No saved Extract Pay Period reports yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {periods.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {p.startDate} – {p.endDate}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Saved {new Date(p.createdAt).toLocaleString()} · {p.rowCount} staff
                      {p.emailSentAt ? (
                        <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-zinc-700">
                          Emailed
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleView(p.id)}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-50"
                    >
                      {expandedId === p.id ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openEdit(p.id)}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void openEdit(p.id).then(() => {
                          setTimeout(() => handlePrint(), 300);
                        });
                      }}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium hover:bg-zinc-50"
                    >
                      Print
                    </button>
                  </div>
                </div>
                {expandedId === p.id && expandedDetail ? (
                  <div className="pay-period-print-root mt-4">
                    <PayPeriodPrintHeader
                      reportDate={expandedDetail.reportDate}
                      startYmd={expandedDetail.startDate}
                      endYmd={expandedDetail.endDate}
                      entityName={expandedDetail.entityName}
                      notes={expandedDetail.notes}
                    />
                    <PayPeriodTable
                      rows={expandedDetail.rows}
                      previousRows={expandedDetail.rowsBeforeLastEdit}
                      startYmd={expandedDetail.startDate}
                      endYmd={expandedDetail.endDate}
                      locationId={locationId}
                      editable={false}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modalOpen && draft !== null}
        onClose={() => {
          if (!busy) {
            setModalOpen(false);
            setDraft(null);
            setConfirmSaveOpen(false);
          }
        }}
        title={draft?.savedId ? "Edit Extract Pay Period" : "Review Extract Pay Period"}
        size="xl"
      >
        {draft ? (
          <div className="space-y-4">
            <div ref={printRef} className="pay-period-print-root">
              <PayPeriodPrintHeader
                reportDate={draft.reportDate}
                startYmd={draft.startDate}
                endYmd={draft.endDate}
                entityName={draft.entityName}
                notes={draft.notes}
              />
              <PayPeriodTable
                rows={draft.rows}
                previousRows={draft.rowsBeforeLastEdit}
                startYmd={draft.startDate}
                endYmd={draft.endDate}
                locationId={locationId}
                editable
                onRowChange={updateRow}
              />
            </div>
            <label className="block text-sm print:hidden">
              <span className="font-medium text-zinc-700">Notes</span>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Payroll instructions or other notes for this period…"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
              >
                Print
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmSaveOpen(true)}
                className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmSaveOpen}
        onClose={() => !busy && setConfirmSaveOpen(false)}
        title="Save and file punches?"
        size="md"
      >
        <p className="text-sm text-zinc-700">
          Saving stores this report and marks all punches in{" "}
          <span className="font-semibold">
            {draft?.startDate} – {draft?.endDate}
          </span>{" "}
          as filed. They will disappear from the default attendance log. You can still view filed
          punches with the extended log option later.
        </p>
        {!draft?.savedId ? (
          <p className="mt-2 text-sm text-zinc-600">
            This action only runs when you save — generating or printing does not file punches.
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmSaveOpen(false)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </Modal>

      <style jsx global>{`
        @media print {
          header:not(.pay-period-print-header),
          nav,
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          .pay-period-print-root,
          .pay-period-print-root * {
            visibility: visible;
          }
          .pay-period-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5in 0.75in;
            color: #000 !important;
            font-family: Arial, Helvetica, sans-serif;
          }
          [role="dialog"] {
            position: static !important;
            max-width: none !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          [role="dialog"] > div:first-child {
            display: none !important;
          }
          [role="dialog"] > div:last-child {
            padding: 0 !important;
          }
          .pay-period-cell-input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            box-shadow: none !important;
            appearance: textfield;
            -moz-appearance: textfield;
          }
          .pay-period-cell-input::-webkit-outer-spin-button,
          .pay-period-cell-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
