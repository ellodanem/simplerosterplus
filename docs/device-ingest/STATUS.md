# Device ingest — step status

**Update this file when you start or finish a step.** New agents: first `pending` row wins.

| Step | File | Status | Agent | Started | Completed | Notes |
|------|------|--------|-------|---------|-----------|-------|
| 01 | [step-01-adms-ingest-port.md](./step-01-adms-ingest-port.md) | `completed` | | 2026-05-29 | 2026-05-29 | ADMS iclock + ingest libs + migration |
| 02 | [step-02-adms-health.md](./step-02-adms-health.md) | `completed` | cursor-2026-05-29 | 2026-05-29 | 2026-05-29 | GET adms-health + devices 24h column |
| 03 | [step-03-unmapped-punches.md](./step-03-unmapped-punches.md) | `completed` | cursor-2026-05-29 | 2026-05-29 | 2026-05-29 | unmapped APIs + Devices UI + attendance banner |
| 04 | [step-04-devices-ui-truthfulness.md](./step-04-devices-ui-truthfulness.md) | `completed` | cursor-2026-05-30 | 2026-05-30 | 2026-05-30 | ADMS-first Devices UI + pairing URLs |
| 05 | [step-05-org-public-url.md](./step-05-org-public-url.md) | `completed` | cursor-2026-05-30 | 2026-05-30 | 2026-05-30 | Org public_app_url + resolve chain + Devices UI |
| 06 | [step-06-field-test-runbook.md](./step-06-field-test-runbook.md) | `pending` | | | | Depends on 01–02 |
| 07 | [step-07-pull-tcp-scope.md](./step-07-pull-tcp-scope.md) | `pending` | | | | Doc/decision only — defer build |

### Status values

- `pending` — not started  
- `in_progress` — agent actively working (only one agent per step)  
- `completed` — done; next agent may take next `pending` step  
- `blocked` — waiting on user/decision; do not start next step unless user says so  

### Changelog

| Date | Step | Change |
|------|------|--------|
| 2026-05-29 | — | Roadmap created |
| 2026-05-29 | 01 | ADMS ingest port committed |
| 2026-05-29 | 02 | adms-health API, devices punches column, smoke doc |
| 2026-05-29 | 03 | unmapped list/map APIs, Devices panel, attendance banner |
| 2026-05-30 | 04 | ADMS-first copy, F22 URL checklist, pull TCP advanced, comm key de-emphasized |
| 2026-05-30 | 05 | Org public_app_url AppSetting, resolvePublicAppUrlForOrg, Devices Public URL modal |
