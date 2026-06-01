/** One staff line on an Extract Pay Period report. */
export type PayPeriodRow = {
  staffId: string;
  staffName: string;
  /** Total clock hours (decimal, 2 places). */
  transTtl: number;
  /** Usually empty, or a fixed marker when on vacation in the period. */
  vacation: string;
  shortage: number;
  sickLeaveDays: number;
  sickLeaveRanges: string;
};

export type PayPeriodDraft = {
  startDate: string;
  endDate: string;
  reportDate: string;
  entityName: string;
  rows: PayPeriodRow[];
};

export type PayPeriodListItem = {
  id: string;
  startDate: string;
  endDate: string;
  reportDate: string;
  entityName: string;
  notes: string;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowCount: number;
};

export const VACATION_MARKER = "********";

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
