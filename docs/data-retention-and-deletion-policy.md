# Data Retention and Deletion Policy — Simple Roster Plus (Internal)

**Status:** Draft for legal review  
**Not yet published**  
**Must be reviewed by a lawyer familiar with Saint Lucia law before production use**

**Document type:** Internal operational policy (not public legal copy)  
**Last updated (draft):** 23 July 2026  
**Related drafts:** `docs/privacy-policy-draft.md`, `docs/terms-of-service-draft.md`  
**Source audit:** `docs/legal-privacy-product-evidence-audit.md`

---

## 1. Purpose

This policy defines how Ellodane Enterprises retains, archives, and deletes Simple Roster Plus data so that:

- Customer deletion and privacy requests can be handled consistently
- Billing, tax, security, and dispute needs are respected
- Engineering and operations know which rules are policy versus already automated

---

## 2. Scope

Covers production application data for Simple Roster Plus, including:

- Organization, user, staff, roster, leave, attendance, and device records
- Billing mirrors and Stripe-related identifiers stored by SRP
- Marketing inquiries, feedback, support correspondence, onboarding events
- Operator audit logs and messaging/notification logs
- Demo organizations
- Backups held by infrastructure providers (as far as known)

Does **not** control retention inside customer-owned ZKTeco devices, Clerk/Stripe/Twilio/Resend provider-side logs beyond what contracts require, or personal devices of users.

---

## 3. Roles and responsibilities

| Role | Responsibility |
|------|----------------|
| Ellodane Enterprises owner | Approve policy; confirm legal retention for accounting/tax |
| Support / privacy inbox | Receive requests; verify authority; track completion |
| Operators | Execute suspend, demo reclaim, and approved deletions using audited tools |
| Engineering | Implement automation where approved; document gaps |
| Counsel | Review Saint Lucia retention and employment/privacy constraints |

---

## 4. Data inventory (summary)

| Category | Examples | Typical systems |
|----------|----------|-----------------|
| Account / org | Emails, Clerk IDs, org name, locations, roles, settings | App DB; Clerk |
| Staff | Names, contacts, DOB, device user IDs, leave, WhatsApp opt-in | App DB |
| Roster | Weeks, entries, share tokens, holidays | App DB |
| Attendance | Punches, overrides, pay-period JSON | App DB |
| Devices | Serial, model, IP, last seen | App DB |
| Billing mirrors | Stripe customer/subscription IDs, plan status | App DB; Stripe |
| Marketing / support | Inquiries, feedback, emails | App DB; Resend; mailbox |
| Ops | Operator users, audit logs, onboarding progress | App DB |
| Messaging logs | WhatsApp notification logs | App DB; Twilio |
| Demo | Seeded sandbox orgs | App DB; Clerk |

---

## 5. Approved retention periods

Legend for each rule:

- **Policy** = approved operational direction  
- **Implemented** = automated or product-enforced today  
- **Future engineering** = needs build  
- **Provider config** = depends on dashboard/contract  
- **Legal review** = counsel must confirm

| Dataset | Retention | Labels |
|---------|-----------|--------|
| Active customer production data | While account active + as needed to provide service | Policy |
| Terminated/cancelled org production data | Target **≤ 90 days**, then delete/anonymize unless legal hold | Policy; Future engineering |
| Marketing inquiries | **≤ 24 months** after last meaningful interaction | Policy; Future engineering |
| Support correspondence | **≤ 3 years** | Policy; Provider/mailbox config |
| Operator audit records | **≤ 2 years** | Policy; Future engineering |
| WhatsApp delivery / notification logs | **≤ 12 months** | Policy; Future engineering |
| Demo organizations | **14-day** demo expiry process | Policy; Implemented (cron must be live) |
| Billing / accounting records | Period required by tax/accounting/fraud/law | Policy; Legal review; Provider (Stripe) |
| Backups | Provider default / configured TTL | Provider config; Unverified |
| Query windows (attendance UI, reports, unmapped lookback) | **Not retention** | Implemented as display/query only |

---

## 6. Active accounts

Retain organization, user, staff, roster, attendance, device, and related operational data while the organization is active and as reasonably needed to provide Simple Roster Plus.

Staff may be archived without deleting historical records (see Section 8).

---

## 7. Cancelled accounts

After subscription cancellation or organization termination:

1. Access ends according to billing/Terms rules.
2. Production data should be retained up to **90 days** to allow recovery, export, reactivation, or dispute resolution.
3. After that window, delete or anonymize active production data unless a legal hold or required billing/tax retention applies.
4. Stripe invoices and accounting extracts may remain in Stripe according to Stripe and legal requirements.

**Current gap:** No automated repository purge enforces the 90-day rule.

---

## 8. Staff archive vs deletion

**Archive (product):**

- Sets inactive / archived status
- Removes staff from active roster workflows
- Does **not** erase historical roster, attendance, leave, or correction history

**Deletion / anonymization:**

- Available through support request where appropriate
- May be limited where history is needed for payroll handoff disputes, security, billing integrity, or legal obligations
- Do not promise consequence-free erasure of every historical punch or roster row

Hard staff delete in product is limited/gated; archive is the primary customer path.

---

## 9. Attendance and roster history

- Retained for active accounts as needed for service use
- Subject to the 90-day post-termination target for production stores
- Individual punch deletion may be available to managers in-product
- Pay-period snapshots may retain JSON summaries independently of live punch rows
- Share tokens: unpublish hides the week; token reuse on republish is current behavior and should be considered when advising customers

**Query windows are not deletion:**

- Attendance log UI windows (for example 7 / 120 days)
- Staff report max range (for example 93 days)
- Unmapped punch lookback (for example 90 days)

