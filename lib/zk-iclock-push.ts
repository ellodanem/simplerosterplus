import { NextRequest, NextResponse } from "next/server";
import type { PunchType } from "@prisma/client";
import {
  deviceUserIdForGrouping,
  deviceUserIdLookupKeys,
} from "@/lib/device-user-id";
import {
  detectBulkUpload,
  getAttendanceClockGlobalSettings,
  maybeLearnDeviceClock,
  normalizePunchUtcForDevice,
  parseDeviceNaiveTimestampToUtc,
  serialAllowed,
} from "@/lib/attendance-device-clock";
import { buildStaffDeviceMap, lookupStaffDevice } from "@/lib/attendance-staff-device-map";
import { insertAttendancePunchesSkippingDuplicates } from "@/lib/attendance-punch-ingest";
import {
  resolveAdmsDeviceBySerial,
  resolveDeviceTimeZone,
  touchDeviceLastSeen,
} from "@/lib/adms-device";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { prisma } from "@/lib/prisma";

/**
 * ZKTeco iClock / ADMS push protocol (HTTPS).
 * Standard paths: GET /iclock/getrequest, POST /iclock/cdata?table=ATTLOG
 */

function buildIclockCdataHandshakeBody(serial: string): string {
  const sn = serial.trim() || "unknown";
  const opStamp = Math.floor(Date.now() / 1000);
  const includeTz = process.env.ZK_ICLOCK_HANDSHAKE_TIMEZONE !== "0";
  const rawTz = process.env.ZK_ICLOCK_TIMEZONE_OFFSET_MINUTES;
  let tzMinutes = -240;
  if (rawTz !== undefined && String(rawTz).trim() !== "") {
    const n = parseInt(String(rawTz).trim(), 10);
    if (Number.isFinite(n)) tzMinutes = n;
  }

  const parts = [
    `GET OPTION FROM: ${sn}`,
    "Stamp=9999",
    `OpStamp=${opStamp}`,
    "ErrorDelay=60",
    "Delay=30",
    "ResLogDay=18250",
    "ResLogDelCount=10000",
    "ResLogCount=50000",
    "TransTimes=00:00;14:05",
    "TransInterval=1",
    "TransFlag=1111000000",
  ];
  if (includeTz && Number.isFinite(tzMinutes)) {
    parts.push(`TimeZone=${tzMinutes}`);
  }
  parts.push("Realtime=1", "Encrypt=0");
  return parts.join("\r\n") + "\r\n";
}

function lineLooksLikeAttLog(line: string): boolean {
  return /^\d+\t\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/.test(line.trim());
}

function bodyHasAttLogLines(bodyText: string): boolean {
  for (const line of bodyText.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (lineLooksLikeAttLog(line)) return true;
  }
  return false;
}

function resolveTableParam(request: NextRequest, bodyText: string): string {
  const sp = request.nextUrl.searchParams;
  const fromQuery = sp.get("table") || sp.get("Table") || sp.get("TABLE");
  if (fromQuery) return fromQuery.toUpperCase();

  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/x-www-form-urlencoded") && bodyText.trim()) {
    try {
      const params = new URLSearchParams(bodyText);
      const t = params.get("table") || params.get("Table");
      if (t) return t.toUpperCase();
    } catch {
      // ignore
    }
  }

  const first = bodyText.trim().split(/\r?\n/).find((l) => l.trim()) || "";
  if (lineLooksLikeAttLog(first)) {
    return "ATTLOG";
  }

  return "";
}

type ParsedRow = {
  deviceUserId: string;
  timestampStr: string;
  state: number;
  parsedUtc: Date;
  parseFallback: boolean;
};

async function touchDeviceIfResolved(sn: string): Promise<Awaited<ReturnType<typeof resolveAdmsDeviceBySerial>>> {
  const device = await resolveAdmsDeviceBySerial(sn);
  if (device) {
    await touchDeviceLastSeen(device.id);
  }
  return device;
}

