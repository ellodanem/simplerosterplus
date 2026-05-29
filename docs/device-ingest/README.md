# Device ingest implementation — agent playbook

Use this folder to implement ZKTeco ADMS parity with Shift Close in **ordered steps**. Each step has its own prompt file; progress is tracked in **[STATUS.md](./STATUS.md)**.

## For a new agent

1. Open **[STATUS.md](./STATUS.md)**.
2. Find the **lowest-numbered step** with status `pending`.
3. **Before coding:** set that row to `in_progress`, set **Agent** (e.g. `cursor-2026-05-29`) and **Started** (ISO date).
4. Open the linked **Step file** and follow it completely.
5. **When done:** set status to `completed` and **Completed** date; add a one-line note under **Notes** if useful for the next agent.
6. **If blocked:** set status to `blocked`, explain in **Notes**, do not mark `completed`.

Do **not** skip steps without user approval. Do **not** take a step already `in_progress` unless the user says the prior agent failed.

## For the user

Tell a new agent:

> Implement the next available step per `docs/device-ingest/STATUS.md` and the linked step file.

Or:

> Implement step 03 in `docs/device-ingest/step-03-unmapped-punches.md` and update STATUS.

## Repos

| Repo | Path |
|------|------|
| SR+ (write here) | `srp/` |
| Shift Close (read-only) | `c:\Users\Dane\Cursor Projects\westline\Shift Close\` |

## Product guardrails (all steps)

- Manager-first: roster + attendance, not payroll / Shift Close financials.
- **ADMS push** is the partnership path; do not prioritize `pull_tcp` unless a step says so.
- Shift Close is **behavior source of truth** for ingest; SR+ schema is **adaptation** (org TZ, `Device`, `Location`, `PunchSource`).

## Related docs

- `docs/SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md` — created in step 01 (audit from Shift Close).
- `docs/DEVICE_INGEST_SMOKE.md` — created in step 01 (local/staging smoke test).
- `SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md` — may be stale; prefer Shift Close code + handoff above.
