# Feedback loop — design partners

How testers reach us, how we triage, and how we investigate without slowing them down.

---

## Intake (tester → us)

| Channel | Where | What happens |
|---------|-------|--------------|
| **In-app form** (primary) | Tenant app footer → **Send feedback** | Authenticated POST to `/api/feedback`. Stored in `TesterFeedback` with org id, user email, category, message, and page path. |
| **Email notification** | Operator inbox via Resend | When `RESEND_API_KEY` is set, each submission emails `FEEDBACK_CONTACT_TO` (or `MARKETING_CONTACT_TO`, or active `OperatorUser` emails) with reply-to set to the tester. |
| **Marketing site** (prospects, not testers) | Landing page contact / early-access form | Separate pipeline → `MarketingInquiry` + `/api/marketing/contact`. Not used for logged-in design partners. |

Testers should use **Send feedback** in the app so every report is tied to their organization automatically.

---

## Triage (us → prioritized work)

| Queue | URL / location | Purpose |
|-------|----------------|---------|
| **Operator Feedback page** (canonical triage home) | `/ops/feedback` on the operator console | Newest-first list of all `TesterFeedback` rows. Open count badge in the sidebar; Attention Needed on Overview. Link to Org 360 for each org. **Mark triaged** / **Close** clears the badge. |
| **GitHub Issues** | https://github.com/ellodanem/simplerosterplus/issues | Track bugs and features that need code changes. Create an issue when feedback requires engineering; paste the feedback id and org name in the issue body. |

**Daily habit:** Check `/ops/feedback` (and the inbox if Resend is wired). For each open item:

1. Read the message and note org + page path.
2. If it needs a fix → open a GitHub issue, link the feedback id.
3. If it's a how-to question → reply to the tester's email (reply-to on the notification).
4. Click **Mark triaged** (or **Close**) so the sidebar badge and Attention Needed alert clear.

---

## Investigate (without bothering the tester)

When a tester reports "my roster looks wrong" or "punches didn't show up", use the operator console — no need to ask for full-page screenshots first.

| Tool | Path | Use |
|------|------|-----|
| **Org 360** | `/ops/organizations/[id]` | Staff count, devices, punch sparkline, billing, recent operator audit for that org. |
| **Read-only impersonation** | Org 360 → **Impersonate** (support+ role) | 30-minute read-only tenant session. See exactly what the org sees on Home, Roster, Attendance, Devices. Amber banner + **End session**; mutating APIs blocked. |
| **Devices & Ingest** | `/ops/devices` | Fleet health, last contact, ATTLOG vs punch counts when ingest is suspected. |
| **Audit log** | `/ops/audit` | Operator actions on the org (suspend, trial extend, impersonation starts). |

**Confirmed sufficient for Gate 1:** Org 360 + impersonation + devices dashboard cover the common design-partner reports (roster, attendance, device pairing) without tenant admin tooling beyond what shipped in steps 01–08.

---

## Fix → close the loop

1. Reproduce via impersonation (or locally with a provisioned org).
2. Ship the fix on the main deployment.
3. Reply to the tester: what we found, what changed, and whether they should retry.
4. Close the GitHub issue if one was opened.

---

## Environment (production)

Add to Vercel / `.env` when ready for email alerts (submissions are always stored in the database):

```bash
FEEDBACK_CONTACT_TO="hello@simplerosterplus.com"   # optional; else MARKETING_CONTACT_TO, else OperatorUser emails
RESEND_API_KEY="re_xxx"
FEEDBACK_CONTACT_FROM="Simple Roster Plus <hello@simplerosterplus.com>"
```

---

## Related docs

- [step-09-feedback-intake.md](./step-09-feedback-intake.md) — step definition
- [OPERATOR_CONSOLE.md](../OPERATOR_CONSOLE.md) — impersonation and Org 360

---

## Verification

End-to-end smoke test (local or preview):

1. Log in as a tenant user (not operator).
2. Click **Send feedback** in the app footer, submit a short test message.
3. Confirm `POST /api/feedback` returns `{ ok: true, id: "..." }`.
4. Open `/ops/feedback` as an operator — the row appears with correct org and email.
5. From Org 360 for that org, click **Impersonate** and confirm you can view the tenant app read-only.
