# Privacy Policy — Simple Roster Plus (Internal Draft)

**Status:** Draft for legal review  
**Not yet published**  
**Must be reviewed by a lawyer familiar with Saint Lucia law before production use**

**Effective date (placeholder):** [TO BE SET ON PUBLICATION]  
**Last updated (draft):** 23 July 2026  
**Source audit:** `docs/legal-privacy-product-evidence-audit.md`

This document is an **internal working draft**. It is **not** legal advice and must not replace `landing-page/privacy.html` until approved.

---

## 1. Draft status notice

This Privacy Policy draft describes how Ellodane Enterprises (“we,” “us,” or “our”) intends to handle information in connection with Simple Roster Plus.

It is based on a repository product audit and owner-supplied business facts. Several items remain unverified in production dashboards or contracts and are listed in Section 23.

Until this draft is approved and published:

- The public privacy page remains a placeholder.
- Customers and staff should not treat this file as the live Privacy Policy.

---

## 2. Who operates Simple Roster Plus

Simple Roster Plus is operated by:

**Ellodane Enterprises**  
Goodlands, Castries, Saint Lucia

**General support:** hello@simplerosterplus.com  
**Privacy and deletion requests:** privacy@simplerosterplus.com

Payments may temporarily be processed through Stripe using an account associated with **Ellodane Media LLC**. Ellodane Enterprises remains the service operator and contractual provider of Simple Roster Plus. Ellodane Media LLC may appear on receipts, checkout records, or payment statements while that temporary arrangement remains in place. Ellodane Media LLC is not presented here as the service operator. The exact card-statement descriptor must be verified by the owner before publication and aligned with Stripe.

**Vantaj Systems is not** a current operator, affiliate, billing party, or owner of Simple Roster Plus for purposes of this draft.

---

## 3. Scope of the policy

This policy is intended to cover personal and related information processed when you:

- Visit our marketing website
- Create or use a Simple Roster Plus account
- Manage an organization, locations, staff, rosters, attendance, or devices
- Contact us for support, sales, or feedback
- Receive service-related email or (where enabled) WhatsApp messages

It applies to information about account owners, administrators, managers, and other authorized business users, and to staff and related workplace information entered by customer organizations.

---

## 4. Customer organizations and staff data

Simple Roster Plus is built for businesses.

- The **business account owner** contracts with Ellodane Enterprises on behalf of the organization.
- Administrators and managers are **authorized users**.
- Staff members whose names, schedules, leave, attendance, or contact details are entered are **not** automatically separate subscribers merely because their data appears in the product.
- The **customer organization** decides which staff data to enter and is responsible for lawful notices, authority, consent, and workplace obligations concerning its staff.
- Ellodane Enterprises processes staff information to provide Simple Roster Plus.

**[LEGAL REVIEW REQUIRED]** Whether Ellodane Enterprises should be described as a “controller,” “processor,” or under another role for particular data categories under Saint Lucia law (and other applicable laws) must be confirmed by counsel. This draft does not make an absolute classification.

Staff members who have privacy questions about workplace data should typically contact their employer first. We may refer staff requests to the customer organization where the customer controls the relevant records.

---

## 5. Information collected

Depending on how the service is used, we may collect or store:

### 5.1 Account and organization data

- Email addresses
- Authentication identifiers (including Clerk user identifiers when Clerk is used)
- Organization identifiers
- Roles (for example owner, admin, or member)
- Subscription and plan information
- Organization name
- Locations and location names
- Time zones
- Departments
- Staff roles and shift templates
- Settings needed to operate the product

### 5.2 Staff data (usually entered by managers)

- First and last names
- Optional email address
- Optional telephone number
- Optional date of birth
- Optional start date
- Role, department, and location assignments
- Device user ID (for matching attendance device punches)
- Active or archived status
- WhatsApp opt-in status and opt-in date (where messaging is used)
- Leave information, days off, sick leave, and shift requests or preferences
- Roster assignments and related notes

### 5.3 Attendance data

- Clock-in and clock-out timestamps
- Punch source (for example manual entry or device ingest)
- Scheduled shift times used for comparison
- Present, absent, or late determinations derived for review
- Grace-period and related attendance settings
- Manager notes and corrections
- Original punch timestamps and correcting user identifiers (where recorded)
- Device timestamps and device user IDs associated with punches

### 5.4 Device data

- Device name, serial number, model, and firmware version (where provided)
- IP address and port (where recorded)
- Location assignment
- Enabled or disabled status
- Last-seen timestamp
- Device notes
- Hashed communication credentials generated for pairing (where used)

### 5.5 Billing data

