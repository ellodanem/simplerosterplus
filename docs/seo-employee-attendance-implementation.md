# Employee Attendance Landing Page Implementation

**Implemented:** July 17, 2026  
**Target URL:** `https://www.simplerosterplus.com/employee-attendance-software`  
**Source brief:** `docs/seo-employee-attendance-page-brief.md`

## 1. Files changed

- `landing-page/employee-attendance-software/index.html`
  - New directory-based attendance landing page.
  - Includes page-specific metadata, commercial copy, responsive design, FAQ, CTA links, and structured data.
- `landing-page/index.html`
  - Added a contextual attendance-page link in the attendance feature.
  - Added Employee attendance to the homepage footer.
- `landing-page/employee-scheduling-software/index.html`
  - Added a contextual attendance-page link in the roster-to-attendance section.
  - Added accessible link styling for that dark-green section.
- `landing-page/sitemap.xml`
  - Added the canonical attendance-page URL.
- `docs/seo-employee-attendance-implementation.md`
  - This implementation record and production checklist.

No application functionality, pricing source, framework, CMS, or product image was changed.

## 2. Final metadata, H1, and canonical

- **Title:** `Employee Attendance Software Connected to Your Roster | Simple Roster Plus`
- **Meta description:** `Compare scheduled shifts with employee attendance, review late and absent status, correct punches and prepare worked-time summaries for payroll handoff.`
- **H1:** `Employee Attendance Software That Shows What Actually Happened`
- **Canonical:** `https://www.simplerosterplus.com/employee-attendance-software`
- **Robots:** `index, follow`

Open Graph and Twitter metadata use aligned page copy, the canonical URL, and the existing absolute attendance screenshot URL.

## 3. Page structure

1. Hero
2. The attendance problem: a punch without the plan is incomplete
3. See scheduled, present, late, and absent
4. Review the week against the roster
5. Add punches manually or connect a supported device
6. Correct attendance records and recover unmatched punches
7. Review worked time and prepare a payroll handoff
8. Product fit and pricing
9. FAQ
10. Closing CTA

The page uses one H1, semantic H2/H3 headings, an accessible skip link, visible focus styles, touch-sized controls, and responsive layouts.

## 4. Product claims used

The page states that Simple Roster Plus supports:

- Scheduled, present, late, and absent attendance states
- Expected shift times from the weekly roster
- Manual in-and-out punches and optional notes
- Supported ZKTeco ADMS ATTLOG punches
- An organization-level grace period
- Late-minute calculation
- Punch corrections with the first original time retained
- Manual present/absent day overrides with context
- Weekly attendance views and individual staff reports
- Worked-time calculations from completed in/out pairs
- Pay-period summaries, CSV download, and print output
- Device-user matching
- Retention and later mapping of unmatched device punches
- Filed pay-period date locking

The page describes the attendance comparison as expected shifts, actual punches, and status—not complete scheduled-hours reconciliation.

## 5. Claims deliberately excluded

The page does not claim:

- Guaranteed real-time or live-streaming attendance
- Payroll processing, tax calculation, or payslip generation
- Payroll-vendor integrations or vendor-specific files
- Native mobile apps or employee phone clock-in
- GPS or geofenced attendance
- Universal ZKTeco compatibility
- Included biometric hardware
- Automatic early-departure detection
- Automatic missed-punch repair
- Universal overnight-shift reconciliation
- Automated attendance notifications
- Complete or immutable audit history
- Labor-law compliance
- A unified multi-location attendance dashboard
- Unlimited attendance history
- Project, job-costing, or billable-time tracking

Unsupported features appear only in transparent FAQ answers or explicit scope clarifications, not as product claims.

## 6. Device wording used

Primary wording:

> Supported ZKTeco terminals can send compatible ATTLOG punches using ADMS push.

Qualification:

> Compatibility depends on the terminal model, firmware, and configuration.

The page also clarifies that device slots provide software connectivity and do not include physical biometric hardware.

No device models are listed. Pull TCP is not presented as available, and device setup does not dominate the page.

## 7. Payroll wording used

The page explains that:

