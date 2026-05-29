# Step 02 — ADMS health & ingest diagnostics

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 01 `completed`.

---

## Mission

Give operators (and you, during hardware tests) a **fast answer** to: “Is ADMS reaching the server? Are we getting ATTLOG punches?”

Shift Close reference: `GET /api/attendance/adms-health` + Attendance UI “ADMS activity” (see handoff §7 S5).

---

## Before you start

1. [STATUS.md](./STATUS.md) row **02** → `in_progress`.
2. Confirm step **01** is `completed`.

---

## Implement

1. **`GET /api/attendance/adms-health`** (authenticated, org-scoped) returning at minimum:
   - `lastSeenAt` per device (or latest contact)
   - Punch count last 24h (org or per device)
   - Hint when contact exists but punch count is 0 → **“Check ATTLOG upload enabled (not OPERLOG-only)”** (Shift Close top failure mode)
2. Optional: lightweight in-memory or DB **last ADMS request** metadata (SN, table, line count, timestamp) if easy — do not over-engineer.
3. **Devices list** — surface health on existing devices page (badge or column); minimal UI, no full redesign.

---

## Out of scope

- Full log viewer / Vercel log integration
- Email alerts for offline devices

---

## Definition of done

- [ ] API returns sensible JSON for org with 0 and N devices
- [ ] Devices page shows last active + 24h punch signal or link to health
- [ ] Documented in `docs/DEVICE_INGEST_SMOKE.md` (add “Health check” section)
- [ ] [STATUS.md](./STATUS.md) row **02** → `completed`

**Do not commit unless user asks.**
