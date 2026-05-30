# ADMS device ingest — smoke test

Local or staging verification for ZKTeco ADMS push into Simple Roster Plus.

## Prerequisites

1. PostgreSQL running; `.env` has `DATABASE_URL` and `AUTH_SECRET`.
2. `npm run db:migrate`
3. `npm run db:seed` — creates demo org, device **Front entrance** with serial `ZK-K40-0001`, staff **Alex Rivera** with `deviceUserId` **7**.
4. Dev server: `npm run dev` (default `http://localhost:3000`).

## Device registration

The terminal serial in requests must match a **enabled**, non-deleted `Device.serialNumber` in the org.

| Field | Seed value |
|-------|------------|
| Serial (`SN`) | `ZK-K40-0001` |
| Staff device user id | `7` (Alex Rivera) |

## F22 / terminal settings (summary)

- HTTPS port **443**
- Push URL: `{base}/iclock/cdata`
- Poll URL: `{base}/iclock/getrequest`
- Enable **ATTLOG** / real-time attendance upload (not OPERLOG-only)
- Comm key: **not required** for SR+ ADMS v1 (serial-only identification)

Replace `{base}` with your public origin (no path), e.g. `https://localhost:3000` only works if the device can reach your machine (usually use ngrok or staging).

## 1. Heartbeat (getrequest)

```bash
curl -sS "http://localhost:3000/iclock/getrequest?SN=ZK-K40-0001"
```

Expected: HTTP 200, body `OK`. Server log: `[ADMS] GET /iclock/getrequest SN=ZK-K40-0001`.

## 2. Handshake (GET cdata)

```bash
curl -sS "http://localhost:3000/iclock/cdata?SN=ZK-K40-0001"
```

Expected: HTTP 200, CRLF option block starting with `GET OPTION FROM: ZK-K40-0001`.

## 3. Punch upload (POST ATTLOG)

Use a **naive** timestamp in the org timezone (`America/Toronto` in seed). Example for today:

```bash
curl -sS -X POST "http://localhost:3000/iclock/cdata?SN=ZK-K40-0001&table=ATTLOG" \
  -H "Content-Type: application/octet-stream" \
  --data-binary $'7\t2026-05-29 08:02:15\t0\n7\t2026-05-29 16:01:03\t1'
```

Expected: HTTP 200, body `OK`. Logs show `created N new` (first run) or `skipped` on duplicate within ±1s.

### Unmapped punch

```bash
curl -sS -X POST "http://localhost:3000/iclock/cdata?SN=ZK-K40-0001&table=ATTLOG" \
  -H "Content-Type: application/octet-stream" \
  --data-binary $'99\t2026-05-29 09:00:00\t0'
```

Expected: row with `staffId` null, `deviceUserId` `99`.

### Duplicate (within 1s)

Repeat the same POST line immediately — second insert should be skipped.

## 4. Database check

```bash
npx prisma studio
```

Open `AttendanceLog` — rows with `source = device_adms`, `deviceId` set, optional `clockOffsetMsApplied` after clock warmup.

## 5. UI check

1. Sign in: `admin@demo.local` / `demo`
2. **Attendance** → Log tab — device punches for Alex (and unmapped rows if tested)
3. **Devices** — **Front entrance** **Last active** updates after curl heartbeat/post

## Disabled device

Disable the device in UI, repeat POST — punches must **not** be created; `lastSeenAt` should not update.

## Health check

After sign-in, call the org-scoped diagnostics endpoint (session cookie required):

```bash
curl -sS -b "srp_session=YOUR_SESSION_COOKIE" "http://localhost:3000/api/attendance/adms-health"
```

Expected JSON includes:

- `summary.last24hCount` — ADMS punches ingested in the last 24 hours
- `devices[]` — per device: `lastSeenAt`, `punchCount24h`, optional `hint`
- `latest` — most recent ADMS punch (or `null` if none)
- `lastRequest` — last `/iclock/*` callback seen by this server process (in-memory; resets on restart)

**UI:** **Devices** list shows **Punches (24h)** and an **ATTLOG?** label when the device contacted the server in the last 24h but stored zero punches (usual cause: OPERLOG-only upload).

**OPERLOG-only test:** POST with `table=OPERLOG` (no ATTLOG lines) — `lastSeenAt` should update, `punchCount24h` stays 0, hint appears.

## Follow-up (out of scope)

- Unmapped `deviceUserId` queue + map-to-staff UI
- Legacy `/api/attendance/adms` alias
