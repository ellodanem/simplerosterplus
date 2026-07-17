# Employee Scheduling Landing Page Implementation

**Implemented:** July 16, 2026  
**Target URL:** `https://www.simplerosterplus.com/employee-scheduling-software`  
**Source:** `docs/seo-employee-scheduling-page-brief.md`

## 1. Files changed

- `landing-page/employee-scheduling-software/index.html`
  - New extensionless-directory landing page.
  - Contains page-specific metadata, commercial copy, responsive styles, CTAs, FAQ, and structured data.
- `landing-page/index.html`
  - Added a contextual scheduling-page link in the weekly-roster feature.
  - Added Employee scheduling to the footer.
- `landing-page/sitemap.xml`
  - Added the canonical employee scheduling URL.
- `docs/seo-employee-scheduling-implementation.md`
  - This implementation record and deployment checklist.

No application functionality, framework, CMS, pricing source, or product image was changed.

## 2. Final metadata and H1

- **Title:** `Employee Scheduling Software for Small Teams | Simple Roster Plus`
- **Meta description:** `Create weekly employee schedules, assign reusable shifts, manage approved time off and publish a clear staff roster with Simple Roster Plus.`
- **Canonical:** `https://www.simplerosterplus.com/employee-scheduling-software`
- **Robots:** `index, follow`
- **H1:** `Employee Scheduling Software That Keeps Every Shift Clear`

Open Graph and Twitter fields use aligned titles/descriptions, the canonical page URL, and the existing absolute roster-image URL.

## 3. Page section structure

1. Hero
2. The weekly scheduling problem
3. Build the weekly roster
4. Reuse shift presets and copy last week
5. Schedule around approved time off
6. Review the week before publishing
7. Publish and share one roster
8. Connect scheduling to attendance
9. Pricing and product fit
10. FAQ
11. Closing CTA

The page uses one H1, semantic H2/H3 headings, accessible skip navigation, visible keyboard focus, touch-sized buttons, and responsive single-column layouts at narrow widths.

## 4. Product claims used

The page states that Simple Roster Plus supports:

- Weekly, location-specific roster creation
- Employee shift assignment
- Applying one shift across an employee's editable week
- Reusable shift presets with names, start/end times, unpaid breaks, and colors
- Copying eligible shifts from the previous week
- Visibility and blocking for approved vacation, approved days off, and closed holidays
- Draft and published roster states
- A warning for unassigned staff-days before publishing
- Published read-only full-roster links
- Print-ready views and PNG roster downloads
- Manual roster sharing
- Attendance comparison using scheduled, present, late, and absent status

The multiple-location FAQ explicitly says the product does not present every location in one combined scheduling view.

## 5. Claims deliberately excluded

The page does not claim:

- Automatic schedule generation or currently available Auto Scheduler
- Shift swaps
- Employee-managed recurring availability
- Native mobile apps
- Automated SMS publishing
- Automatic notifications for every roster change
- Drag-and-drop scheduling
- Multiple shifts per employee per day
- Unified multi-location or department-based scheduling
- Labor-demand forecasting
- Employee claiming of open shifts
- Complete schedule audit history
- Payroll automation
- Universal conflict prevention
- A personalized authenticated employee schedule portal

Auto Scheduler appears only in one FAQ answer and is described as **coming soon**.

## 6. Internal links added

The new page includes:

- Homepage link using `employee roster software`
- Pricing link to `/#pricing`
- Privacy link to `/privacy.html`
- Terms link to `/terms.html`
- Absolute signup, demo, and login links on `https://app.simplerosterplus.com`

The homepage includes:

- Contextual `employee scheduling software` link in the scheduling feature
- `Employee scheduling` footer link

No unpublished attendance or ZKTeco page links were added.

## 7. Sitemap update

`landing-page/sitemap.xml` now includes:

```xml
<url>
  <loc>https://www.simplerosterplus.com/employee-scheduling-software</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
</url>
```

## 8. Structured data

The page includes one JSON-LD `@graph` with:

- `WebPage`
  - Uses the canonical URL and final meta description.
  - References `https://www.simplerosterplus.com/#website`.
  - References the existing product entity at `https://www.simplerosterplus.com/#software`.
- `BreadcrumbList`
  - Home
  - Employee Scheduling Software

No duplicate `SoftwareApplication` or `FAQPage` entity was added.

## 9. Screenshots used

The page reuses the existing roster screenshot:

- Preferred WebP: `landing-page/images/app-roster-week.webp`
- PNG fallback: `landing-page/images/app-roster-week.png`
- Preserved dimensions: `1400 × 900`

The roster image appears in the hero and weekly-roster section with descriptive scheduling-focused alt text. No new or invented product screenshots were created.

## 10. Validation completed locally

- The directory route redirected once to its trailing-slash form in Python's local static server, then returned `200`.
- WebP and PNG assets both returned `200`.
- The page contains exactly one H1.
- Canonical, title, homepage link, and sitemap URL were present.
- JSON-LD parsed successfully with `WebPage` and `BreadcrumbList` nodes.
- No localhost, staging, `vercel.app`, attendance-page, or ZKTeco-page URL appears in the page source.
- Auto Scheduler appears only as `coming soon`.
- Desktop and narrow layouts were rendered in a headless browser and visually reviewed.
- IDE diagnostics reported no errors in the changed marketing files.

## 11. Manual production checks

Complete after deployment:

- [ ] `https://www.simplerosterplus.com/employee-scheduling-software` returns `200`.
- [ ] The route has no redirect loop.
- [ ] No duplicate indexable `.html` URL exists.
- [ ] The canonical is the exact extensionless URL.
- [ ] The page appears in the production sitemap.
- [ ] Homepage contextual and footer links work.
- [ ] Signup and demo links work with JavaScript disabled.
- [ ] Rich Results Test or Schema Markup Validator reports no structured-data syntax errors.
- [ ] WebP loads and the PNG fallback remains available.
- [ ] No localhost, staging, or `vercel.app` URL appears in production HTML.
- [ ] The rendered page has one H1.
- [ ] Auto Scheduler is described only as coming soon.
- [ ] Header, hero, FAQ, pricing, and footer are checked on representative phone, tablet, and desktop widths.

The deployment platform's extensionless route behavior remains a production verification item. The directory-based `index.html` layout was selected specifically to support the requested extensionless public URL without relying on an unverified flat-file rewrite.