- Stripe customer and subscription identifiers
- Plan, subscription status, billing period, add-on quantities, and trial dates
- Billing-related mirrors used for account access and operator support
- Customer information passed to Stripe for checkout and invoices

**Full payment-card numbers and card security codes are handled by Stripe.** The audited product does not show Simple Roster Plus storing full card numbers or CVV/CVC values.

### 5.6 Marketing, support, and onboarding data

- Marketing inquiry name, email, phone, business name, staff-count information, ZKTeco interest, and messages
- Product feedback and related page URLs
- Support correspondence
- Onboarding and funnel events (including anonymous session identifiers used for setup analytics)

### 5.7 Technical and browser data

- Cookies and similar storage described in Section 12
- Standard technical metadata that hosting and security providers may process (such as IP address, browser type, and timestamps) when you use the website or app

We do **not** claim that no third-party service ever receives IP addresses or browser metadata.

---

## 6. How information is collected

We collect information when:

- You create an account or organization (including through authentication providers)
- You enter or import information into the product (managers typically enter staff data manually; spreadsheet staff import is not currently offered)
- Attendance devices push punch records to our device endpoints (where configured)
- You publish and share roster links
- You contact us or submit marketing or feedback forms
- You enable messaging and staff opt-in fields
- Our systems create logs needed for security, billing sync, onboarding, or support

We may also receive information from service providers listed in Section 13 (for example authentication events from Clerk or subscription events from Stripe).

---

## 7. How information is used

We use information to:

- Provide, operate, secure, and support Simple Roster Plus
- Create and manage organizations, users, locations, rosters, leave, attendance, and devices
- Authenticate users and enforce plan limits
- Process subscriptions and provide billing access through Stripe
- Send transactional or service emails (and, where enabled, WhatsApp utility messages)
- Respond to support, privacy, and deletion requests
- Improve reliability, onboarding, and product quality using operational data
- Detect abuse, fraud, and security incidents
- Comply with legal obligations

We do **not** sell customer data to advertisers.

We may use **de-identified or aggregated** operational statistics to understand product usage and improve the service. **[OWNER APPROVAL REQUIRED]** before publishing any broader analytics wording.

---

## 8. Attendance devices and biometric information

Where a customer connects a supported attendance device:

- Simple Roster Plus stores **attendance punch events** (and related device and mapping metadata).
- Simple Roster Plus **does not store fingerprint templates or face templates**.
- Customer devices may store biometric information **locally**, depending on manufacturer configuration and the customer’s settings.
- Ellodane Enterprises does **not** control the customer’s local biometric-device configuration, network, or firmware choices.
- Device connectivity for the audited product focuses on compatible cloud push (ADMS-style) attendance records; not every ZKTeco model or firmware is supported.
- Device authentication and network security depend partly on customer configuration. The product’s device endpoints are not described here as mutually authenticated enterprise device security.

Customers are responsible for configuring devices lawfully and for informing staff as required.

---

## 9. Public roster links

When a customer publishes a roster and shares a link:

- The published roster can be opened **without a staff login**.
- Anyone with the link may be able to view the published week.
- The view may include organization or location name, staff names, roles, shift dates and times, approved leave or day-off indicators, and holiday information.
- **Attendance punches are not included** in the public roster view.
- Pages are marked so that search engines are asked not to index them (`noindex`), but search-engine behavior cannot be guaranteed absolutely.
- Unpublishing removes access to the current published week.
- Current product behavior may **reuse an existing share token** if the roster is later republished.

Customers decide who receives the link, should not post roster links publicly, and must protect and distribute links appropriately.

---

## 10. Billing and payments

Subscription billing is handled through Stripe.

- We store Stripe customer and subscription identifiers and related plan status information needed to operate paid features.
- Stripe processes payment methods, invoices, and the customer billing portal.
- While the temporary payment arrangement remains in place, **Ellodane Media LLC** may appear on receipts or payment records even though **Ellodane Enterprises** operates the service.
- Exact statement descriptors, tax collection, and portal settings must match production Stripe configuration (**owner verification required**).

---

## 11. Email and WhatsApp communications

### Email

We may send transactional and service emails (for example account, support, or onboarding-related messages) using email delivery providers. Some automated onboarding sequences may be disabled unless enabled in production configuration.

### WhatsApp (limited availability / beta)

Automated WhatsApp roster messaging, where available:

- Depends on configuration, plan entitlement, organization settings, and **staff opt-in**
- Is **not** universally included on every plan
- Uses Twilio to process telephone numbers and message content
- May retain message logs and provider message identifiers
- Is separate from **manual** copying of a roster link into WhatsApp or other channels

