# Pull TCP vs ADMS — scope decision (SR+ v1)

**Purpose:** Record whether Simple Roster Plus needs **`pull_tcp`** (ZKTeco LAN SDK, port 4370) for the ZKTeco partnership, or can stay **ADMS-only** for the cloud MVP. Prevents building pull sync “just because” the `DeviceConnectionMode` enum exists.

**Related:** [SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md](./SHIFT_CLOSE_DEVICE_INGEST_HANDOFF.md), [DEVICE_INGEST_FIELD_TEST.md](./DEVICE_INGEST_FIELD_TEST.md), [device-ingest/README.md](./device-ingest/README.md).

---

## What ADMS push is (partnership default)

**ADMS** (Automatic Data Master Server) is ZKTeco’s cloud-server mode: the **terminal initiates HTTPS** to your app.

| Aspect | Detail |
|--------|--------|
| Direction | Device → server (outbound from site) |
| Protocol | HTTPS on port **443** |
| Endpoints | `GET/POST {base}/iclock/cdata`, `GET {base}/iclock/getrequest?SN=…` |
| Identification | Serial number (`SN` query param) — no comm-key check in SR+ v1 |
| Payload | ATTLOG tab lines (PIN, naive datetime, in/out state) |
| Cloud fit | Works from Vercel / any public HTTPS host; no inbound firewall hole at the site |

**SR+ status:** Implemented. Routes under `app/iclock/*`, ingest in `lib/zk-iclock-push.ts` and `lib/attendance-punch-ingest.ts`. This is the path documented in the [field test runbook](./DEVICE_INGEST_FIELD_TEST.md) and matches Shift Close production behavior.

---

## What pull_tcp is

**Pull TCP** is the opposite direction: the **server (or a LAN agent) opens a TCP socket** to the device and uses the ZKTeco proprietary SDK protocol to read users and attendance logs on demand.

| Aspect | Detail |
|--------|--------|
| Direction | Server/agent → device (inbound to terminal on LAN) |
| Protocol | ZKTeco SDK over TCP, default port **4370** |
| Typical library | `zk-attendance-sdk` (Shift Close) |
| Identification | Device **IP + port** (and serial known upfront in SR+) |
| Cloud fit | **Not reachable from Vercel** — private IPs (`192.168.x.x`, `10.x`, etc.) are not routable from serverless cloud |

### How Shift Close uses pull TCP

Shift Close has three related pieces; only one is “cloud pull” and it is intentionally blocked on Vercel:

1. **`POST /api/attendance/sync`** — Next.js handler connects directly to `ZK_DEVICE_IP:4370`, pulls logs, ingests. **Explicitly rejects private LAN IPs when `VERCEL` is set** with guidance to use ADMS or the Windows agent instead.
2. **Windows agent** (`agent/`) — Runs on a PC at the station. Uses pull TCP locally for **staff push to device** (`setUser`). Punches to cloud are **manual upload** via dashboard to `/api/attendance/ingest`; primary punch path in production is still **ADMS on the device**.
3. **Local Next.js** — “Sync from device” works only when the app runs on the same LAN as the terminal (e.g. dev machine or on-prem server).

**SR+ status:** Schema and UI only. `DeviceConnectionMode.pull_tcp`, `ipAddress`, `port`, and `PunchSource.device_pull` exist. **No sync job, no SDK integration, no Windows agent port.** Add-device UI shows pull behind an “Advanced / on-site only” banner and warns that pull sync is not wired in the cloud MVP.

---

## Recommendation — ADMS-only for MVP

| Decision | Rationale |
|----------|-----------|
| **Ship v1 with ADMS push only** | Partnership field tests, F22 checklist, and Shift Close production all center on `/iclock/*`. Sites only need outbound HTTPS. |
| **Do not build pull sync for Vercel** | Cloud cannot reach LAN 4370; building a “Sync now” button that always fails in production would mislead operators. |
| **Defer on-prem agent** | Shift Close’s Windows agent solves LAN staff sync + optional manual punch upload; porting it is a separate product decision (multi-tenant auth, org scoping, installer distribution). |
| **Keep schema enum** | Preserves data model parity with Shift Close and future optionality; seed/dev can still model a pull device without implementing the job. |

