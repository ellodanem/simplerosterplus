# Step 03 — Unmapped device user IDs

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 01 `completed`.

---

## Mission

When ATTLOG arrives with a **device user ID** that doesn’t match any active `Staff.deviceUserId` at that location, Shift Close still stores the punch (`staffId: null`) and logs `[ADMS] unmapped device user id`. SR+ needs a **manager-visible path** to fix mapping without SQL.

Shift Close reference: `app/api/attendance/device/map-users`, `pending-staff` (read Shift Close; adapt to SR+).

---

## Before you start

1. [STATUS.md](./STATUS.md) row **03** → `in_progress`.
2. Confirm step **01** is `completed`.

---

## Implement

1. **List unmapped** — API: recent `AttendanceLog` rows (or aggregate) where `staffId` is null and `deviceUserId` is set, scoped to org/location.
2. **Map to staff** — API: assign `Staff.deviceUserId` for a staff member at location (enforce `@@unique([locationId, deviceUserId])`); optional backfill link on past unmapped logs for that ID.
3. **Minimal UI** — e.g. section on Devices page, Attendance page banner, or Staff edit hint — enough for demo/partner test; no full admin console.

Reuse Shift Close `lib/device-user-id.ts` rules (leading zeros, 1–999 style IDs).

---

## Out of scope

- Auto-allocate next device user ID from terminal (can follow later)
- Push staff roster down to device firmware

---

## Definition of done

- [x] Unmapped punch visible in UI
- [x] Manager can map ID → staff without DB access
- [x] Duplicate `deviceUserId` at same location rejected with clear error
- [x] [STATUS.md](./STATUS.md) row **03** → `completed`

**Do not commit unless user asks.**
