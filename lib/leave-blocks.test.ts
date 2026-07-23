import { describe, expect, it } from "vitest";
import {
  leaveAssignmentConflictMessage,
  type BlockReason,
} from "@/lib/leave-blocks";

describe("leaveAssignmentConflictMessage", () => {
  const name = "Alex Morgan";

  it("matches vacation wording used by roster entry writes", () => {
    expect(leaveAssignmentConflictMessage("vacation", name, "this date")).toBe(
      "Alex Morgan is on vacation on this date.",
    );
    expect(leaveAssignmentConflictMessage("vacation", name, "2026-07-20")).toBe(
      "Alex Morgan is on vacation on 2026-07-20.",
    );
  });

  it("matches day-off wording used by roster entry writes", () => {
    expect(leaveAssignmentConflictMessage("dayOff", name, "this date")).toBe(
      "Alex Morgan has an approved day off on this date.",
    );
    expect(leaveAssignmentConflictMessage("dayOff", name, "2026-07-21")).toBe(
      "Alex Morgan has an approved day off on 2026-07-21.",
    );
  });

  it("rejects approved sick leave with the same response pattern", () => {
    expect(leaveAssignmentConflictMessage("sickLeave", name, "this date")).toBe(
      "Alex Morgan is on sick leave on this date.",
    );
    expect(leaveAssignmentConflictMessage("sickLeave", name, "2026-07-22")).toBe(
      "Alex Morgan is on sick leave on 2026-07-22.",
    );
  });

  it("covers every BlockReason without falling through", () => {
    const reasons: BlockReason[] = ["vacation", "sickLeave", "dayOff"];
    for (const reason of reasons) {
      expect(leaveAssignmentConflictMessage(reason, name, "this date").length).toBeGreaterThan(0);
    }
  });
});