**Bottom line:** For the ZKTeco partnership and cloud MVP, **ADMS push is sufficient**. Pull TCP remains a documented future path for edge cases, not a v1 deliverable.

---

## When to revisit pull TCP

Re-open this decision if any of the following become true:

| Trigger | Why it matters |
|---------|----------------|
| **Customer blocks outbound HTTPS** | Rare for ZKTeco ADMS, but some locked-down networks only allow LAN. Would need on-prem agent or scheduled LAN worker, not Vercel pull. |
| **Partner standardizes on non-ADMS fleet** | Older models or firmware without ADMS cloud server menu; bulk of fleet is pull-only. |
| **Bulk backfill requirement** | Need to import months of logs from device storage before ADMS went live; one-time LAN pull or agent upload. |
| **Partner confirms live pull-only sites** | If their installed base never enables ADMS, partnership success criteria may require pull or agent. |
| **Staff-to-device push from cloud** | ADMS v1 is punch-in only from device; pushing roster/enrolment to terminal from SR+ may need LAN SDK or vendor-specific ADMS commands (separate from attendance pull). |

---

## UI recommendation

Aligns with step 04 (already implemented):

| Element | Recommendation | SR+ today |
|---------|----------------|-----------|
| Default new device | **ADMS push** | Yes — add-device drawer defaults to ADMS |
| Pull TCP entry | Hidden behind expander / “Advanced” | Yes — “Use pull TCP instead (advanced)” link |
| Pull banner | “On-site only — not used for cloud MVP” | Yes — amber banner in add-device drawer |
| Post-create copy | Warn pull sync not wired | Yes — post-create panel for `pull_tcp` |
| Edit form | Show IP/port only when mode is `pull_tcp` | Yes — `device-edit-form.tsx` |
| Devices list / health | ADMS-first diagnostics (`lastSeenAt`, adms-health) | Yes — no “Sync from device” button |

**Do not** add a cloud “Sync now” control until there is a supported runtime (LAN-local app or agent) and product sign-off.

---

## Questions for partner (checkbox list)

Use this list in the joint field session or pre-call. Check answers before investing in pull TCP or agent work.

- [ ] **Do any live partner sites use pull TCP only** (no ADMS cloud server configured on the F22)?
- [ ] **What percentage of deployed terminals** are ADMS-capable vs pull-only firmware/models?
- [ ] **Is outbound HTTPS from the terminal to our staging/prod URL allowed** at typical customer sites (firewall/proxy)?
- [ ] **Does the partner use Shift Close’s Windows agent today?** If yes: for staff sync, punch upload, or both?
- [ ] **Are there sites where ADMS is enabled but punches still fail** (would pull be a workaround or a misconfiguration)?
- [ ] **Bulk historical import:** Do customers ever need pre-ADMS punch history pulled from device memory?
- [ ] **Staff enrolment:** Is pushing staff from cloud to device in scope for SR+ v1, or is enrolment always done on the terminal?
- [ ] **Network topology:** Single device per site vs many devices behind one NAT — any serial-collision or URL-sharing concerns beyond SR+’s one-org-per-URL P0 assumption?

---

## Implementation guardrails for agents

Until this decision is explicitly reversed by the user:

1. **Do not** add `zk-attendance-sdk`, cron pull jobs, or `/api/attendance/sync` parity to SR+.
2. **Do not** remove `pull_tcp` from the enum or migrations — it documents intent and matches Shift Close.
3. **Do** keep ADMS ingest, unmapped punches, health, and field-test docs as the active roadmap.
4. **If** the user approves pull scope after partner answers: prefer **Windows/on-prem agent** pattern from Shift Close over fake “cloud sync”; new step file required in `docs/device-ingest/`.

---

## Decision log

| Date | Outcome |
|------|---------|
| 2026-05-30 | **ADMS-only for cloud MVP** documented; pull_tcp deferred; UI remains advanced/hidden. Awaiting partner checkbox answers before any build. |
