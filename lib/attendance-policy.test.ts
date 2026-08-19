import { describe, expect, it } from "vitest";
import {
  computePresence,
  normalizeAbsentAfter,
  type ComputePresenceInput,
} from "./attendance-policy";

const TZ = "America/Port_of_Spain";

function base(partial: Partial<ComputePresenceInput> = {}): ComputePresenceInput {
  return {
    dateYmd: "2026-08-19",
    timeZone: TZ,
    expected: { startHHmm: "08:00", endHHmm: "16:00" },
    vacation: false,
    sickLeave: false,
    dayOff: false,
    stationClosed: false,
    punchExempt: false,
    override: null,
    punches: [],
    lateAfterMinutes: 15,
    absentAfterMinutes: 60,
    nowUtc: new Date("2026-08-19T14:00:00.000Z"), // 10:00 local (UTC-4)
    ...partial,
  };
}

describe("normalizeAbsentAfter", () => {
  it("keeps absent above late", () => {
    expect(normalizeAbsentAfter(15, 60)).toBe(60);
    expect(normalizeAbsentAfter(30, 30)).toBe(31);
  });
});

describe("computePresence dual thresholds", () => {
  it("marks on-time punch within late window as present", () => {
    const result = computePresence(
      base({
        punches: [{ punchAt: new Date("2026-08-19T12:10:00.000Z"), punchType: "in" }], // 08:10
      }),
    );
    expect(result.status).toBe("present");
    expect(result.minutesLate).toBeNull();
  });

  it("marks first punch after late window as late", () => {
    const result = computePresence(
      base({
        punches: [{ punchAt: new Date("2026-08-19T12:16:00.000Z"), punchType: "in" }], // 08:16
      }),
    );
    expect(result.status).toBe("late");
    expect(result.minutesLate).toBe(1);
  });

  it("keeps a punch after the absent window as late, not absent", () => {
    const result = computePresence(
      base({
        punches: [{ punchAt: new Date("2026-08-19T13:10:00.000Z"), punchType: "in" }], // 09:10
      }),
    );
    expect(result.status).toBe("late");
  });

  it("is pending (scheduled) before late window with no punch", () => {
    const result = computePresence(
      base({
        nowUtc: new Date("2026-08-19T12:10:00.000Z"), // 08:10 local
        punches: [],
      }),
    );
    expect(result.status).toBe("scheduled");
  });

  it("is late with no punch between late and absent windows", () => {
    const result = computePresence(
      base({
        nowUtc: new Date("2026-08-19T12:30:00.000Z"), // 08:30 local
        punches: [],
      }),
    );
    expect(result.status).toBe("late");
  });

  it("is absent with no punch after absent window", () => {
    const result = computePresence(
      base({
        nowUtc: new Date("2026-08-19T13:05:00.000Z"), // 09:05 local
        punches: [],
      }),
    );
    expect(result.status).toBe("absent");
  });

  it("excuses approved vacation", () => {
    const result = computePresence(base({ vacation: true, punches: [] }));
    expect(result.status).toBe("on_vacation");
  });
});
