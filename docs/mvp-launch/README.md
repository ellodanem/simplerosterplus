# MVP launch readiness — agent playbook

Use this folder to take Simple Roster Plus from "feature-complete" to **"ready for its first hand-onboarded testers, so we can start outreach"** in **ordered steps**. Each step has its own prompt file; progress is tracked in **[STATUS.md](./STATUS.md)**.

This is the execution tracker for the plan in **[../MVP_LAUNCH_READINESS.md](../MVP_LAUNCH_READINESS.md)** — read that first for the *why*, the gate definition, and the scope fence. This folder is the *how* and *who's-doing-what*.

## For a new agent

1. Open **[STATUS.md](./STATUS.md)**.
2. Find the **lowest-numbered step** with status `pending`.
3. **Before coding:** set that row to `in_progress`, set **Agent** (e.g. `cursor-2026-05-30`) and **Started** (ISO date).
4. Open the linked **Step file** and follow it completely.
5. **When done:** set status to `completed` and **Completed** date; add a one-line note under **Notes** if useful for the next agent.
6. **If blocked:** set status to `blocked`, explain in **Notes**, do not mark `completed`.

Do **not** skip steps without user approval. Do **not** take a step already `in_progress` unless the user says the prior agent failed.

## Gates (important)

Steps are grouped into phases. **Phase 2 and the deferred step start `blocked` on purpose** — Phase 2 is the self-serve / SEO funnel (Clerk, billing) and step 13 is automated messaging; neither may start until the owner explicitly opens that gate. Do real-user feedback (Phase 0 + 1) first.

| Phase | Steps | Meaning |
|-------|-------|---------|
| **Phase 0 — Blockers** | 01–04 | Must be done before *any* external user. Closing these = we can safely onboard a tester. |
| **Phase 1 — Outreach ready** | 05–09 | Complete core loop (publish & share!) + great demo + truthful marketing. Closing these = we can start outreach. |
| **Phase 2 — Self-serve / SEO** | 10–12 | Cold inbound traffic. `blocked` until owner opens Gate 2. |
| **Deferred — Enhancement** | 13 | Automated roster notifications (email/SMS/WhatsApp). `blocked`; un-gate independently. See [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md). |

## Product guardrails (all steps)

- **Manager-first:** roster + attendance, not payroll / HR bloat. See [../PRODUCT_NOTES.md](../PRODUCT_NOTES.md).
- **Honest scope:** don't promise generative AI; the summaries are rule-based today.
- **Don't build from the OUT list** in [../MVP_LAUNCH_READINESS.md §4](../MVP_LAUNCH_READINESS.md) without owner approval.
- **First testers are hand-onboarded design partners** — we don't need Clerk/billing for Gate 1.

## For the user

Tell a new agent:

> Implement the next available step per `docs/mvp-launch/STATUS.md` and the linked step file.

Or:

> Implement step 02 in `docs/mvp-launch/step-02-tenant-provisioning.md` and update STATUS.

## Related docs

- [../MVP_LAUNCH_READINESS.md](../MVP_LAUNCH_READINESS.md) — gate definition, scope fence, decisions
- [../PRICING.md](../PRICING.md) — canonical tiers, limits, Stripe SKUs (Gate 2)
- [../AGENT_CONTEXT_GTM_AUTH_PRICING.md](../AGENT_CONTEXT_GTM_AUTH_PRICING.md) — Clerk / demo / GTM (Phase 2)
- [../OPERATOR_CONSOLE.md](../OPERATOR_CONSOLE.md) — operator plane (used by step 02)
- [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md) — publish & share direction (used by steps 05, 13)
- [../DEVICE_INGEST_FIELD_TEST.md](../DEVICE_INGEST_FIELD_TEST.md) — ZKTeco runbook (used by step 06)
- [../DASHBOARD_RECOMMENDATIONS.md](../DASHBOARD_RECOMMENDATIONS.md) — Home UX (used by step 07)
