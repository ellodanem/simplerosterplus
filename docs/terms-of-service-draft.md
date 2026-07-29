# Terms of Service — Simple Roster Plus (Internal Draft)

**Status:** Draft for legal review  
**Not yet published**  
**Must be reviewed by a lawyer familiar with Saint Lucia law before production use**

**Effective date (placeholder):** [TO BE SET ON PUBLICATION]  
**Last updated (draft):** 23 July 2026  
**Source audit:** `docs/legal-privacy-product-evidence-audit.md`

This document is an **internal working draft**. It is **not** legal advice and must not replace `landing-page/terms.html` until approved.

---

## 1. Draft status notice

These Terms of Service (“Terms”) are a working draft of the agreement between the customer organization and Ellodane Enterprises for Simple Roster Plus.

Several billing, tax, and portal behaviors depend on Stripe configuration that cannot be fully verified from the product repository. Items requiring confirmation are listed in Section 38.

Until approved and published, the public Terms page remains a placeholder.

---

## 2. Agreement and contracting party

By creating an account, starting a paid subscription, or otherwise using Simple Roster Plus, you agree to these Terms.

**Service name:** Simple Roster Plus  
**Provider:** Ellodane Enterprises, Goodlands, Castries, Saint Lucia (“Ellodane Enterprises,” “we,” “us,” or “our”)

**Vantaj Systems is not** a party to this agreement as a current operator, affiliate, billing party, or owner.

Our Privacy Policy (when published) explains how we handle personal information. Our internal retention and deletion policy guides operational handling of deletion requests.

---

## 3. Authority to bind an organization

If you create or manage an organization account, you represent that:

- You are entering the agreement on behalf of that organization
- You have authority to bind the organization
- The information you provide is accurate

If you lack authority, you must not create the account.

---

## 4. Authorized users and staff members

- The **business account owner** is the primary contracting party on behalf of the organization.
- Organization **administrators and managers** are authorized users.
- **Staff members** whose names, schedules, leave, attendance, or contact details are entered are **not** automatically separate subscribers merely because their information appears in the service.
- The organization is responsible for who it authorizes as users and for the staff data it enters.

---

## 5. Service description

Simple Roster Plus is **roster-first scheduling and attendance software** for small and shift-based teams. It helps organizations create weekly staff schedules, account for approved time off, publish schedules, and review attendance against the plan.

### What the service is not

Simple Roster Plus:

- Is **not** payroll software
- Is **not** a full HRIS
- Does **not** provide tax, legal, employment, or compliance advice
- Does **not** guarantee labor-law compliance
- Does **not** provide employee mobile or GPS clock-in
- Does **not** provide geofencing
- Does **not** currently provide employee self-service portals
- Does **not** currently provide shift swaps
- Does **not** currently provide CSV staff import
- Does **not** include hardware or hardware installation
- Does **not** support every ZKTeco model or firmware
- Focuses on compatible **ADMS push** attendance records where devices are used
- Is subject to plan limits for staff, locations, administrators, and devices
- Currently has a self-serve plan maximum of **100** active staff on Pro
- May have limitations involving overnight shifts and attendance judgments
- Does **not** offer a complete compliance engine
- Does **not** guarantee complete audit-history coverage

**Auto Scheduler** is **not** currently available as a general production feature. If mentioned in product or marketing materials, it should be treated as planned, limited, beta, or coming soon, depending on production status. It must **not** be described as artificial intelligence or as an LLM-powered feature.

We may change, improve, remove, or replace features over time.

---

## 6. Account registration and security

You must provide accurate registration information and keep credentials confidential.

You are responsible for activity under your organization’s authorized user accounts.

Notify us promptly at hello@simplerosterplus.com if you suspect unauthorized access.

Authentication may use third-party providers (currently Clerk when configured). Legacy authentication paths may exist for some accounts.

---

## 7. Customer responsibilities

You agree to:

- Use the service only for lawful business purposes
- Keep account information accurate
- Manage authorized users appropriately
- Protect published roster links
- Configure attendance devices and networks carefully
- Verify schedules and attendance information before relying on them for payroll, discipline, compliance, or legal decisions
- Comply with applicable employment, privacy, biometric, messaging, and labor laws
- Pay applicable fees for paid plans and add-ons

---

## 8. Staff data and workplace notices

You decide which staff data to enter into Simple Roster Plus.

You are responsible for providing any workplace notices and obtaining any authority or consent required before entering staff personal information, enabling messaging, or connecting attendance devices.

Ellodane Enterprises processes staff information to provide the service. Staff are not separate subscribers solely because their data is entered.

If a staff member contacts us about workplace data, we may refer the request to your organization where you control the records.

