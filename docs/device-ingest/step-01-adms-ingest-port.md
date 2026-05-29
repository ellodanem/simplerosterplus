# Step 01 — Port Shift Close ADMS ingest to SR+

**Status:** See [STATUS.md](./STATUS.md) — update that file when you start (`in_progress`) or finish (`completed`).

---

## Mission

Implement **live ZKTeco ADMS push** in Simple Roster Plus so a real terminal (F22-first) can send punches to `/iclock/*` and they appear in **`AttendanceLog`** and the existing **Attendance** UI — with **Shift Close parity**, adapted to SR+ multi-tenant schema and per-org timezone.

**Port + adapt, not greenfield research.**

---

## Before you start

1. Update [STATUS.md](./STATUS.md) row **01** → `in_progress`, your agent id, today's date.
2. Confirm step 01 is still `pending` or you were assigned this step explicitly.

---

## Workspaces

| Repo | Path |
|------|------|
| **SR+ (implement)** | `srp/` |
| **Shift Close (read-only)** | `c:\Users\Dane\Cursor Projects\westline\Shift Close\` |

---

## Decisions (follow exactly)

1. **ADMS auth v1:** Device identity = query param **`SN` only**. Do **not** require `commPasswordHash` on `/iclock` for this step.
2. **`AttendanceDeviceClock`:** **Required** — port learn/normalize from Shift Close.
3. **Timezone:** **`Organization.timeZone`** (IANA) for parse, day buckets, in/out alternation — not fixed `America/St_Lucia`.
4. **Staff:** Active staff only; match `Staff.deviceUserId` at **`Device.locationId`**; unknown IDs → insert with `staffId: null`.
5. **Device:** Resolve by `serialNumber` = `SN`; update `lastSeenAt`; respect `enabled: false` and `deletedAt`.
6. **Responses:** Always `200` + body `OK` on ADMS routes; log errors with `[ADMS]` prefix.

---

## Shift Close files to port

Copy/adapt into SR+ (no cross-repo imports):

| Priority | Path |
|----------|------|
| P0 | `lib/zk-iclock-push.ts` |
| P0 | `app/iclock/getrequest/route.ts`, `app/iclock/cdata/route.ts` |
| P0 | `lib/attendance-punch-ingest.ts` |
| P0 | `lib/device-user-id.ts` |
| P0 | `lib/attendance-device-clock.ts` |
| P0 | `lib/attendance-staff-device-map.ts` (or equivalent) |
| P0 | `lib/datetime-policy.ts` → adapt to org TZ |
| P1 | `lib/attendance-ingest-shared.ts` if needed for shared dedupe |
| P1 | `lib/public-url.ts` |

**Out of scope:** pay period, Windows agent, LAN pull from Vercel, comm-key validation, verify-method parsing, Clerk.

---

## SR+ schema work

Add migration:

1. **`AttendanceDeviceClock`** (per serial / device — match Shift Close behavior).
2. **`AttendanceLog`** extensions for unmapped punches: at minimum **`deviceUserId`** when `staffId` is null; prefer raw timestamp + clock offset audit fields if straightforward.

Use existing: `PunchSource.device_adms`, `Device.serialNumber`, `Device.lastSeenAt`, `Staff.deviceUserId` unique per location.

---

## Deliverables

| Deliverable | Path |
|-------------|------|
| iclock routes | `app/iclock/getrequest/route.ts`, `app/iclock/cdata/route.ts` |
| Ported libs | `lib/zk-iclock-push.ts`, etc. |
| Handoff archive | `docs/SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md` — create if missing; use Shift Close agent audit or ask user |
| Smoke test doc | `docs/DEVICE_INGEST_SMOKE.md` |
| Env example | Update `.env.example` with public URL vars (names + comments only) |

---

## Definition of done

- [ ] `GET /iclock/getrequest?SN=…` → `200` `OK`
- [ ] `POST /iclock/cdata?SN=…&table=ATTLOG` → rows in `AttendanceLog`
- [ ] Mapped `deviceUserId` → `staffId` set; unknown → `staffId` null, `deviceUserId` stored
- [ ] Dedupe ±1s; `Device.lastSeenAt` updates; disabled/deleted device ignored
- [ ] Punches visible on Attendance week/log UI
- [ ] `AttendanceDeviceClock` in use (not stubbed)
- [ ] Build/typecheck passes
- [ ] [STATUS.md](./STATUS.md) row **01** → `completed` with date

---

## Verification

1. Migrate DB, seed device + staff with matching IDs.
2. `curl` getrequest + sample ATTLOG POST (see smoke doc).
3. Confirm in UI and Prisma Studio.

---

## When finished

Update [STATUS.md](./STATUS.md): `completed`, notes (e.g. env var names, any intentional SC deviations).

**Do not commit or push unless the user asks.**
