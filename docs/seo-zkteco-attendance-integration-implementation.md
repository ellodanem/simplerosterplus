# SEO ZKTeco Attendance Integration — Implementation Record

**Date:** 17 July 2026
**Target URL:** `https://www.simplerosterplus.com/zkteco-attendance-integration`
**Source brief:** `docs/seo-zkteco-attendance-integration-page-brief.md`

---

## 1. Files changed


| Path                                                       | Change                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `landing-page/zkteco-attendance-integration/index.html`    | **Created** — directory-based landing page with SEO metadata, commercial copy, FAQ, CTAs, and structured data |
| `landing-page/index.html`                                  | Contextual ZKTeco links in hero trust, features, FAQ; footer link added; future-page comment removed          |
| `landing-page/employee-attendance-software/index.html`     | Contextual links in device capture section, device note, and ZKTeco FAQ                                       |
| `landing-page/sitemap.xml`                                 | Added canonical ZKTeco page URL                                                                               |
| `docs/seo-zkteco-attendance-integration-implementation.md` | This implementation record                                                                                    |


No application functionality, pricing, legal noindex, framework, CMS, or invented field-test results were changed.

---

## 2. Final title, meta description, H1, and canonical


| Field                | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**            | `ZKTeco Attendance Integration                                                                                                                                         |
| **Meta description** | `Receive compatible attendance punches from supported ZKTeco terminals using ADMS push, match terminal users to staff, and compare clock-ins with your weekly roster.` |
| **H1**               | `Connect Supported ZKTeco Attendance Terminals to Your Staff Roster`                                                                                                   |
| **Canonical**        | `https://www.simplerosterplus.com/zkteco-attendance-integration`                                                                                                       |
| **Robots**           | `index, follow`                                                                                                                                                        |


Open Graph and Twitter metadata use the same title/description intent and the existing attendance screenshot as the social image.

---

## 3. Page structure

1. Hero
2. Who this integration is for
3. How ADMS push works
4. What attendance data Simple Roster Plus receives
5. Match terminal user IDs to employees
6. Retain and recover unmatched punches
7. What must be configured on the terminal
8. Compatibility boundaries and honest limitations
9. Pricing and device slots
10. FAQ
11. Closing CTA

---

## 4. Confirmed claims used

- ADMS push from device to cloud over HTTPS on port 443
- Public `/iclock/`* endpoints
- Compatible ATTLOG ingestion
- Device identification by registered serial number
- Device registration and location assignment
- Device-user-to-staff matching
- Retention of unmatched punches
- Backfilling prior unmatched punches after mapping
- Near-duplicate punch suppression
- In/out punch interpretation from ATTLOG
- Device last-seen/contact visibility
- Multiple devices within plan limits
- Roster-connected attendance review
- Free 30-day live device sync trial
- Device slots by plan (Free 1 / Plus 1 / Pro 3)
- Self-service setup guidance
- Punch events stored; fingerprint/face templates not stored

---

## 5. Claims excluded

- Works with all ZKTeco devices
- Certified / production-proven F22
- Every firmware version supported
- Plug-and-play / zero configuration
- Guaranteed real-time or live-streaming dashboards
- Pull TCP, LAN SDK, Windows agent
- BioTime or ZKBio integration
- Offline sync as an SR+ feature
- Automatic device discovery
- Automatic employee matching without device-user setup
- Enforced communication-key authentication
- Included hardware
- Installation included
- Remote device commands
- Staff enrolment pushed to terminals
- Fingerprint or face template storage
- Verification-method capture from every punch
- Compliance-ready / secure-by-default biometric handling
- Works without internet
- Unused Free trial-extension path

---

## 6. ADMS wording used

- “Supported ZKTeco terminals connect outbound to Simple Roster Plus using ADMS push over HTTPS on port 443.”
- “Simple Roster Plus receives compatible ATTLOG punch events.”
- Pull TCP described only as **not available**.

---

## 7. F22 wording used

Exact safe wording in the compatibility note and FAQ:

> Setup guidance is based on ADMS Cloud Server settings commonly used by terminals such as the F22 family. Confirm your exact model and firmware can send compatible ATTLOG records to a cloud server.

F22 is **not** mentioned in the hero. No certification or production-proof claim appears.

---

## 8. Setup requirements described

- Register terminal serial and assign location
- Set public HTTPS server address
- Port 443 and HTTPS enabled
- ATTLOG / real-time attendance upload enabled (not OPERLOG-only)
- Match terminal user IDs to employee device user IDs
- Older firmware may need full push and poll URLs

Explicitly not described as zero-configuration or automatic.

---

## 9. Security / privacy boundaries

- Stores attendance punch events and staff identifiers, not fingerprint or face templates
- Devices recognized by registered serial number and can be disabled
- No end-to-end authentication, enforced comm-key, biometric-law, GDPR/HIPAA, or secure-by-default claims

Legal pages remain separate placeholders with `noindex, follow`.

---

## 10. Pricing / device-slot wording

- Free: 1 device slot, 30-day live sync trial
- Plus: 1 included device
- Pro: 3 included devices
- Extra devices available as paid add-ons
- Device slots = software connectivity; hardware not included
- Trial-extension path not advertised

---

## 11. Internal links


| Source                           | Link                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ZKTeco page                      | `/`, `/employee-attendance-software`, `/employee-scheduling-software`, `/#pricing`, `/privacy`, `/terms`, app signup/demo/login |
| Homepage hero trust              | `/zkteco-attendance-integration`                                                                                                |
| Homepage features                | `/zkteco-attendance-integration`                                                                                                |
| Homepage FAQ (clock-in hardware) | `/zkteco-attendance-integration`                                                                                                |
| Homepage footer                  | ZKTeco integration                                                                                                              |
| Attendance capture + note + FAQ  | `/zkteco-attendance-integration`                                                                                                |


---

## 12. Sitemap update

Added:

`https://www.simplerosterplus.com/zkteco-attendance-integration`

---

## 13. Structured data

- `WebPage` `@id` `…/zkteco-attendance-integration#webpage`
- `BreadcrumbList` `@id` `…/zkteco-attendance-integration#breadcrumb`
- References existing `#website` and `#software`
- No duplicate `SoftwareApplication`, hardware offers, ratings, reviews, or `FAQPage`

---

## 14. Visuals used


| Asset                                                          | Role                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `landing-page/images/solution-attendance.webp` (+ PNG / `@2x`) | Hero and social image — roster-connected attendance after punches |
| `landing-page/images/attendance-week-current.webp` (+ PNG)     | Matching section — current week view                              |


No ZKTeco product photography, compatibility matrices, certification badges, or invented device UI mockups were added. Setup is described with a checklist panel rather than a fabricated Add Device screenshot.

---

## 15. Manual production checks

After deployment, verify:

- `/zkteco-attendance-integration` returns `200`
- Trailing slash redirects to the canonical URL
- `/index.html` redirects to the canonical URL
- Canonical, title, meta description, and single H1 are correct
- Homepage ZKTeco / FAQ / footer links work
- Attendance-page device links work
- Sitemap includes the canonical URL
- Signup / demo / login work with JavaScript disabled
- Structured data parses without errors
- No localhost, staging, or `vercel.app` URLs
- No universal compatibility, F22 certification, BioTime, ZKBio, pull TCP, offline sync, hardware, installation, compliance, or secure-by-default claims
- Screenshots still match product behavior
- Phone, tablet, and desktop layouts checked
