# Extract Pay Period

Payroll-prep summary for a calendar date range: clock hours per staff, vacation marker, sick leave overlap, optional shortage (manual for now). **Saving** files matching punches off the active attendance log; generate and print do not.

## Deferred (see product backlog)

- **Copy payroll block** — paste staff HR/payroll fields (NIC, bank, DOB, etc.) into notes; needs sensitive staff fields + role gating (Westline parity).
- **Excel download** and **email** with attachment + `emailSentAt`.
- **Shift Close shortage** — auto-fill supervisor shortage from closed shifts.
- **Un-file / reopen** admin action to clear `extractedAt` on punches.
- Sick-leave request UI (table exists; generate uses `approved` rows only).

## APIs

| Route | Purpose |
|-------|---------|
| `POST /api/attendance/pay-period/generate` | Ephemeral report from live data |
| `GET /api/attendance/pay-period` | List saved periods (`?latestSaved=1` for one) |
| `POST /api/attendance/pay-period` | Create + file punches |
| `PATCH /api/attendance/pay-period/[id]` | Update rows/notes |
| `GET /api/attendance/pay-period/last-filed-cutoff` | Default log window after last filed end |

## Attendance log

- Default query hides `extractedAt != null`.
- `since` lower bound is the later of rolling window and day after last filed period end.
- `?includeFiled=1` on `/api/attendance/log` includes filed punches.
