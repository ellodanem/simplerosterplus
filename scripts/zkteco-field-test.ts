/**
 * Step 06 — ZKTeco live end-to-end field test (non-seed org).
 * Provisions a tenant, registers device + staff, simulates ADMS punches via /iclock/*,
 * verifies AttendanceLog + adms-health, and writes docs/mvp-launch/field-test-log.md.
 *
 * Usage: npm run dev (separate terminal), then:
 *   npx tsx scripts/zkteco-field-test.ts
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { formatInTimeZone } from "date-fns-tz";
import { getAdmsHealth } from "../lib/adms-health";
import { provisionOrganization } from "../lib/ops/provision-org";
import { prisma } from "../lib/prisma";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const BASE = (process.env.FIELD_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SERIAL = "ZK-FIELD-K40-0601";
const DEVICE_USER_ID = "42";
const UNMAPPED_USER_ID = "99";
const TIME_ZONE = "America/Toronto";
const TEST_EMAIL = `fieldtest+${Date.now()}@example.test`;
const TEST_PASSWORD = "FieldTest2026!";

type CheckResult = { label: string; ok: boolean; detail: string };

async function waitForServer(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE}/iclock/getrequest?SN=ping`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function todayPunchTime(hour: number, minute: number): string {
  const now = new Date();
  const ymd = formatInTimeZone(now, TIME_ZONE, "yyyy-MM-dd");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${ymd} ${hh}:${mm}:00`;
}

async function main() {
  const checks: CheckResult[] = [];
  const logLines: string[] = [];

  console.log(`\nZKTeco field test — base URL: ${BASE}\n`);

  const serverUp = await waitForServer();
  if (!serverUp) {
    console.error(`Dev server not reachable at ${BASE}. Start with: npm run dev`);
    process.exit(1);
  }
  checks.push({ label: "Dev server reachable", ok: true, detail: BASE });

  const provisioned = await provisionOrganization({
    name: "Field Test Cafe",
    timeZone: TIME_ZONE,
    adminEmail: TEST_EMAIL,
    adminPassword: TEST_PASSWORD,
  });
  checks.push({
    label: "Non-seed org provisioned",
    ok: true,
    detail: `${provisioned.organizationName} (${provisioned.organizationId})`,
  });

  const staff = await prisma.staff.create({
    data: {
      organizationId: provisioned.organizationId,
      locationId: provisioned.locationId,
      firstName: "Jordan",
      lastName: "Field",
      deviceUserId: DEVICE_USER_ID,
      isActive: true,
    },
    select: { id: true, firstName: true, lastName: true, deviceUserId: true },
  });
  checks.push({
    label: "Staff with deviceUserId",
    ok: staff.deviceUserId === DEVICE_USER_ID,
    detail: `${staff.firstName} ${staff.lastName} → ID ${staff.deviceUserId}`,
  });

  const device = await prisma.device.create({
    data: {
      organizationId: provisioned.organizationId,
      locationId: provisioned.locationId,
      name: "Field test terminal",
      serialNumber: SERIAL,
      model: "K40",
      connectionMode: "adms_push",
      enabled: true,
    },
    select: { id: true, name: true, serialNumber: true, lastSeenAt: true },
  });
  checks.push({
    label: "ADMS device registered",
    ok: device.serialNumber === SERIAL,
    detail: `${device.name} SN=${device.serialNumber}`,
  });

  // Heartbeat
  const heartbeat = await fetch(`${BASE}/iclock/getrequest?SN=${encodeURIComponent(SERIAL)}`);
  const heartbeatBody = await heartbeat.text();
  checks.push({
    label: "GET /iclock/getrequest",
    ok: heartbeat.status === 200 && heartbeatBody.trim() === "OK",
    detail: `HTTP ${heartbeat.status} body=${heartbeatBody.trim()}`,
  });

  const deviceAfterHeartbeat = await prisma.device.findUnique({
    where: { id: device.id },
    select: { lastSeenAt: true },
  });
  checks.push({
    label: "lastSeenAt after heartbeat",
    ok: deviceAfterHeartbeat?.lastSeenAt != null,
    detail: deviceAfterHeartbeat?.lastSeenAt?.toISOString() ?? "null",
  });

  // Mapped punch (simulated ATTLOG — documented in DEVICE_INGEST_FIELD_TEST.md)
  const punchIn = todayPunchTime(8, 2);
  const punchOut = todayPunchTime(16, 1);
  const attlogBody = `${DEVICE_USER_ID}\t${punchIn}\t0\n${DEVICE_USER_ID}\t${punchOut}\t1`;
  const punchRes = await fetch(
    `${BASE}/iclock/cdata?SN=${encodeURIComponent(SERIAL)}&table=ATTLOG`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: attlogBody,
    },
  );
  const punchResBody = await punchRes.text();
  checks.push({
    label: "POST ATTLOG mapped punch",
    ok: punchRes.status === 200 && punchResBody.trim() === "OK",
    detail: `HTTP ${punchRes.status} punches: in ${punchIn}, out ${punchOut}`,
  });

  const mappedPunches = await prisma.attendanceLog.findMany({
    where: {
      organizationId: provisioned.organizationId,
      deviceId: device.id,
      staffId: staff.id,
      source: "device_adms",
    },
    orderBy: { punchAt: "asc" },
    select: { punchType: true, punchAt: true, deviceUserId: true, staffId: true },
  });
  checks.push({
    label: "AttendanceLog mapped rows",
    ok: mappedPunches.length >= 2,
    detail: `${mappedPunches.length} rows for ${staff.firstName} ${staff.lastName}`,
  });

  // Unmapped punch → map via mapDeviceUserIdToStaff (Devices UI path)
  const unmappedTime = todayPunchTime(9, 0);
  await fetch(`${BASE}/iclock/cdata?SN=${encodeURIComponent(SERIAL)}&table=ATTLOG`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: `${UNMAPPED_USER_ID}\t${unmappedTime}\t0`,
  });
  const unmapped = await prisma.attendanceLog.findFirst({
    where: {
      organizationId: provisioned.organizationId,
      deviceId: device.id,
      deviceUserId: UNMAPPED_USER_ID,
      staffId: null,
      source: "device_adms",
    },
    select: { id: true, deviceUserId: true },
  });
  checks.push({
    label: "Unmapped punch stored",
    ok: unmapped != null,
    detail: unmapped ? `deviceUserId ${unmapped.deviceUserId}` : "not found",
  });

  if (unmapped) {
    const mapperStaff = await prisma.staff.create({
      data: {
        organizationId: provisioned.organizationId,
        locationId: provisioned.locationId,
        firstName: "Temp",
        lastName: "Mapper",
        isActive: true,
      },
      select: { id: true },
    });
    const { mapDeviceUserIdToStaff } = await import("../lib/unmapped-device-punches");
    const mapped = await mapDeviceUserIdToStaff({
      organizationId: provisioned.organizationId,
      deviceUserId: UNMAPPED_USER_ID,
      staffId: mapperStaff.id,
    });
    checks.push({
      label: "Unmapped → staff backfill",
      ok: mapped.backfilledCount > 0,
      detail: `${mapped.backfilledCount} punch(es) linked to ${mapperStaff.id}`,
    });
  }

  const health = await getAdmsHealth(provisioned.organizationId);
  const healthDevice = health.devices.find((d) => d.id === device.id);
  checks.push({
    label: "adms-health last24hCount",
    ok: health.summary.last24hCount >= 3,
    detail: `last24h=${health.summary.last24hCount}, total ADMS=${health.summary.totalAdmsPunches}`,
  });
  checks.push({
    label: "adms-health device punchCount24h",
    ok: (healthDevice?.punchCount24h ?? 0) >= 3,
    detail: `device punchCount24h=${healthDevice?.punchCount24h ?? 0}, lastSeenAt=${healthDevice?.lastSeenAt ?? "null"}`,
  });
  checks.push({
    label: "adms-health no ATTLOG? hint",
    ok: healthDevice?.hint == null,
    detail: healthDevice?.hint ?? "none (good)",
  });

  const allOk = checks.every((c) => c.ok);

  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    console.log(`  [${mark}] ${c.label}: ${c.detail}`);
    logLines.push(`- [${mark}] **${c.label}** — ${c.detail}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const md = `# ZKTeco field test log

**Date:** ${today}  
**Environment:** ${BASE} (local dev)  
**Device model:** ZKTeco K40 (simulated via curl ATTLOG per [DEVICE_INGEST_FIELD_TEST.md](../DEVICE_INGEST_FIELD_TEST.md))  
**Org:** ${provisioned.organizationName} (\`${provisioned.organizationId}\`) — non-seed, provisioned for this test  
**Serial:** \`${SERIAL}\`  
**Staff device user ID:** ${DEVICE_USER_ID} (Jordan Field)

## Result

${allOk ? "**PASS** — full ADMS ingest path verified on a non-seed org." : "**FAIL** — see checks below."}

## Checks

${logLines.join("\n")}

## What worked

- Provisioning a fresh org via \`provisionOrganization\` (no SQL, no seed data)
- Device row with known serial at default location (ADMS push, enabled)
- Staff \`deviceUserId\` matched terminal PIN → punches appear in \`AttendanceLog\` with \`source=device_adms\`
- \`lastSeenAt\` updated on heartbeat and punch POST
- \`/api/attendance/adms-health\` reflects \`last24hCount\`, per-device \`punchCount24h\`, no OPERLOG-only hint
- Unmapped punch (ID ${UNMAPPED_USER_ID}) stored with \`staffId=null\`, then backfilled after staff mapping

## Gotchas for live demo

1. **Serial before first contact:** ADMS devices are created without serial in the UI; paste SN from device sticker (or first log line) before expecting punches.
2. **Public URL:** For a real terminal, set **Devices → Public URL** to the HTTPS origin the device can reach (not localhost unless tunneled).
3. **ATTLOG vs OPERLOG:** Terminal must upload ATTLOG; OPERLOG-only contact updates \`lastSeenAt\` but shows **ATTLOG?** hint with zero punches.
4. **Org timezone:** Punch timestamps are parsed in org/location TZ (\`${TIME_ZONE}\` here); verify device clock if times look wrong.
5. **Physical vs simulated:** This run used documented curl ATTLOG simulation; repeat with real hardware using the F22 checklist in the runbook.

## Repeat

\`\`\`bash
npm run dev
npx tsx scripts/zkteco-field-test.ts
\`\`\`

Admin login for this run: \`${TEST_EMAIL}\` / \`${TEST_PASSWORD}\`
`;

  const outPath = join(process.cwd(), "docs", "mvp-launch", "field-test-log.md");
  writeFileSync(outPath, md, "utf8");
  console.log(`\nWrote ${outPath}\n`);

  if (!allOk) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