Customers are responsible for obtaining any notices, permissions, or consent required before entering staff phone numbers or enabling messages.

**SMS** is not currently presented as an active product feature in the audited product. Marketing “Coming soon” statements must later be aligned with production reality.

---

## 12. Cookies and browser storage

Simple Roster Plus and related sites may use:

- Authentication cookies for signed-in sessions
- Operator-session cookies for internal support tools
- Clerk-managed cookies when Clerk authentication is enabled
- An anonymous onboarding identifier (cookie and/or localStorage) used for setup funnel analytics
- SessionStorage values used for setup progress in the browser

**Not found in the audited repository:** Google Analytics, PostHog, Meta Pixel, Sentry, or similar advertising trackers.

If analytics or advertising technologies are added later, this policy must be updated.

Third-party services (including font delivery on the marketing site) may still process technical data such as IP addresses when their resources are loaded.

We do not currently show a cookie consent banner in the audited product. **[LEGAL REVIEW REQUIRED]** whether a banner or preference center is required for Saint Lucia or other target markets.

---

## 13. Third-party service providers

We use providers to operate the service. Exact hosting countries and subprocessors may vary and should be verified from provider dashboards and contracts before publication.

| Provider / category | Purpose | Data that may be involved |
|---------------------|---------|---------------------------|
| Clerk | Authentication and organization membership | Account identity, email, membership, session-related data |
| Stripe | Payments, subscriptions, billing portal, invoices | Customer and billing information; payment methods handled by Stripe |
| Neon / PostgreSQL | Primary database hosting | Product database contents |
| Vercel | Application and website hosting (and optional Blob storage if enabled) | Application traffic, logs, and hosted content |
| Resend | Email delivery | Email addresses and message content |
| Twilio | WhatsApp messaging where enabled | Phone numbers, template/message content, delivery identifiers |
| Google Fonts | Font delivery on the marketing website | Technical request data (for example IP/browser metadata) |
| Customer-owned ZKTeco-compatible devices | Attendance punch sources | Punch events and device identifiers pushed to our endpoints |

Providers may process data **outside Saint Lucia**. Data-protection rules in those countries may differ.

We do not invent Data Processing Agreement terms here. Collecting DPAs and confirming regions is an implementation checklist item.

Inactive or not found as product integrations in the audit (and therefore not listed as current processors): Google Analytics, PostHog, Sentry, OpenAI/LLM providers, and SMS providers.

---

## 14. International processing

Simple Roster Plus is operated from Saint Lucia.

Third-party providers may process information in other countries. Exact regions depend on provider configuration and are **not fully verified from the product repository**.

---

## 15. Data retention

We retain information as needed to provide the service and as described in our internal data retention and deletion policy.

In summary (subject to legal exceptions and backup retention):

- **Active customer data:** retained while the account is active and as needed to provide the service
- **Terminated or cancelled organization data:** target up to **90 days** after termination or cancellation for recovery, export, or dispute handling, then delete or anonymize unless legal retention applies (**not currently enforced by automated purge in the audited product**)
- **Marketing inquiries:** up to **24 months** after the last meaningful interaction
- **Support correspondence:** up to **3 years**
- **Operator audit records:** up to **2 years**
- **WhatsApp notification logs:** up to **12 months**
- **Demo organizations:** according to the existing **14-day** demo-expiry process (subject to production cron operation)
- **Billing and accounting records:** for periods required by tax, accounting, fraud-prevention, and legal obligations (**fixed period [LEGAL REVIEW REQUIRED]**)
- **Backups:** depend on infrastructure providers; deleted data may remain until backups expire (**exact periods unverified**)

Attendance display windows, report range limits, and unmatched-punch lookbacks are **query/display limits**, not deletion or retention periods.

---

## 16. Staff archiving and deletion

Archiving a staff member removes them from active scheduling workflows. Archiving is **not** the same as deleting all historical records.

Historical rosters, attendance, leave, corrections, and related operational records may remain.

Customers may contact us to request deletion or anonymization where appropriate. Some records may be retained where needed to preserve legitimate business history, legal records, billing integrity, or system integrity. We do not promise that every attendance or roster record can always be erased without consequence.

---

## 17. Organization deletion

Organization deletion is requested by email to **privacy@simplerosterplus.com** or **hello@simplerosterplus.com**.

Operational targets (policy, not a guarantee of instantaneous erasure):

- Acknowledge within **5 business days**
- Verify the requester’s identity and authority to act for the organization
- Target completion of active-system deletion within **30 days**
- Delay or limit deletion where retention is required for billing, tax, fraud prevention, security, disputes, or law
- Backups may retain information temporarily until normal backup expiration
- Confirm completion or explain required retention

