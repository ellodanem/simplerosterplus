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

| Asset | Role |
| --- | --- |
| `landing-page/images/zkteco-f22-attendance-hero.webp` (+ PNG) | Hero and social image — example fingerprint terminal beside attendance software |
| `landing-page/images/zkteco-staff-matching.webp` (+ PNG) | Matching section — cropped unmatched-punches → staff Device user ID mapping UI |

### User-requested image changes (post-launch)

These visual updates were requested after the page first shipped, so the page would match each section’s message instead of reusing generic attendance screenshots.

| When | Request | What changed |
| --- | --- | --- |
| Hero | Make the hero relevant: **F22-style terminal + attendance**, not a standalone week-view screenshot | Replaced hero/`og`/`twitter` image with `zkteco-f22-attendance-hero` (terminal beside attendance UI). Kept honest F22/copy limits; alt avoids naming a certified model. |
| Matching section | Same idea for “Match Terminal User IDs to Employees” — image must show **device user ID / enrolment matching**, not the attendance week grid | First used a generated matching UI visual; then replaced with the **cropped** matching screenshot the stakeholder approved (`zkteco-staff-matching`). |
| Matching crop preference | “This cropped version is fine. Let’s go with that.” | Final matching asset is the cropped unmatched-punches → Device user ID mapping image (1024 × 755), with caption/alt updated to that workflow. |

**Do not regress:** keep the hero as terminal + attendance, and keep the matching section on the cropped staff-matching visual—not `solution-attendance` or `attendance-week-current` in those slots.

### Hero image record

| Item | Detail |
| --- | --- |
| **Why added** | Stakeholder request: attendance-only hero under-communicated ZKTeco integration. Terminal-beside-dashboard visual makes ADMS punch → roster attendance clearer. |
| **File paths** | `landing-page/images/zkteco-f22-attendance-hero.webp`, `landing-page/images/zkteco-f22-attendance-hero.png` |
| **Hosting** | Locally hosted under the marketing site `images/` directory (not hotlinked) |
| **Dimensions** | 1536 × 1024 |
| **File sizes** | WebP ≈ 96 KB; PNG ≈ 1.5 MB (fallback) |
| **Formats** | WebP primary via `<picture>`; PNG fallback |
| **Alt text** | `Attendance terminal beside the Simple Roster Plus attendance dashboard` |
| **OG / Twitter** | Uses `https://www.simplerosterplus.com/images/zkteco-f22-attendance-hero.png` with matching alt |
| **Provenance** | AI-generated marketing composite created in-repo for this page (not a licensed ZKTeco product photo; not a physical field-test capture). Commercial use is intended as an illustrative SR+ marketing asset, not as vendor artwork. |
| **Model / branding** | Depicts a **generic** fingerprint attendance terminal beside an attendance UI. Filename retains `f22` for asset history only. Image should not be treated as a certified F22 product shot. No intentional ZKTeco logo or endorsement seal was added. |
| **Certification risk** | Medium if misread as “official F22 proof.” Mitigated by page copy: supported terminals, ADMS push, compatibility depends on model/firmware/configuration, and F22 described only as a common ADMS setup family—not production-certified. |
| **Surrounding copy** | Unchanged F22 wording and honest limits remain in place. |

### Matching-section image record

| Item | Detail |
| --- | --- |
| **Why added / replaced** | Stakeholder request: week-view screenshot did not illustrate terminal user ID → employee matching. |
| **Final asset** | Cropped matching UI approved by stakeholder: `zkteco-staff-matching.webp` / `.png` |
| **Dimensions** | 1024 × 755 |
| **File sizes** | WebP ≈ 36 KB; PNG ≈ 386 KB |
| **Caption intent** | Map unmatched terminal user IDs to employees / Device user ID fields |
| **Prior attempt** | An earlier full-frame generated matching mock was superseded by the cropped version; do not restore the week-view screenshot here. |

No compatibility matrices or certification badges were added. Setup remains a checklist panel rather than a fabricated Add Device screenshot.

---

## 14a. Mobile setup-checklist fix (July 2026)

### Root cause

`.setup-list span` applied the number-badge rules (`width/height: 28px`, `flex: 0 0 auto`, grid centering) to **both** the step number and the step text. On narrow viewports the text was forced into a 28px-wide box, which clipped and overflowed while empty space remained in the card.

### Fix

- Number badge uses `.setup-num` only.
- Step copy uses `.setup-text` with `flex: 1 1 auto`, `min-width: 0`, and normal wrapping.
- Checklist items and panel use `min-width: 0` and `height: auto`.
- Mobile (`max-width: 560px`) tightens panel/list padding without truncating text.
- Desktop two-column `.setup-panel` from `620px` is unchanged.

### Viewports tested (local static server)

320, 375, 400, 480, 768, 1024, 1440 — checklist fully visible, no clipping/overlap, no horizontal page overflow, limits section starts below setup.

### Prior record correction

Earlier §14 described the hero only briefly and did not document provenance, social-image use, or the mobile checklist defect. This section corrects that.

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
- Setup checklist readable at ~400px with no overflow into the limits section
- Hero image loads via WebP with PNG fallback and remains in-frame on mobile
