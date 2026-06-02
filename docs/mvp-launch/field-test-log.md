# ZKTeco field test log

**Date:** 2026-06-01  
**Environment:** http://localhost:3000 (local dev)  
**Device model:** ZKTeco K40 (simulated via curl ATTLOG per [DEVICE_INGEST_FIELD_TEST.md](../DEVICE_INGEST_FIELD_TEST.md))  
**Org:** Field Test Cafe (`cmpvsp9w20000dus00ycggzip`) — non-seed, provisioned for this test  
**Serial:** `ZK-FIELD-K40-0601`  
**Staff device user ID:** 42 (Jordan Field)

## Result

**PASS** — full ADMS ingest path verified on a non-seed org.

## Checks

- [PASS] **Dev server reachable** — http://localhost:3000
- [PASS] **Non-seed org provisioned** — Field Test Cafe (cmpvsp9w20000dus00ycggzip)
- [PASS] **Staff with deviceUserId** — Jordan Field → ID 42
- [PASS] **ADMS device registered** — Field test terminal SN=ZK-FIELD-K40-0601
- [PASS] **GET /iclock/getrequest** — HTTP 200 body=OK
- [PASS] **lastSeenAt after heartbeat** — 2026-06-01T22:43:49.640Z
- [PASS] **POST ATTLOG mapped punch** — HTTP 200 punches: in 2026-06-01 08:02:00, out 2026-06-01 16:01:00
- [PASS] **AttendanceLog mapped rows** — 2 rows for Jordan Field
- [PASS] **Unmapped punch stored** — deviceUserId 99
- [PASS] **Unmapped → staff backfill** — 1 punch(es) linked to cmpvspdp6000adus0mfv56l0z
- [PASS] **adms-health last24hCount** — last24h=3, total ADMS=3
- [PASS] **adms-health device punchCount24h** — device punchCount24h=3, lastSeenAt=2026-06-01T22:43:52.265Z
- [PASS] **adms-health no ATTLOG? hint** — none (good)

## What worked

- Provisioning a fresh org via `provisionOrganization` (no SQL, no seed data)
- Device row with known serial at default location (ADMS push, enabled)
- Staff `deviceUserId` matched terminal PIN → punches appear in `AttendanceLog` with `source=device_adms`
- `lastSeenAt` updated on heartbeat and punch POST
- `/api/attendance/adms-health` reflects `last24hCount`, per-device `punchCount24h`, no OPERLOG-only hint
- Unmapped punch (ID 99) stored with `staffId=null`, then backfilled after staff mapping

## Gotchas for live demo

1. **Serial before first contact:** ADMS devices are created without serial in the UI; paste SN from device sticker (or first log line) before expecting punches.
2. **Public URL:** For a real terminal, set **Devices → Public URL** to the HTTPS origin the device can reach (not localhost unless tunneled).
3. **ATTLOG vs OPERLOG:** Terminal must upload ATTLOG; OPERLOG-only contact updates `lastSeenAt` but shows **ATTLOG?** hint with zero punches.
4. **Org timezone:** Punch timestamps are parsed in org/location TZ (`America/Toronto` here); verify device clock if times look wrong.
5. **Physical vs simulated:** This run used documented curl ATTLOG simulation; repeat with real hardware using the F22 checklist in the runbook.

## Repeat

```bash
npm run dev
npx tsx scripts/zkteco-field-test.ts
```

Admin login for this run: `fieldtest+1780353823850@example.test` / `FieldTest2026!`
