# Legal Policy Implementation Checklist — Simple Roster Plus

**Status:** Draft for legal review  
**Not yet published**  
**Must be reviewed by a lawyer familiar with Saint Lucia law before production use**

**Purpose:** Operational checklist to move from internal drafts to published Privacy Policy and Terms.  
**Related drafts:**  
- `docs/privacy-policy-draft.md`  
- `docs/terms-of-service-draft.md`  
- `docs/data-retention-and-deletion-policy.md`  
- `docs/legal-privacy-product-evidence-audit.md`

**Constraint reminder:** This checklist does **not** authorize implementing product changes by itself. Complete verification and legal review first. Do not replace live legal pages until after approval.

---

## Before legal review

### Business identity

- [ ] Verify registered business name: **Ellodane Enterprises**
- [ ] Verify full service address format for public use: Goodlands, Castries, Saint Lucia
- [ ] Confirm whether any additional registration number or trade name must appear
- [ ] Confirm **Vantaj Systems** remains excluded from current legal documents
- [ ] Create and test mailbox **privacy@simplerosterplus.com**
- [ ] Confirm **hello@simplerosterplus.com** monitoring and ownership
- [ ] Decide who triages privacy vs billing vs support requests

### Stripe / Ellodane Media LLC

- [ ] Verify Stripe account legal entity is **Ellodane Media LLC** (temporary arrangement)
- [ ] Capture exact **statement descriptor** (do not invent)
- [ ] Verify Stripe receipt / invoice identity shown to customers
- [ ] Verify checkout and Customer Portal legal entity text
- [ ] Verify monthly and annual products and prices (USD)
- [ ] Verify cancellation settings (cancel at period end vs immediate)
- [ ] Verify proration settings for upgrades
- [ ] Verify downgrade / add-on removal timing
- [ ] Verify tax configuration (or confirm taxes not collected automatically)
- [ ] Verify currency and any multi-currency settings
- [ ] Verify failed-payment / dunning behavior at a high level (no invented retry dates)
- [ ] Align Terms refund wording with actual Stripe/support practice

### Messaging and email

- [ ] Confirm WhatsApp production status (live limited/beta vs marketing “Coming soon”)
- [ ] Confirm which Resend transactional emails are live
- [ ] Confirm whether onboarding automation emails are enabled
- [ ] Confirm marketing vs transactional classification for each email type
- [ ] Confirm SMS remains inactive for legal/marketing alignment

### Infrastructure and retention

- [ ] Confirm backup retention (Neon / Vercel / other)
- [ ] Confirm provider regions where possible (Neon, Vercel, Clerk, Stripe, Resend, Twilio)
- [ ] Confirm Google Fonts remains in use on marketing pages
- [ ] Confirm whether Vercel Blob is enabled in production
- [ ] Confirm operator audit logs include IP in metadata (yes/no/sometimes)
- [ ] Confirm demo reclaim cron is scheduled in production
- [ ] Confirm no analytics pixels were added since the audit

### Product facts freeze

- [ ] Re-check Auto Scheduler flag status at publication time
- [ ] Re-check plan limits against `docs/PRICING.md` / `lib/plans.ts`
- [ ] Re-check public share-token behavior (reuse on republish)

---

## Product changes recommended before publication

**Do not implement in the legal-draft task.** Track separately.

### Customer-facing disclosures and process

- [ ] Add payment-entity disclosure near checkout / billing UI (Ellodane Enterprises operates; Ellodane Media LLC may appear on payment records)
- [ ] Add clear privacy-request contact path (privacy@)
- [ ] Document account-deletion process for support staff (runbook)
- [ ] Document retention workflow for operators (from retention policy)

### Security and privacy hardening (recommended)

- [ ] Enforce ADMS communication-key authentication on device ingest
- [ ] Rotate public roster tokens when unpublished
- [ ] Add or review security headers and CSP
- [ ] Consider general API rate limiting
- [ ] Review account-suspension enforcement (suspended orgs)
- [ ] Confirm database and backup encryption with providers
- [ ] Create written incident-response procedure
- [ ] Consider cookie/consent UX only if counsel requires it

### Consistency

- [ ] Align landing “Coming soon” messaging with WhatsApp/SMS/Auto Scheduler reality
- [ ] Ensure Free/Plus/Pro claims match enforced limits