These limit display or review, not storage lifetime.

---

## 10. Billing records

Retain billing identifiers and accounting records as required for tax, accounting, fraud prevention, chargebacks, and law.

**Do not invent a fixed Saint Lucia tax retention period without counsel.** Coordinate with Stripe Dashboard exports and bookkeeping practices.

---

## 11. Marketing inquiries

Retain marketing inquiry records up to **24 months** after the last meaningful interaction, then delete or anonymize unless a longer hold is needed for dispute or legal reasons.

---

## 12. Support correspondence

Retain support emails and related tickets up to **3 years**, then delete or archive according to mailbox practice, unless a legal hold applies.

---

## 13. Audit records

Retain operator audit logs up to **2 years**, then delete or anonymize, unless needed longer for security investigation or legal hold.

---

## 14. Messaging logs

Retain WhatsApp / roster notification logs up to **12 months**, then delete or anonymize, subject to dispute or security needs.

SMS is not an active product channel in the audited codebase.

---

## 15. Demo data

Demo organizations follow the **14-day** demo expiry and reclaim process.

When reclaim runs, associated production demo data is hard-deleted (and matching Clerk org may be removed).

Confirm production cron (`CRON_SECRET` reclaim job) is scheduled.

---

## 16. Public roster links

- Published links remain usable while the week is published
- Unpublishing removes current public access
- Token may persist and be reused on republish (implementation gap for rotation)
- After organization deletion, share pages should stop resolving because underlying data is removed

Advise customers not to treat share URLs as permanent archives.

---

## 17. Backups

- Backup retention depends on Neon/Vercel (or other) configuration
- Exact periods are **unverified** and must not be invented in customer-facing text
- Deleted data may remain in backups until expiration or overwrite
- Restore backups only for continuity, disaster recovery, or security—not to circumvent lawful deletion without review

---

## 18. Legal holds

Suspend ordinary deletion when necessary for:

- Ongoing disputes
- Regulatory inquiries
- Security incidents
- Explicit legal holds

Document the hold reason, scope, and release date.

---

## 19. Deletion-request workflow

1. Request received at privacy@simplerosterplus.com or hello@simplerosterplus.com  
2. Log request date, requester, organization, and scope  
3. Verify identity and authority (Section 20)  
4. Determine scope: staff anonymization, messaging opt-out, full org deletion, marketing-only delete, etc.  
5. Check legal holds and billing retention needs  
6. Execute deletion/anonymization using approved ops procedures  
7. Note provider-side remnants (Stripe, Clerk, email, backups)  
8. Confirm completion or explain limitations (Section 22)

---

## 20. Identity and authority verification

Before deleting an organization or sensitive staff history, verify:

- Requester controls the account email or is an authorized owner/admin
- For organization deletion, authority to bind/close the organization
- For staff-initiated requests, whether the employer customer must act first

Refuse or escalate suspicious requests.

---

## 21. Target response times

| Step | Target |
|------|--------|
| Acknowledgement | Within **5 business days** |
| Active-system deletion completion | Within **30 days** after successful verification, absent holds |

These are operational targets, not service-level guarantees of instantaneous erasure.

---

## 22. Completion confirmation

Notify the requester when:

- The request is completed, or
- Specific categories must be retained, and why, and for how long if known

Keep an internal completion record.

---

## 23. Exceptions

Deletion may be delayed or limited for billing, tax, fraud prevention, security, dispute resolution, legal obligations, or technical backup cycles.

---

## 24. Current implementation gaps

| Gap | Impact |
|-----|--------|
| No automated 90-day post-cancellation purge | Policy not self-enforcing |
| No automated marketing/support/audit/WhatsApp log purge by age | Manual process required |
| No polished customer self-serve org deletion UI | Support-mediated |
| Ops “delete org” console action may still be incomplete | Use approved scripts/procedures carefully |
| Share-token rotation on unpublish not implemented | Privacy residual risk |
| Backup TTLs unverified | Must disclose uncertainty |
| Query windows often mistaken for retention | Train support |

---

## 25. Future automation requirements

1. Scheduled job to flag/delete orgs past 90-day post-termination window  
2. Aged purge for marketing inquiries, notification logs, and operator audits per this policy  
3. Runbook + checklist for privacy@ requests  
4. Optional share-token rotation on unpublish  
5. Documented backup TTL from Neon/Vercel  
6. Confirm demo reclaim cron in production  

Do **not** implement these in the legal-draft task.

---

## 26. Annual review process

Review this policy at least annually, and sooner when:

- Operator or Stripe entity changes
- New processors or regions are added
- Messaging channels launch or expand
- A security incident occurs
- Counsel advises retention changes
- Product adds employee self-service or biometric-template handling

Record review date and approver.

---

## Appendix A — Internal evidence traceability

| Fact | Source | Status |
|------|--------|--------|
| Attendance UI windows | `lib/attendance-log-window.ts` | Query only |
| Unmapped lookback 90d | `lib/unmapped-device-punches.ts` | Query only |
| Staff report max ~93d | `lib/staff-attendance-report.ts` | Query only |
| Demo reclaim 14d | `lib/demo/reclaim.ts`, `DEMO_SANDBOX_DAYS` | Implemented |
| Staff archive | `lib/staff-archive.ts` | Implemented |
| No attendance age purge cron | audit | Gap |
| Org cascade on delete | `prisma/schema.prisma` | Implemented when delete runs |
| 90d / 24mo / 3y / 2y / 12mo periods | Owner-approved policy | Policy; mostly not automated |

*End of Data Retention and Deletion Policy draft.*