---

## 9. Public roster links

When you publish a roster:

- The share link can be opened **without a staff login**
- Anyone with the link may view the published roster details described in our Privacy Policy draft (names, roles, shifts, approved leave indicators, holidays, and related schedule information)
- Attendance punches are **not** included in the public roster view
- You must not post roster links publicly and must distribute them only to intended recipients
- Pages are marked `noindex`, but indexing behavior cannot be guaranteed absolutely
- Unpublishing removes access to the current published week
- The current implementation may reuse an existing share token if you later republish

Public roster links are **not** password-protected or authenticated staff portals.

---

## 10. Attendance devices

If you connect devices:

- Hardware and installation are **not** included
- Compatibility is limited; not all models or firmware are supported
- The service stores punch events and related metadata; it does **not** store fingerprint or face templates
- Devices may store biometrics locally under your configuration
- You are responsible for lawful device use and staff notices
- Device connectivity and clock accuracy affect attendance quality
- You should verify mappings between device user IDs and staff records

---

## 11. Plans and usage limits

Plans (Free, Plus, Pro, and add-ons) include limits such as:

- Active staff counts
- Location counts (Free is limited; paid plans allow unlimited locations subject to staff caps)
- Administrator counts
- Device slots
- Messaging entitlements where applicable

Current published product limits include Free up to 10 staff, Plus up to 50 staff, and Pro up to 100 staff, with admin and device inclusions described in current pricing materials.

We may enforce limits in the product. Attempting to bypass limits is prohibited.

Exact prices and inclusions are shown at signup, in-app billing, or on the pricing page and may change prospectively.

---

## 12. Fees, taxes, and payment processing

Paid plans are billed through Stripe.

- Prices may be charged in the currency shown at checkout (current product materials use **USD**)
- Listed prices may **exclude** applicable taxes
- You are responsible for applicable taxes unless collected by Ellodane Enterprises or Stripe
- Exact tax handling must match production Stripe settings (**owner verification required**)
- We do **not** claim that tax calculation is always automatic

Full payment-card details are handled by Stripe, not stored as full card numbers in Simple Roster Plus.

---

## 13. Ellodane Media LLC payment disclosure

Ellodane Enterprises operates Simple Roster Plus and is the contractual provider.

Payments are temporarily processed through an existing Stripe account associated with **Ellodane Media LLC**.

As a result:

- Ellodane Media LLC may appear on receipts, checkout records, or payment statements
- Ellodane Media LLC is **not** presented as the service operator under these Terms
- Stripe processes payments
- The exact card-statement descriptor must be verified by the owner and aligned with Stripe before publication

If the payment entity changes, we will update customer-facing disclosures.

---

## 14. Renewals

Paid subscriptions renew automatically at the end of each billing period unless cancelled according to these Terms and Stripe Customer Portal controls.

Annual renewals renew for another annual term unless cancelled before renewal processing, subject to portal and Stripe configuration.

---

## 15. Cancellation

### Monthly plans

- You may cancel at any time through the billing portal or by contacting support where portal access is unavailable
- Cancellation normally takes effect at the **end of the current billing period**
- Access continues through the paid period

### Annual plans

- You may cancel, with access continuing until the end of the annual period unless otherwise required by law or agreed in writing

Cancellation of the subscription is not the same as deletion of organization data. Deletion requests are handled as described in Section 30 and our retention policy.

---

## 16. Refunds

### Monthly plans

Monthly payments already made are **generally non-refundable**.

Exceptions may be made for:

- Duplicate billing
- Incorrect charges
- Charges after a valid cancellation request
- Material service failures caused by Ellodane Enterprises
- Cases required by law
- Exceptional circumstances approved by Ellodane Enterprises

### Annual plans

- A **first-time annual purchase** may be eligible for a refund if requested within **14 days** of purchase
- We may refuse or reduce the refund where the service was used extensively, significant account resources were consumed, the request involves abuse, or the account violated these Terms
- Annual renewals are generally non-refundable after processing except for billing mistakes, a pre-renewal cancellation request, material service failure, or legal requirements

**Note:** The audited product does not implement an in-app refund engine. Refunds are processed through Stripe/support. Exact portal and Stripe practices must be aligned with this section before publication.

---

## 17. Upgrades, downgrades, and add-ons

- **Upgrades** may take effect immediately and may be prorated through Stripe. Exact proration depends on Stripe configuration (**verification required**).
- **Downgrades** normally take effect at the next renewal. No cash refund or credit is normally issued for unused current-period time.
- **Add-ons** (such as extra administrators, device slots, and messaging add-ons) follow the subscription billing cycle. Removing an add-on normally stops its next renewal. Current-period charges are generally not refunded.