---

## Lawyer-review questions

Provide counsel with the drafts and audit, and ask explicitly:

1. **Saint Lucia Data Protection Act** — required disclosures, lawful bases, and rights wording?  
2. **Electronic Transactions Act** (or equivalent) — electronic assent and notices?  
3. **Consumer-contract requirements** for SaaS sold to small businesses?  
4. Is **controller/processor** (or other) language appropriate for staff data entered by customers?  
5. How should **cross-border transfers** to Clerk/Stripe/Neon/Vercel/Resend/Twilio/Google be described without unverified country lists?  
6. **Employee and minor** data — age thresholds and employer obligations wording?  
7. Adequacy of **biometric-device** disclosures (templates not stored by SRP; devices may store locally)?  
8. Enforceability of **refund, renewal, and auto-renewal** provisions?  
9. Acceptable **liability cap** (12-month fees; Free-tier fixed cap)?  
10. Scope of **indemnity** for staff-notice failures and public-link misuse?  
11. Preferred **dispute venue** in Saint Lucia?  
12. Required **tax-record retention** period?  
13. Must the **full legal address** appear on every public legal page and checkout?  
14. Temporary **Ellodane Media LLC** payment disclosure — sufficient and accurate?  
15. Any mandatory language for **WhatsApp/telephone** messaging consent?  

Mark counsel answers back into the drafts before publication.

---

## After legal approval

### Publish legal pages

- [ ] Replace `landing-page/privacy.html` with approved Privacy Policy HTML  
- [ ] Replace `landing-page/terms.html` with approved Terms HTML  
- [ ] Set accurate **effective dates**  
- [ ] Remove placeholder / stub banners  
- [ ] Remove `noindex` only when approved for indexing  
- [ ] Revalidate canonical tags (`/privacy`, `/terms`)  
- [ ] Decide whether legal pages belong in `sitemap.xml`  
- [ ] Test mobile layouts and footer links  
- [ ] Verify privacy@ and hello@ links work  

### Commercial alignment

- [ ] Publish payment-entity disclosure in checkout/billing UX  
- [ ] Align Stripe settings with published Terms  
- [ ] Notify existing customers if required by law or contract  
- [ ] Archive approved PDF/Markdown versions with version IDs  
- [ ] Schedule annual legal review  

**Still do not change** robots/sitemap/application behavior in the drafting phase; only after explicit publication approval.

---

## Ongoing review triggers

Re-open legal documents when any of the following occur:

- [ ] Vantaj Systems becomes the operator or billing entity  
- [ ] Stripe account or merchant entity changes  
- [ ] New analytics or advertising pixels  
- [ ] SMS launch  
- [ ] WhatsApp general availability (beyond limited/beta)  
- [ ] Employee self-service  
- [ ] Mobile clock-in  
- [ ] GPS or geofencing  
- [ ] Biometric-template handling by SRP  
- [ ] New database or hosting provider  
- [ ] New countries or regions of sale  
- [ ] Material pricing change  
- [ ] Material refund-policy change  
- [ ] Product exceeds 100-staff self-serve plans  
- [ ] Security incident  
- [ ] Legal or regulatory change in Saint Lucia or key markets  

---

## Quick status snapshot (as of draft date)

| Item | Status |
|------|--------|
| Evidence audit | Complete (`docs/legal-privacy-product-evidence-audit.md`) |
| Privacy draft | Internal draft ready for counsel |
| Terms draft | Internal draft ready for counsel |
| Retention policy | Internal operational draft |
| Live `privacy.html` / `terms.html` | Still placeholders — **do not replace yet** |
| Product behavior changes | **Not** made by this checklist task |

---

## Appendix A — Internal evidence references

| Checklist theme | Evidence |
|-----------------|----------|
| Placeholder legal pages | `landing-page/privacy.html`, `landing-page/terms.html` |
| Stripe integration gaps (refunds/tax/proration in app) | `lib/stripe-billing.ts`, OPERATOR_CONSOLE |
| Device COMKEY unused on wire | `lib/zk-iclock-push.ts`, device create route |
| Share token reuse | roster status / share loaders |
| Demo reclaim | `lib/demo/reclaim.ts` |
| No GA/PostHog | audit |
| Plan limits | `lib/plans.ts` |

*End of Legal Policy Implementation Checklist.*
