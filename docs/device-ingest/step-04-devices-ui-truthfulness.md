# Step 04 — Devices UI truthfulness (ADMS-first)

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 01 `completed` (so copy matches real behavior).

---

## Mission

Align Devices UI with **field reality**: ADMS push by SN is the path; comm key is not required for v1 (Shift Close parity). Remove stale or misleading copy.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **04** → `in_progress`.

---

## Tasks

1. **Empty state** — Remove “add flow coming” if add device already works (`app/(authenticated)/devices/page.tsx`).
2. **Page intro** — Accurate: punches via ADMS push; `lastSeenAt` updates when ingest works.
3. **Add device drawer** — Lead with:
   - Public base URL (from env or step 05 setting)
   - Push: `{base}/iclock/cdata`, poll: `{base}/iclock/getrequest`
   - Serial (SN), ATTLOG enabled on device
   - Staff `deviceUserId` must match terminal enrolment
4. **Comm key** — De-emphasize or label “optional / future”; do not imply F22 requires it if step 01 is SN-only.
5. **Pull TCP** — Label “Advanced / on-site only — not used for cloud MVP” or hide behind expander; default new devices to **ADMS push**.

---

## Out of scope

- Full device pairing wizard redesign
- Firmware-specific screenshots (unless already in repo)

---

## Definition of done

- [ ] No contradictory empty-state / footer “next pass” for core add flow
- [ ] F22-relevant URL checklist visible where operators configure terminals
- [ ] [STATUS.md](./STATUS.md) row **04** → `completed`

**Do not commit unless user asks.**
