# Shift Close → SR+ device ingest handoff

Source: live code under `westline/Shift Close/` (read-only). SR+ implementation follows this audit with multi-tenant adaptations documented in **SR+-specific callouts** at the end.

## Executive summary

- Production path is **ADMS push** to `GET/POST /iclock/*` (Shift Close also has legacy `GET/POST /api/attendance/adms`); handlers in `lib/zk-iclock-push.ts`, wired from `app/iclock/getrequest/route.ts` and `app/iclock/cdata/route.ts`.
- **No HTTP comm-key auth** in Shift Close: devices identified by query **`SN` only**; optional serial allowlist affects clock **learning**, not whether punches are stored.
- Punch pipeline: ATTLOG tab lines → naive time in station TZ → optional per-serial offset (`AttendanceDeviceClock`) → `AttendanceLog` with dedupe ±1s and leading-zero ID variants.
- F22 field config (Shift Close UI): HTTPS 443, push `/iclock/cdata`, poll `/iclock/getrequest`, enable **ATTLOG** (not OPERLOG-only).
- Shift Close: single-tenant, fixed `America/St_Lucia`; no `Device` Prisma model.
- **SR+** (ported): `organizationId` / `locationId`, per-org IANA TZ, `Device` row + `PunchSource.device_adms`, comm key stored but **not validated** on `/iclock` for P0.

---

## 1. Production topology

| ID | Answer | Evidence |
|----|--------|----------|
| T1 | Vercel + Neon (region N/A in repo) | `.env.example`, `vercel.json` |
| T2 | `{APP_URL}/iclock/cdata` (push), `{APP_URL}/iclock/getrequest?SN=…` (poll) | `lib/public-url.ts`, SC attendance page |
| T3 | Single global URL per SC deployment | No `Organization` in SC |
| T4 | HTTPS 443; hyphen-free hostname note in UI | SC attendance page |
| T5 | Inbound HTTPS for ADMS; LAN 4370 only for optional pull | `app/api/attendance/sync/route.ts` |

**SR+:** Per-org `APP_URL` / deployment URL; P0 assumes one primary org per deployment URL if serial collision across orgs.

---

## 2. ADMS routes & protocol

| ID | Answer |
|----|--------|
| A1 | `GET /iclock/getrequest`, `GET/POST /iclock/cdata`; legacy `/api/attendance/adms` in SC only |
| A2 | getrequest → `OK`; GET cdata → CRLF options; POST ATTLOG → tab lines → always `OK` |
| A3 | No comm key on `/iclock` in SC |
| A4 | `SN` query param; `AttendanceDeviceClock` keyed by serial |
| A5 | ATTLOG required; OPERLOG/BIODATA skipped |
| A6 | state 0/4 → in, 1/5 → out; else alternate per user-day in business TZ |
| A7 | Verify columns not parsed (cols 0–2 only) |

**Sample POST body:**

```
7\t2026-05-29 08:02:15\t0
7\t2026-05-29 16:01:03\t1
```

---

## 3. Punch ingest pipeline (ADMS)

1. Public `/iclock/*` (no JWT)
2. `zkPushPOST` — resolve `table=ATTLOG` (or infer from body)
3. Load org TZ + clock settings (`AppSettings` in SC; per-org in SR+)
4. Active staff → `buildStaffDeviceMap` (leading-zero keys)
5. `parseDeviceNaiveTimestampToUtc`
6. `detectBulkUpload` → skip learn on bulk
7. `maybeLearnDeviceClock` (single-line live only)
8. `normalizePunchUtcForDevice`
9. In/out + calendar day bucketing
10. `lookupStaffDevice` → `staffId` or null
11. `insertAttendancePunchesSkippingDuplicates` (chunks of 250)
12. UI reads `AttendanceLog`

**Env names (ingest-related):** `DATABASE_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `VERCEL_URL`, `ZK_ICLOCK_TIMEZONE_OFFSET_MINUTES`, `ZK_ICLOCK_HANDSHAKE_TIMEZONE`, clock keys in `AppSetting`.

---

## 4. F22 / device matrix

- Example serial in SC UI: `SRN5244700175`
- COMM → Cloud Server: host, 443, HTTPS, push/poll paths as above
- ADMS is prod path; TCP pull is LAN/on-prem optional

---

## 5. Timezone

| SC | SR+ port |
|----|-----------|
| Fixed `America/St_Lucia` | `Organization.timeZone` (+ location/device override) |
| `toYmdInBusinessTz` | `formatYmdInZone(instant, tz)` |

---

## 6. Security & public paths

SC `isPublicPath`: `/iclock*`, `/api/attendance/adms*`, ingest, pending-staff, crons, auth.

**SR+:** `/iclock` outside middleware matcher; explicit early return in `middleware.ts` for documentation.

---

## 7. Schema mapping (SC → SR+)

| Shift Close | SR+ |
|-------------|-----|
| `source: adms:{sn}` | `PunchSource.device_adms` + `deviceId` |
| `deviceSerial` on log | `Device.serialNumber` + `deviceId` FK |
| `AttendanceDeviceClock.deviceSerial` | `@@id([organizationId, deviceSerial])` |
| No Device model | `Device` enabled/deletedAt gate ingest |
| `staff.status: active` | `isActive` + `archivedAt: null`, scoped to `locationId` |

---

## 8. Minimum port set (P0 — done in SR+)

| Priority | Path | SR+ location |
|----------|------|----------------|
| P0 | `lib/zk-iclock-push.ts` | `lib/zk-iclock-push.ts` |
| P0 | `app/iclock/getrequest`, `cdata` | `app/iclock/*` |
| P0 | `lib/attendance-punch-ingest.ts` | `lib/attendance-punch-ingest.ts` |
| P0 | `lib/device-user-id.ts` | `lib/device-user-id.ts` |
| P0 | `lib/attendance-device-clock.ts` | `lib/attendance-device-clock.ts` |
| P0 | `lib/attendance-staff-device-map.ts` | `lib/attendance-staff-device-map.ts` |
| P0 | `lib/datetime-policy.ts` | existing (org TZ callers) |
| P1 | `lib/public-url.ts` | `lib/public-url.ts` |

---

## 9. SR+-specific decisions (P0)

| Topic | Decision |
|-------|----------|
| ADMS auth | `SN` only; no `commPasswordHash` check on `/iclock` |
| Disabled / deleted device | No ingest, no `lastSeenAt` update |
| Staff match | Active staff at device `locationId` only |
| Multi-org serial | `findMany` + warn; first match wins |
| Pay period / extraction | Out of scope |
| Verify method on ATTLOG | Not parsed (SC parity) |

---

## 10. Follow-up tasks (not P0)

- ADMS health endpoint + Devices “last 24h” diagnostic
- Unmapped `deviceUserId` queue + map-to-staff UI
- Partner runbook + optional `/api/attendance/adms` alias
- Comm key validation (if product requires) without breaking ZKTeco always-200 behavior
- Pull TCP / Windows agent / pay period modules

---

## 11. Open gaps / unknowns

- Production hostname and live F22 firmware strings in SC DB
- Whether SC prod uses Windows agent or TCP pull regularly
- TLS edge cases beyond hostname guidance
- Exact ATTLOG columns beyond PIN, datetime, state

---

## 12. SR+ smoke testing

See [DEVICE_INGEST_SMOKE.md](./DEVICE_INGEST_SMOKE.md).