---

## 18. Failed payments

If payment fails, we may (depending on Stripe and account settings):

- Retry payment
- Restrict paid features
- Downgrade or suspend access
- Cancel the subscription after unresolved non-payment

Exact retry schedules are not stated here because they cannot be verified from the repository alone.

The product may treat certain Stripe statuses (such as past due) as still providing paid access while payment recovery is in progress; unpaid or canceled statuses may remove paid entitlements. Exact customer experience depends on production configuration.

---

## 19. Trial, demo, and Free-plan terms

- The **Free** plan is subject to published limits and does not include all paid features
- Free device sync may be time-limited; roster and manual attendance features may continue after a device-sync trial ends, subject to current plan rules
- **Demo** sandboxes are temporary (including a documented 14-day demo expiry process) and may be deleted after expiry
- Demo data should not be treated as a production archive
- We may modify or end Free, trial, or demo offers prospectively

---

## 20. Messaging and WhatsApp

Automated WhatsApp messaging is a **limited-availability / beta** capability where enabled.

It depends on plan entitlement, organization settings, provider configuration, and staff opt-in.

You must not enable messaging without appropriate authority or consent.

Manual sharing of a roster link is separate from automated messaging.

SMS is not currently an active product feature in the audited product.

---

## 21. Acceptable use

You must not:

- Use the service illegally
- Access accounts or data without authorization
- Share credentials outside your authorized users
- Attempt to bypass plan limits
- Reverse engineer the service where lawfully restrictable
- Interfere with service operation
- Upload malicious code
- Scrape or harvest data beyond normal product use
- Misuse device endpoints or spoof attendance records
- Submit unlawful, defamatory, or infringing content
- Publicly expose roster links irresponsibly
- Use the service to violate employment, privacy, biometric, or labor laws
- Enter staff data without appropriate authority
- Use WhatsApp messaging without appropriate opt-in or authority

These restrictions are not intended to prevent ordinary customer exports, interoperability, or legally protected activity.

---

## 22. Third-party services

The service depends on third parties such as Clerk, Stripe, hosting and database providers, email providers, and (where enabled) Twilio for WhatsApp.

Their terms and availability affect the service. We are not responsible for third-party failures beyond our reasonable control, except as required by law.

Customer-owned attendance devices are third-party hardware under your control.

---

## 23. Customer data

As between you and Ellodane Enterprises, you retain ownership of customer-entered organization data, staff data, roster information, attendance data, and other content you submit.

You grant Ellodane Enterprises a limited right to host, process, reproduce, and transmit that data only as needed to provide, secure, support, and improve the service.

We do not sell customer data to advertisers.

---

## 24. Intellectual property

Ellodane Enterprises and its licensors own Simple Roster Plus software, source code, interfaces, branding, documentation, templates, and product design.

These Terms do not transfer ownership of our intellectual property to you. We grant you a limited, non-exclusive, non-transferable right to use the service during your subscription or Free-plan access according to these Terms.

---

## 25. Feedback

If you provide feedback or suggestions, you grant Ellodane Enterprises a royalty-free right to use that feedback to improve the service without obligation to you.

---

## 26. Service changes

We may modify features, plan limits, interfaces, and integrations. Where a change materially reduces paid functionality, we will use reasonable efforts to provide notice.

---

## 27. Availability and maintenance

The service is provided on an **“as available”** basis.

Temporary outages, maintenance, provider disruptions, device issues, and internet failures may occur.

We do not guarantee uninterrupted or error-free operation.

Attendance records depend partly on device configuration, clocks, networks, staff mapping, and customer-entered corrections.

---

## 28. Suspension

We may suspend access for:

- Non-payment
- Security risk
- Illegal activity
- Abuse
- Serious policy violations
- Attempts to compromise the service
- Repeated plan-limit circumvention
- Required legal or regulatory action

We will provide reasonable notice where practical, and may act immediately where security, fraud, legal obligations, or harm require it.

**Note:** Not every suspension condition is automatically enforced by current product code. Suspension and billing-status handling are partial in the audited system.

---

## 29. Termination

Either party may terminate according to cancellation rules, Free-plan cessation, or for material breach.

Upon termination:

- Paid access ends according to billing status and period rules
- You should export available data before termination where possible
- Organization deletion is support-based (see Section 30)
- We may retain legally required records
- Payment, intellectual-property, liability, confidentiality, indemnity, and dispute clauses survive termination as applicable

---

## 30. Data export, retention, and deletion