Self-serve organization deletion is not currently offered in the audited product.

---

## 18. Security

Ellodane Enterprises uses reasonable administrative, technical, and organizational safeguards appropriate to Simple Roster Plus.

No system is completely secure. Security also depends on customers protecting credentials and roster links, on third-party authentication and infrastructure providers, and on customers’ device and local network configuration.

This policy does **not** claim that the service is fully secure, that all data is end-to-end encrypted, that encryption at rest is verified for every store, that devices are mutually authenticated, that communication keys are enforced on every device request, that enterprise audit logging is complete, or that breaches can be prevented.

---

## 19. Rights and requests

Subject to applicable law, you may be able to request:

- Access to personal information we hold about you
- Correction of inaccurate information
- Deletion
- Restriction or objection where applicable
- Withdrawal of consent where processing is consent-based
- Complaint or inquiry
- Assistance with requests relating to staff data

**How to submit:** privacy@simplerosterplus.com (or hello@simplerosterplus.com)

Please:

- Use in-product tools for ordinary corrections where possible
- Expect identity and authority verification
- Understand that staff workplace-data requests may be referred to the employer organization
- Understand that some information may be retained where legally permitted or required

**[LEGAL REVIEW REQUIRED]** Exact rights wording under Saint Lucia law (and for customers in other countries) must be finalized by counsel. We do not guarantee every listed right applies identically everywhere.

---

## 20. Children and minor employees

Simple Roster Plus is intended for businesses and authorized business users. It is not directed to children for personal use.

Customers must not allow children to create business administrator accounts.

Customers are responsible for ensuring they have lawful authority before entering information relating to a minor employee. The system may contain information relating to minors if a customer enters it.

**[LEGAL REVIEW REQUIRED]** Exact age threshold and Saint Lucia employment-law wording.

---

## 21. Changes to the policy

We may update this Privacy Policy from time to time. The published version will show an effective date. Material changes may be communicated by email, in-product notice, or website posting, as appropriate.

---

## 22. Contact information

**Ellodane Enterprises**  
Goodlands, Castries, Saint Lucia

Privacy and deletion: privacy@simplerosterplus.com  
General support: hello@simplerosterplus.com

---

## 23. Items requiring legal or owner confirmation

1. Registered business name and full public address format  
2. Creation and monitoring of privacy@simplerosterplus.com  
3. Exact Stripe statement descriptor and Ellodane Media LLC receipt identity  
4. Controller/processor (or equivalent) classification under Saint Lucia law  
5. Cookie consent requirements  
6. Exact rights language under the Saint Lucia Data Protection Act and related law  
7. Minor/employee age thresholds  
8. Neon, Vercel, Clerk, Stripe, Resend, Twilio regions and DPAs  
9. Backup retention periods  
10. Whether automated retention purge will be built before publication  
11. WhatsApp production availability vs marketing “Coming soon”  
12. Aggregated analytics wording owner approval  
13. Tax-record retention period  

---

## Appendix A — Internal evidence traceability (not for public HTML)

| Fact | Source path (internal) | Status |
|------|------------------------|--------|
| Product stores AppUser/Staff/Attendance/Device/billing mirrors | `prisma/schema.prisma` | Active |
| Clerk auth (env-gated) | `middleware.ts`, `lib/clerk/*` | Conditional |
| Stripe checkout/portal/webhooks; no PAN storage in schema | `lib/stripe-billing.ts`, schema | Active / unverified portal settings |
| Resend email | `lib/email/send.ts` | Conditional |
| Twilio WhatsApp + staff opt-in | `lib/messaging/*`, Staff fields | Conditional / limited |
| No biometric templates stored | `lib/zk-iclock-push.ts` | Active |
| Public share tokens; noindex; roster not attendance | `lib/roster-share*.ts`, `app/share/roster/*` | Active |
| Cookies `srp_session`, ops, onboarding anon | `lib/auth-cookie.ts`, onboarding funnel | Active |
| No GA/PostHog/Sentry in repo | audit grep | Not found |
| Legal stubs only | `landing-page/privacy.html` | Placeholder |
| Org self-delete not self-serve | audit / OPERATOR_CONSOLE | Gap |
| Demo 14-day reclaim | `lib/demo/reclaim.ts`, `DEMO_SANDBOX_DAYS` | Active (cron unverified in prod) |
| Operator Ellodane Enterprises / Media LLC Stripe | Owner facts | Proposed / unverified in repo |
| Retention periods in §15 | Owner-approved policy direction | Approved policy; mostly not automated |

*End of Privacy Policy draft.*
