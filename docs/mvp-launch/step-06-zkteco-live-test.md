# Step 06 — ZKTeco live end-to-end test

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Steps 01–02 (real, isolated org to test against). Device ingest steps 01–07 already `completed`.

---

## Mission

Prove the partner "wow" moment on a real (non-seed) org: a physical ZKTeco terminal punch flows via ADMS into SR+ attendance, mapped to the right staff member. This is the demo that closes design partners, and it must work before we show anyone.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **06** → `in_progress`.
2. Read [../DEVICE_INGEST_FIELD_TEST.md](../DEVICE_INGEST_FIELD_TEST.md) end to end — it is the runbook; follow it, don't reinvent it.

---

## Implement / verify

1. On a real org, register a `Device` (ADMS push, serial number) at the org's default location.
2. Set the device's server URL to the resolved public app URL (see device public-url flow) and confirm `/iclock/*` is reachable.
3. Add a `Staff` with the matching `deviceUserId`.
4. Produce a real punch (physical terminal, or the documented simulation in the runbook).
5. Confirm: punch lands in `AttendanceLog`, device `lastSeenAt` updates, ADMS health shows the 24h signal, and the punch maps to the right staff (or appears in unmapped → can be mapped).
6. **Record the result** in a short `field-test-log.md` (date, device model, what worked, any gotchas) so the next demo is repeatable.

---

## Out of scope

- `pull_tcp` / LAN sync (ADMS-only decision stands — [../DEVICE_INGEST_PULL_TCP_DECISION.md](../DEVICE_INGEST_PULL_TCP_DECISION.md)).
- Pushing staff/enrolment down to the terminal.
- Multi-device fleet load testing.

---

## Definition of done

- [ ] Real punch from a ZKTeco device appears in attendance on a non-seed org
- [ ] Staff mapping works (direct or via unmapped → map)
- [ ] ADMS health reflects the contact + punch
- [ ] `field-test-log.md` written
- [ ] [STATUS.md](./STATUS.md) row **06** → `completed`

**Do not commit unless user asks.**
