# Step 06 — Partner / field test runbook

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Steps 01–02 `completed` (03–04 recommended).

---

## Mission

Single doc for **you + ZKTeco partner** joint hardware session: private pre-test checklist + live session script + failure modes (&lt;5 min each).

**Doc only — no application code required** unless small links from Devices page to the doc are trivial.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **06** → `in_progress`.

---

## Create

**`docs/DEVICE_INGEST_FIELD_TEST.md`** including:

### A. Private pre-test (you, before partner)

- Staging URL, org seeded, 3–5 staff with `deviceUserId`
- Device row with SN (or SN-from-first-callback behavior documented)
- curl getrequest + sample ATTLOG
- F22 menu checklist (443, HTTPS, ATTLOG, push/poll paths) — from Shift Close handoff §4
- Health endpoint check (step 02)

### B. Joint session agenda (60–90 min)

1. SR+ roster publish + staff IDs  
2. Register device / show pairing URLs  
3. Partner configures terminal  
4. Live punch → attendance week  
5. Second model if available  
6. Unmapped ID drill (step 03) if time  

### C. Failure modes (from Shift Close §9 F3)

| Symptom | Likely cause | Check |
|---------|----------------|-------|
| No server logs | URL / HTTPS / DNS | getrequest from laptop |
| Contact, 0 punches | OPERLOG not ATTLOG | Device upload settings |
| Punches, no staff name | Unmapped `deviceUserId` | Step 03 UI |
| Wrong times | Clock learn / TZ | Org timezone, device clock settings |
| Duplicates | Expected within 1s window | Explain dedupe |

### D. Explicit non-goals for session

- Pay period in SR+, pull TCP from cloud, comm key, employee app, AI scheduler

### E. Product one-liner

*Same ADMS path as production Shift Close; SR+ is the manager layer (roster, leave, attendance).*

---

## Definition of done

- [ ] `docs/DEVICE_INGEST_FIELD_TEST.md` exists and is actionable
- [ ] Link from `docs/device-ingest/README.md`
- [ ] [STATUS.md](./STATUS.md) row **06** → `completed`

**Do not commit unless user asks.**
