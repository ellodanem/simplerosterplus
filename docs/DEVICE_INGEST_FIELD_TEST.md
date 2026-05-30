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

Two valid paths:

| Path | When to use |
|------|-------------|
| **SN known upfront** | Add device (ADMS push) with serial from device sticker **before** configuring the terminal. |
| **SN from first callback** | Add device **without** serial; configure terminal URLs; watch server logs for `[ADMS] … SN=<serial>`; edit device row and paste serial **before** expecting punches. Serial locks after first successful match (`lastSeenAt` set). |

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

| Setting | Value |
|---------|--------|
| Server host | Hostname only (no `https://`, no path) — prefer **hyphen-free** hostname |
| Port | **443** |
| Protocol | **HTTPS** |
| Push / upload URL | `{BASE}/iclock/cdata` |
| Poll / get URL | `{BASE}/iclock/getrequest` |
| Attendance upload | **ATTLOG** / real-time attendance **enabled** |
| OPERLOG-only | **Off** (or not the only upload type) |
| Comm key | **Not required** for SR+ ADMS v1 (serial-only identification) |

Copy exact URLs from **Devices → Add device** checklist or post-create pairing card.

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
| 2 | **Register device / pairing URLs** | 10 min | **Devices → Add device** (or open existing row). Show push/poll URLs and F22 checklist. Set **Public URL** if partner questions hostname. |
| 3 | **Partner configures terminal** | 15–25 min | Partner enters URLs on F22; enable ATTLOG; save. You watch logs for first `getrequest` / `cdata`. If SN was blank, paste serial from log into device edit. |
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