export async function zkPushGET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN") || "unknown";
  const path = request.nextUrl.pathname;
  console.log(`[ADMS] GET ${path} SN=${sn}`);
  if (sn !== "unknown") {
    await touchDeviceIfResolved(sn);
  }
  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function zkPushCDATAGET(request: NextRequest) {
  const sn = request.nextUrl.searchParams.get("SN") || "unknown";
  const path = request.nextUrl.pathname;
  const body = buildIclockCdataHandshakeBody(sn);
  const tzMode =
    process.env.ZK_ICLOCK_HANDSHAKE_TIMEZONE === "0"
      ? "omit"
      : process.env.ZK_ICLOCK_TIMEZONE_OFFSET_MINUTES?.trim() || "default-240";
  console.log(`[ADMS] GET ${path} SN=${sn.trim() || "unknown"} handshake=options tz=${tzMode}`);
  if (sn !== "unknown") {
    await touchDeviceIfResolved(sn);
  }
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function zkPushPOST(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const snRaw = url.searchParams.get("SN") || "unknown";
  const sn = snRaw.trim();

  try {
    const body = await request.text();
    let table = resolveTableParam(request, body);
    const declaredTable = table;

    if (table !== "ATTLOG" && bodyHasAttLogLines(body)) {
      console.log(
        `[ADMS] body contains ATTLOG-shaped lines; processing as ATTLOG (declared table=${declaredTable || "empty"}) SN=${sn}`,
      );
      table = "ATTLOG";
    }

    console.log(`[ADMS] POST ${path} table=${table || "(none)"} SN=${sn} bytes=${body.length}`);

    if (table !== "ATTLOG") {
      const preview = body.trim().slice(0, 120).replace(/\s+/g, " ");
      console.log(
        `[ADMS] skip: need attendance punches (ATTLOG). Declared table=${declaredTable || "empty"}. ` +
          `OPERLOG/BIODATA are not stored. Enable real-time upload for Attendance/ATTLOG on the device. ` +
          `Preview: ${preview || "(empty)"}`,
      );
      if (sn !== "unknown") {
        await touchDeviceIfResolved(sn);
      }
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    if (!body.trim()) {
      console.log("[ADMS] ATTLOG POST with empty body");
      if (sn !== "unknown") {
        await touchDeviceIfResolved(sn);
      }
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const device = await resolveAdmsDeviceBySerial(sn);
    if (!device) {
      console.log(`[ADMS] no enabled device for SN=${sn}; punches not stored`);
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    await touchDeviceLastSeen(device.id);

    const receivedAt = new Date();
    const stationTz = resolveDeviceTimeZone(device);
    const clockSettings = await getAttendanceClockGlobalSettings(device.organizationId);

    const allStaff = await prisma.staff.findMany({
      where: {
        locationId: device.locationId,
        isActive: true,
        archivedAt: null,
      },
      select: { id: true, firstName: true, lastName: true, deviceUserId: true },
    });
    const staffMap = buildStaffDeviceMap(allStaff);

    const lines = body.trim().split(/\r?\n/);
    const rawParsed: ParsedRow[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      const deviceUserId = (parts[0] || "").trim();
      const timestampStr = (parts[1] || "").trim();
      const state = parseInt(parts[2] || "0", 10);

      if (!deviceUserId || !timestampStr) continue;

      let parsedUtc = parseDeviceNaiveTimestampToUtc(timestampStr, stationTz);
      let parseFallback = false;
      if (!parsedUtc) {
        const d = new Date(timestampStr);
        if (isNaN(d.getTime())) continue;
        parsedUtc = d;
        parseFallback = true;
      }

      rawParsed.push({ deviceUserId, timestampStr, state, parsedUtc, parseFallback });
    }

    if (rawParsed.length === 0) {
      return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    const bulk = detectBulkUpload(
      rawParsed.map((r) => r.parsedUtc),
      clockSettings,
    );

    const eligibleSingleLineLive =
      rawParsed.length === 1 &&
      !bulk &&
      sn !== "unknown" &&
      serialAllowed(sn, clockSettings) &&
      clockSettings.learn;

    if (eligibleSingleLineLive) {
      await maybeLearnDeviceClock({
        organizationId: device.organizationId,
        deviceSerial: sn,
        receivedAt,
        deviceParsedUtc: rawParsed[0]!.parsedUtc,
        bulk: false,
        settings: clockSettings,
        eligibleSingleLineLive: true,
      });
    }

    const normalized = await Promise.all(
      rawParsed.map(async (r) => {
        const norm = await normalizePunchUtcForDevice({
          organizationId: device.organizationId,
          deviceSerial: sn,
          deviceParsedUtc: r.parsedUtc,
          settings: clockSettings,
        });
        let reason = norm.reason;
        if (r.parseFallback) reason = `${reason}_parse_fallback`;
        return {
          deviceUserId: r.deviceUserId,
          timestampStr: r.timestampStr,
          state: r.state,
          parsedUtc: r.parsedUtc,
          punchUtc: norm.punchUtc,
          offsetMs: norm.offsetMsApplied,
          reason,
        };
      }),
    );

    const byUserDay = new Map<string, Array<{ deviceUserId: string; punchTime: Date; state: number }>>();

    for (const row of normalized) {
      const punchTime = row.punchUtc;
      const dayKey = `${deviceUserIdForGrouping(row.deviceUserId)}|${formatYmdInZone(punchTime, stationTz)}`;
      if (!byUserDay.has(dayKey)) byUserDay.set(dayKey, []);
      byUserDay.get(dayKey)!.push({ deviceUserId: row.deviceUserId, punchTime, state: row.state });
    }

    for (const arr of byUserDay.values()) {
      arr.sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());
    }

    const toInsert = [];
    for (const row of normalized) {
      const { deviceUserId, punchUtc, state, timestampStr, offsetMs, reason } = row;

      let punchType: PunchType;
      if (state === 0 || state === 4) {
        punchType = "in";
      } else if (state === 1 || state === 5) {
        punchType = "out";
      } else {
        const dayKey = `${deviceUserIdForGrouping(deviceUserId)}|${formatYmdInZone(punchUtc, stationTz)}`;
        const dayPunches = byUserDay.get(dayKey) || [];
        const idx = dayPunches.findIndex((p) => Math.abs(p.punchTime.getTime() - punchUtc.getTime()) < 1000);
        punchType = idx % 2 === 0 ? "in" : "out";
      }

      const staffMatch = lookupStaffDevice(staffMap, deviceUserId);
      const logDeviceUserId = staffMatch?.deviceUserId ?? deviceUserId.trim();
      if (!staffMatch) {
        const keysForDup = deviceUserIdLookupKeys(deviceUserId);
        console.log(
          `[ADMS] unmapped device user id (no active staff match for normalized keys ${JSON.stringify(keysForDup)}) SN=${sn}`,
        );
      }

      toInsert.push({
        organizationId: device.organizationId,
        locationId: device.locationId,
        staffId: staffMatch?.id ?? null,
        deviceId: device.id,
        deviceUserId: logDeviceUserId,
        punchAt: punchUtc,
        punchType,
        source: "device_adms" as const,
        deviceRawTimestamp: timestampStr,
        ingestReceivedAt: receivedAt,
        clockOffsetMsApplied: offsetMs,
        clockNormalizeReason: reason,
      });
    }

    const { created, skipped } = await insertAttendancePunchesSkippingDuplicates(toInsert);

    console.log(
      `[ADMS] SN=${sn} org=${device.organizationId} tz=${stationTz} processed ${normalized.length} records, created ${created} new, skipped ${skipped}, bulk=${bulk ? "1" : "0"}`,
    );
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    console.error("[ADMS] Error:", error);
    return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
}
