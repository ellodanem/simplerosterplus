# ADMS device ingest — partner / field test runbook

Joint hardware session checklist for **you + ZKTeco partner**. Same ADMS path as production Shift Close; SR+ is the manager layer (roster, leave, attendance).

**Related:** [DEVICE_INGEST_SMOKE.md](./DEVICE_INGEST_SMOKE.md) (solo curl checks), [SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md](./SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md) (protocol audit).

---

## A. Private pre-test (you, before partner arrives)

Complete this **24–48 hours before** the session. Target: everything green before the partner opens the F22 menu.

### 1. Staging environment

| Item | Action |
|------|--------|
| **Staging URL** | Deploy SR+ to a stable HTTPS origin the terminal can reach (Vercel preview is OK if hostname has no hyphens, or use a custom domain). |
| **Public URL** | Sign in → **Devices → Public URL** → set org override to that origin (overrides `APP_URL` / Vercel preview). Confirm push/poll URLs in **Add device** checklist match. |
| **Org seeded** | DB migrated; at least one location; org timezone set correctly (`Organization.timeZone`). |
| **Manager login** | Test account ready (e.g. staging admin). |

### 2. Staff and roster

- **3–5 active staff** at the device location with **`deviceUserId`** set (must match terminal enrolment PIN).
- Publish or confirm the **current week roster** so attendance context makes sense during the live punch demo.
- Note each staff member’s **device user ID** on a printed cheat sheet for the partner.

### 3. Device row in SR+

Add the device (ADMS push) with the **serial from the device sticker** before configuring the
terminal. Serial is required — every `/iclock` callback is matched by `SN`, and punches are not
stored until an enabled device row has that serial.

Device must be **enabled**, **ADMS push** mode, at the correct **location**.

### 4. curl sanity (from your laptop)

Replace `{BASE}` with staging origin and `{SN}` with device serial.

**Heartbeat:**

```bash
curl -sS "{BASE}/iclock/getrequest?SN={SN}"
```

Expected: HTTP 200, body `OK`. Server log: `[ADMS] GET /iclock/getrequest SN={SN}`.

**Sample ATTLOG punch** (use a seeded `deviceUserId` and today’s date in org timezone):

```bash
curl -sS -X POST "{BASE}/iclock/cdata?SN={SN}&table=ATTLOG" \
  -H "Content-Type: application/octet-stream" \
  --data-binary $'7\t2026-05-30 08:02:15\t0'
```

Expected: HTTP 200 `OK`; punch appears under **Attendance → Log** for mapped staff.

Full curl matrix: [DEVICE_INGEST_SMOKE.md](./DEVICE_INGEST_SMOKE.md).

### 5. F22 / terminal menu checklist

On the device: **COMM → Cloud Server** (or **ADMS** / **Network → Server** — label varies by model).

**The only per-customer value is the domain.** Everything else is a constant. On modern
firmware you type three things and turn on ATTLOG:

| Setting | Value |
|---------|--------|
| Server address | Domain only, no `https://`, no path (e.g. `attendance.example.com`) — prefer **hyphen-free** hostname |
| Port | **443** |
| Protocol / SSL | **HTTPS** on; enable **Domain name** / DNS so it uses the address, not an IP |
| Attendance upload | **ATTLOG** / real-time attendance **enabled** |
| OPERLOG-only | **Off** (or not the only upload type) |
| Comm key | **Not required** for SR+ ADMS v1 (serial-only identification) |

The firmware appends `/iclock/*` itself, so you do **not** enter a full URL. Copy the exact
server address from **Devices → Add device** (it shows Server address / Port / Protocol as the
headline).

**Older firmware that wants a full URL instead of a server address:**

| Setting | Value |
|---------|--------|
| Push / upload URL | `{BASE}/iclock/cdata` |
| Poll / get URL | `{BASE}/iclock/getrequest` |
| Server path | `/iclock` |

These are in the **Add device** post-create card under "Older firmware that wants full URLs".

### 6. Health endpoint (step 02)

After sign-in:

```bash
curl -sS -b "srp_session=YOUR_SESSION_COOKIE" "{BASE}/api/attendance/adms-health"
```

Confirm:

