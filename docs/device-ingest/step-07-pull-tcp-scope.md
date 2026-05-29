# Step 07 — Pull TCP scope decision (documentation only)

**Status:** See [STATUS.md](./STATUS.md).

**No code required** unless user explicitly expands scope after reading the decision doc.

---

## Mission

Record whether SR+ needs **`pull_tcp`** (LAN SDK port 4370) for the partnership or can stay **ADMS-only** for v1. Prevents agents from building pull sync “just because” the enum exists.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **07** → `in_progress`.

---

## Create

**`docs/DEVICE_INGEST_PULL_TCP_DECISION.md`** covering:

1. **What pull_tcp is** — server initiates ZK protocol on LAN; Shift Close uses it for on-site sync, **not** Vercel → private IP.
2. **What ADMS is** — device pushes to `/iclock/*` (partnership default).
3. **Recommendation** — ADMS-only for MVP; pull requires on-prem agent/worker or manual LAN tool.
4. **When to revisit** — customer blocks inbound HTTPS; partner standardizes non-ADMS fleet; bulk backfill requirement.
5. **UI recommendation** — keep enum; hide or deprecate pull in operator UI until decided.
6. **Questions for partner** (checkbox list) — do any live sites use pull only? Windows agent?

---

## Definition of done

- [ ] Decision doc written; user can answer partner questions from it
- [ ] [STATUS.md](./STATUS.md) row **07** → `completed`
- [ ] No pull sync implementation in this step

**Do not commit unless user asks.**