- Worked time is calculated from completed in/out pairs.
- Incomplete or irregular sequences may require correction.
- Managers can prepare an Extract Pay Period summary.
- Pay-period summaries can be downloaded as CSV or printed.
- The output is for payroll handoff.
- Simple Roster Plus does not process payroll.

The CSV is not described as a native Excel file or a vendor-ready payroll export.

## 8. Internal links added

The new page includes links to:

- Homepage `/` using `employee roster software`
- Scheduling page `/employee-scheduling-software` using `employee scheduling software`
- Pricing `/#pricing`
- Privacy `/privacy.html`
- Terms `/terms.html`
- Absolute signup, demo, and login URLs on `https://app.simplerosterplus.com`

Existing pages now include:

- Homepage attendance feature → `/employee-attendance-software`
- Homepage footer → `/employee-attendance-software`
- Scheduling page attendance section → `/employee-attendance-software`

No unpublished ZKTeco integration link was added.

## 9. Sitemap update

`landing-page/sitemap.xml` now includes:

```xml
<url>
  <loc>https://www.simplerosterplus.com/employee-attendance-software</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

## 10. Structured data added

The page contains one JSON-LD `@graph` with:

- `WebPage`
  - Stable page ID and canonical URL
  - Final title and description
  - `isPartOf` reference to `https://www.simplerosterplus.com/#website`
  - `about` reference to `https://www.simplerosterplus.com/#software`
  - Breadcrumb reference
- `BreadcrumbList`
  - Home
  - Employee Attendance Software

No duplicate `SoftwareApplication`, ratings, reviews, compliance certification, hardware offer, or `FAQPage` schema was added.

## 11. Screenshots used

The page reuses the existing attendance screenshot:

- WebP:
  - `landing-page/images/solution-attendance.webp`
  - `landing-page/images/solution-attendance@2x.webp`
- PNG fallback:
  - `landing-page/images/solution-attendance.png`
  - `landing-page/images/solution-attendance@2x.png`
- Preserved base dimensions: `1536 × 1024`

The screenshot was inspected before implementation. Its visible planned shifts and on-time, late, absent, and scheduled labels remain a reasonable representation of the current roster-connected attendance behavior.

No new or invented product screenshots were created. The roster screenshot was not repeated on this page.

## 12. Validation completed locally

- The directory route redirected once to its trailing-slash form in Python's static server, then returned `200`.
- All four attendance screenshot variants returned `200`.
- The page contains exactly one H1.
- Canonical, title, homepage link, scheduling-page link, and sitemap URL were present.
- JSON-LD parsed successfully with `WebPage` and `BreadcrumbList` nodes.
- No localhost, staging, `vercel.app`, or unpublished ZKTeco-page URL appears in page source.
- Absolute signup, demo, and login URLs exist in raw HTML.
- IDE diagnostics reported no errors in the changed marketing files.
- Desktop, narrow, and full-page layouts were rendered in a headless browser and visually reviewed.

## 13. Manual production checks

Complete after deployment:

- [ ] `https://www.simplerosterplus.com/employee-attendance-software` returns `200`.
- [ ] The canonical is the exact extensionless `www` URL.
- [ ] No `.html` or `/index.html` version remains separately indexable.
- [ ] Title and meta description match the approved copy.
- [ ] The rendered page has exactly one H1.
- [ ] Homepage contextual and footer links work.
- [ ] The scheduling-page contextual link works and has sufficient contrast.
- [ ] The production sitemap includes the attendance URL.
- [ ] Signup, demo, and login links work with JavaScript disabled.
- [ ] WebP loads and PNG fallback remains available.
- [ ] Schema Markup Validator reports no structured-data syntax errors.
- [ ] No localhost, staging, or `vercel.app` URL appears in production HTML.
- [ ] No unsupported real-time, payroll, GPS, mobile, compliance, hardware, universal-device, or history claim appears.
- [ ] The attendance screenshot still matches production behavior.
- [ ] Header, hero, status cards, FAQ, pricing, and footer are checked on representative phone, tablet, and desktop widths.

The deployment platform's extensionless route behavior remains a production verification item. The directory-based `index.html` pattern mirrors the existing scheduling page and avoids relying on a flat-file rewrite.