- `summary.last24hCount` reflects test punches
- `devices[]` shows your terminal with `lastSeenAt`, `punchCount24h`
- No **ATTLOG?** hint on **Devices** list (hint = contacted server but zero punches → usually OPERLOG-only)

**UI:** **Devices** → **Punches (24h)** column populated after curl or live punch.

### 7. Pre-test pass criteria

- [ ] curl getrequest returns `OK` and appears in logs
- [ ] curl ATTLOG creates a mapped punch in **Attendance**
- [ ] **Devices → Last active** updates for the test device
- [ ] **adms-health** shows expected counts
- [ ] Public URL pairing copy shows reachable HTTPS origin (not localhost)

---

## B. Joint session agenda (60–90 min)

Bring: laptop with SR+ admin open, staging logs (Vercel or server), printed staff ID cheat sheet, this doc.

| # | Block | Time | What to do |
|---|--------|------|------------|
| 1 | **Roster + staff IDs** | 10 min | Show published roster; confirm each enrolled employee has matching **Device user ID** in SR+ Staff. |
| 2 | **Register device / pairing** | 10 min | **Devices → Add device** (or open existing row). Show the Server address / Port / Protocol headline and F22 checklist. Set **Public URL** if partner questions the domain. |
| 3 | **Partner configures terminal** | 15–25 min | Partner enters the server address (443, HTTPS) on F22; enable ATTLOG; save. You watch logs for first `getrequest` / `cdata` matching the registered serial. |
| 4 | **Live punch → attendance week** | 15 min | Partner enrols or uses test finger/face; punch on terminal. Refresh **Attendance → Log** and week view. Confirm staff name, in/out, times in org TZ. |
| 5 | **Second model (if available)** | 15 min | Repeat URL + ATTLOG setup on alternate hardware (K40 vs SpeedFace, etc.). Note any menu label differences. |
| 6 | **Unmapped ID drill (optional)** | 10 min | Punch with unknown PIN or curl unmapped ID `99`; show **Devices → Unmapped device punches** panel; map to staff; confirm backfill. |

**Success signal:** terminal **Last active** fresh, **Punches (24h)** &gt; 0, named staff in **Attendance**, partner confirms F22 settings match SR+ copy.

---

## C. Failure modes (&lt;5 min each)

| Symptom | Likely cause | Check |
|---------|----------------|-------|
| **No server logs** | Wrong URL, HTTP not HTTPS, DNS, firewall | curl getrequest from laptop on same `{BASE}`; verify **Public URL**; try hyphen-free hostname |
| **Contact, 0 punches** (`ATTLOG?` in UI) | OPERLOG enabled but not ATTLOG | F22 upload settings; post OPERLOG-only traffic updates `lastSeenAt` but not punch count |
| **Punches, no staff name** | Unmapped `deviceUserId` | **Devices → Unmapped device punches**; map ID to staff (step 03) |
| **Wrong times** | Device clock drift / wrong TZ | Org timezone in SR+; device date/time; after live punches, clock learn may apply offset (see logs) |
| **`no enabled device for SN=…` in logs** | Serial mismatch or device disabled | Compare log SN to device row; set serial before first match if using callback workflow |
| **Duplicates** | Expected within ±1 s window | Re-punch or replay same line — second insert skipped by design; explain dedupe to partner |

---

## D. Explicit non-goals for this session

Do **not** scope-creep into:

- Pay period / payroll extraction in SR+
- Pull TCP sync from cloud (LAN-only advanced mode)
- Comm key validation or legacy `/api/attendance/adms` alias
- Employee mobile app
- AI scheduler / auto-rostering

If the partner asks: note for backlog; stay on **ADMS push + attendance visibility**.

---

## E. Product one-liner

*Same ADMS path as production Shift Close; SR+ is the manager layer (roster, leave, attendance).*

---

## Quick reference

| Resource | Location |
|----------|----------|
| Solo smoke / curl | [DEVICE_INGEST_SMOKE.md](./DEVICE_INGEST_SMOKE.md) |
| Protocol handoff | [SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md](./SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md) |
| Implementation steps | [device-ingest/STATUS.md](./device-ingest/STATUS.md) |
| Push URL | `{BASE}/iclock/cdata` |
| Poll URL | `{BASE}/iclock/getrequest?SN={SN}` |
| Health API | `GET /api/attendance/adms-health` (session required) |