- You may export certain data using in-product tools (for example pay-period CSV, print, or roster image downloads) where available
- There is no complete self-serve organization export package in the audited product
- Organization deletion requests: privacy@simplerosterplus.com or hello@simplerosterplus.com
- Operational targets: acknowledge within 5 business days; target active-system deletion within 30 days after authority verification, subject to legal retention and backups
- Terminated organization production data is targeted for deletion or anonymization within **90 days** after termination or cancellation unless legal retention applies (**automation not currently enforced**)
- Staff archival is not full historical deletion

Details are in the internal Data Retention and Deletion Policy.

---

## 31. Disclaimers

To the maximum extent permitted by law:

- The service is provided **as is** and **as available**
- We disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement, except where such disclaimers are not allowed
- The service is not a substitute for professional legal, tax, payroll, HR, or employment advice
- You should verify information before using it for payroll, discipline, compliance, or legal decisions

---

## 32. Limitation of liability

**LEGAL REVIEW REQUIRED**

To the maximum extent permitted by law:

- Ellodane Enterprises is not liable for indirect, incidental, special, consequential, punitive, or lost-profit damages
- Ellodane Enterprises’ aggregate liability arising out of or related to the service is limited to the fees paid by the customer to Ellodane Enterprises for Simple Roster Plus in the **12 months** before the claim
- For customers on Free with no fees paid in that period, a modest fixed cap (for example **USD 100**) may apply — **exact Free-tier cap [LEGAL REVIEW REQUIRED]**
- Nothing in these Terms excludes liability that cannot legally be excluded

This section is a commercially reasonable starting draft only and is not final enforceable advice.

---

## 33. Indemnity

**LEGAL REVIEW REQUIRED**

You agree to defend and indemnify Ellodane Enterprises against claims arising from:

- Unlawful data entry
- Failure to provide required staff notices or authority
- Public roster-link misuse
- Illegal messaging
- Infringement of third-party rights
- Your violation of law or these Terms

to the extent permitted by applicable law.

---

## 34. Governing law and disputes

These Terms are governed by the laws of **Saint Lucia**, without regard to conflict-of-law rules that would require another jurisdiction’s law.

**[LEGAL REVIEW REQUIRED]** Dispute venue, arbitration vs courts, and consumer-contract formalities under Saint Lucia law.

---

## 35. Electronic notices

We may provide notices by email to account addresses on file, in-product messages, or website postings.

You consent to electronic contracting and notices to the extent permitted by law.

**[LEGAL REVIEW REQUIRED]** under the Electronic Transactions Act or equivalent Saint Lucia requirements.

---

## 36. Changes to the Terms

We may update these Terms. The published version will show an effective date.

Continued use after the effective date constitutes acceptance of the updated Terms, except where additional consent is required by law.

Material changes to paid terms will be communicated with reasonable notice where practical.

---

## 37. Contact information

**Ellodane Enterprises**  
Goodlands, Castries, Saint Lucia

General support: hello@simplerosterplus.com  
Privacy and deletion: privacy@simplerosterplus.com

---

## 38. Items requiring legal or owner confirmation

1. Exact Stripe statement descriptor and Ellodane Media LLC checkout identity  
2. Stripe cancel-at-period-end, proration, tax, currency, and dunning settings  
3. Liability cap amounts (including Free-tier cap)  
4. Indemnity enforceability  
5. Dispute venue and consumer protections  
6. Electronic notices formalities  
7. Tax-record retention period  
8. Whether the full legal address must appear on every public page  
9. Alignment of WhatsApp availability with marketing  
10. Confirmation that Vantaj Systems remains excluded  
11. Final Auto Scheduler production status wording at publication time  

---

## Appendix A — Internal evidence traceability (not for public HTML)

| Fact | Source path (internal) | Status |
|------|------------------------|--------|
| Not payroll; roster + attendance positioning | PRODUCT_NOTES, Terms stub, marketing | Active |
| Plan limits Free/Plus/Pro | `lib/plans.ts`, `docs/PRICING.md` | Active |
| Stripe checkout/portal; no in-app refund API | `lib/stripe-billing.ts`, OPERATOR_CONSOLE | Active / gaps |
| Share links unauthenticated | `app/share/roster/*` | Active |
| No biometric templates | `lib/zk-iclock-push.ts` | Active |
| Auto Scheduler flag off | `lib/auto-scheduler-feature.ts` | Feature-flagged |
| No employee self-service / phone clock-in | MOBILE_STRATEGY | Not found |
| Org deletion via support (no self-serve) | audit | Gap / proposed process |
| Demo 14 days | `DEMO_SANDBOX_DAYS` | Active |
| Cancel anytime marketing claim | landing pricing copy | Marketing; portal unverified |
| Operator / Media LLC / Saint Lucia law | Owner facts | Proposed |

*End of Terms of Service draft.*
