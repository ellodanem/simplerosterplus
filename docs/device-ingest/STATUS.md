# Device ingest — step status

**Update this file when you start or finish a step.** New agents: first `pending` row wins.

| Step | File | Status | Agent | Started | Completed | Notes |
|------|------|--------|-------|---------|-----------|-------|
| 01 | [step-01-adms-ingest-port.md](./step-01-adms-ingest-port.md) | `completed` | | 2026-05-29 | 2026-05-29 | ADMS iclock + ingest libs + migration |
| 02 | [step-02-adms-health.md](./step-02-adms-health.md) | `pending` | | | | Depends on 01 |
| 03 | [step-03-unmapped-punches.md](./step-03-unmapped-punches.md) | `pending` | | | | Depends on 01 |
| 04 | [step-04-devices-ui-truthfulness.md](./step-04-devices-ui-truthfulness.md) | `pending` | | | | Depends on 01; can parallel 02–03 |
| 05 | [step-05-org-public-url.md](./step-05-org-public-url.md) | `pending` | | | | Optional if 01 uses env-only URL |
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
