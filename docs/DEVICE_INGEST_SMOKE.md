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

On modern firmware the terminal takes a **server address**, not a full URL — it appends
`/iclock/*` itself. Enter three values and turn on ATTLOG:

- Server address: your domain only (e.g. `attendance.example.com`, no `https://`, no path)
- Port **443**, protocol **HTTPS**, enable **Domain name** / DNS
- Enable **ATTLOG** / real-time attendance upload (not OPERLOG-only)
- Comm key: **not required** for SR+ ADMS v1 (serial-only identification)

Older firmware (or curl) that wants full URLs uses `{base}/iclock/cdata` (push) and
`{base}/iclock/getrequest` (poll). Replace `{base}` with your public origin (no trailing slash,
no path).

**Resolution order (SR+):**

1. **Devices → Public URL** — per-org `AppSetting` `public_app_url` (use for custom domain vs Vercel preview URL)
2. **`APP_URL`** or **`NEXT_PUBLIC_APP_URL`** in deployment env
3. **`VERCEL_URL`** on Vercel
4. Request host in local dev (`http://localhost:3000`)

`https://localhost:3000` only works if the device can reach your machine (usually use ngrok or staging). Prefer a hyphen-free hostname on ZKTeco keypads when possible.

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
4. **Devices → Public URL** — set org override (e.g. ngrok HTTPS origin); Add device checklist and post-create pairing card should show matching push/poll URLs

### Public URL API (optional)

```bash
curl -sS -b "srp_session=YOUR_SESSION_COOKIE" "http://localhost:3000/api/devices/public-url"
```

```bash
curl -sS -X PUT -b "srp_session=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"publicAppUrl":"https://your-tunnel.example.com"}' \
  "http://localhost:3000/api/devices/public-url"
```

Clear org override: `{"publicAppUrl":""}`.

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

**UI:** **Devices** list shows **Punches (24h)** and a **No punches?** hint when the device contacted the server in the last 24h but stored zero punches (usual cause: OPERLOG-only upload). Manager-facing copy stays plain; protocol detail lives here and in the field-test runbook / operator console.

**Diagnostics (not on the Devices page):** `GET /api/attendance/adms-health` (session required). Hyphenated hostnames are awkward on some ZKTeco keypads — prefer a hyphen-free subdomain; the **Public URL** modal still warns when relevant.

**OPERLOG-only test:** POST with `table=OPERLOG` (no ATTLOG lines) — `lastSeenAt` should update, `punchCount24h` stays 0, hint appears.

## Follow-up (out of scope)

- Unmapped `deviceUserId` queue + map-to-staff UI
- Legacy `/api/attendance/adms` alias
