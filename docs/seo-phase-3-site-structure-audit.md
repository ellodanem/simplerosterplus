# Phase 3 — Site Structure and Internal Linking Audit

**Audit date:** 24 July 2026  
**Scope:** Static marketing site under `landing-page/`  
**Method:** Repository inspection of homepage, six commercial pages, sitemap, robots, vercel config, and SEO verification runner  
**Constraint:** Audit only — no implementation changes in this task  

**Canonical host:** `https://www.simplerosterplus.com`  
**App host:** `https://app.simplerosterplus.com`

---

## 1. Executive summary

Phase 2 left Simple Roster Plus with a coherent flat commercial URL set, consistent page-level breadcrumbs and `WebPage` + `BreadcrumbList` schema, a complete sitemap for all indexable commercial URLs, and usable homepage + footer discovery for every Phase 2 page.

Phase 3 work that already happened incrementally is **real but uneven**. The highest-value gaps are not broken crawl fundamentals; they are **consistency and graph quality**:

1. **Footer drift** — commercial footers differ by page; several older pages omit newer commercial destinations.
2. **Contextual link gaps** — some strongly related pairs rely on footer-only discovery (especially homepage → leave / time clock; attendance ↔ leave; SMB → leave / time clock).
3. **SEO verification runner coverage** — only two of six commercial pages (plus no homepage) are configured in `scripts/seo/page-configs.mjs`.
4. **Maintainability risk** — duplicated header/footer/CSS across ~1k-line HTML files already caused footer inconsistency; a full framework migration is still disproportionate, but a lightweight shared-footer approach is justified soon.

**No P0 critical crawl blockers** were found in the repository for the six commercial pages (canonicals, index/follow, sitemap presence, breadcrumb schema, and homepage footer reachability all look sound).

**Overall Phase 3 assessment:** Proceed with a focused implementation plan. Do **not** restructure URLs, merge pages, or put every SEO page in the main header.

---

## 2. Current site architecture

```text
https://www.simplerosterplus.com/
├── /                                 Homepage (employee roster software)
├── /employee-scheduling-software
├── /small-business-employee-scheduling
├── /employee-leave-and-availability
├── /employee-attendance-software
├── /employee-time-clock-app
├── /zkteco-attendance-integration
├── /privacy                          noindex (paused legal)
└── /terms                            noindex (paused legal)
```

**Routing:** `landing-page/vercel.json` uses `cleanUrls: true` and `trailingSlash: false`.

**Shape:** Flat commercial URLs under the marketing host. No nested `/solutions/...` hierarchy.

**Default bias confirmed:** Keep flat URLs. Nested restructuring would create redirect/indexing cost without clear hierarchy gain.

---

## 3. Commercial-page inventory

| Page | File | Indexable | In sitemap | SEO runner config |
|------|------|-----------|------------|-------------------|
| Homepage | `landing-page/index.html` | Yes (`index, follow`) | Yes | No |
| Scheduling | `landing-page/employee-scheduling-software/index.html` | Yes | Yes | No |
| SMB scheduling | `landing-page/small-business-employee-scheduling/index.html` | Yes | Yes | No |
| Leave | `landing-page/employee-leave-and-availability/index.html` | Yes | Yes | Yes |
| Attendance | `landing-page/employee-attendance-software/index.html` | Yes | Yes | No |
| Time clock | `landing-page/employee-time-clock-app/index.html` | Yes | Yes | Yes |
| ZKTeco | `landing-page/zkteco-attendance-integration/index.html` | Yes | Yes | No |
| Privacy | `landing-page/privacy.html` | `noindex, follow` | No | N/A |
| Terms | `landing-page/terms.html` | `noindex, follow` | No | N/A |

Evidence: robots meta and canonicals in each page `<head>`; sitemap in `landing-page/sitemap.xml`; configs in `scripts/seo/page-configs.mjs`.

---

## 4. Page ownership map

| URL | Owns | Must not absorb |
|-----|------|-----------------|
| `/employee-scheduling-software` | Build / edit / copy / publish weekly roster | Attendance review depth; device protocol |
| `/employee-attendance-software` | Plan-versus-actual review; present/late/absent; corrections | Full ADMS setup; “time clock app” qualification |
| `/zkteco-attendance-integration` | ADMS push, pairing, compatibility limits | Broader attendance product story |
| `/small-business-employee-scheduling` | SMB fit, plans, setup expectations | Feature depth owned by scheduling/attendance |
| `/employee-leave-and-availability` | Manager leave + soft preferences | Accrual/self-service HR leave |
| `/employee-time-clock-app` | Punch entry paths, matching, unmatched recovery, app-keyword qualification | Mobile employee clock-in; payroll sync |
| `/` | Category + conversion + overview | Becoming a keyword directory |

Do **not** merge attendance with time clock or attendance with ZKTeco. Related ≠ duplicate intent.

---

## 5. Header audit

### Pattern

Commercial pages use a **page-local** sticky header:

- Logo → `/`
- In-page section anchors (How it works / FAQ / etc.)
- Log in → `https://app.simplerosterplus.com/login`
- Start Free → `https://app.simplerosterplus.com/sign-up`

Evidence examples:

- Scheduling header nav: `#workflow`, `#share`, `#pricing` — `landing-page/employee-scheduling-software/index.html` ~590–597
- Leave header nav: `#record`, `#approve`, `#preferences`, `#faq` — leave page ~616–624
- Time clock header nav: `#capture`, `#match`, `#review`, `#faq` — time-clock page ~757–764

Homepage header differs (Gate 1): primary CTA often points to `#contact` lead capture, with signup CTAs also present in body — `landing-page/index.html` ~819–820, ~833.

### Findings

| Finding | Priority | Notes |
|---------|----------|-------|
| Headers do **not** list commercial siblings | OK / do not change | Correct — avoids overcrowding |
| Mobile hides in-page header links | P2 | `.header-nav > a:not(.btn) { display: none; }` at `max-width: 820px` on commercial pages; no hamburger replacement |
| Mobile also hides Log in ghost button | P2 | `.header-actions .btn-ghost { display: none; }` at ≤560px — Start Free remains |
| No Product/Solutions mega-menu | OK | Footer + homepage + contextual links can carry discovery |

**Recommendation:** Do **not** add all six SEO pages to the main header. Optionally later: a compact mobile overflow menu for in-page anchors + Log in (P2 accessibility).

---

## 6. Footer audit

### Footer commercial coverage matrix

| Page footer source | Scheduling | Leave | Attendance | Time clock | ZKTeco | SMB | Pricing |
|--------------------|------------|-------|------------|------------|--------|-----|---------|
| Homepage | Yes | Yes | Yes | Yes | Yes | Yes | Yes (`#pricing`) |
| Leave | Yes | Yes (current) | Yes | Yes | **No** | Yes | Yes |
| Time clock | Yes | Yes | Yes | Yes (current) | Yes | Yes | Yes |
| Scheduling | **No*** | Yes | **No** | **No** | **No** | Yes | Yes |
| Attendance | Yes | **No** | **No*** | **No** | **No** | **No** | Yes |
| ZKTeco | Yes | **No** | Yes | **No** | **No*** | **No** | Yes |
| SMB | Yes | **No** | Yes | **No** | Yes | **No*** | Yes |

\*Self-link often omitted; that is fine. Missing **sibling** commercial links are the problem.

Evidence anchors:

- Full-ish footers: `landing-page/index.html` ~1275–1282; leave ~971–977; time clock ~1185–1192
- Thin footers: attendance ~975–977; scheduling ~946–949; ZKTeco ~969–972; SMB ~971–975

### Findings

| Finding | Priority |
|---------|----------|
| Footer sets drifted as Phase 2 pages shipped | **P1** |
| Homepage footer is the best “source of truth” commercial list | Use as model |
| `aria-current="page"` only on some footers (leave, time clock) | P2 |
| Legal links remain present and subordinate (privacy/terms) | Keep while paused |

**Recommendation:** Standardize one commercial footer fragment across homepage + six commercial pages (Batch 2).

---

## 7. Breadcrumb audit

| Page | Visible crumb | JSON-LD current name | Schema types |
|------|---------------|----------------------|--------------|
| Scheduling | Home / Employee scheduling software | Employee Scheduling Software | WebPage + BreadcrumbList |
| SMB | Home / Small business employee scheduling | Employee Scheduling for Small Business | WebPage + BreadcrumbList |
| Leave | Home / Employee leave and availability | Employee Leave and Availability | WebPage + BreadcrumbList |
| Attendance | Home / Employee attendance software | Employee Attendance Software | WebPage + BreadcrumbList |
| Time clock | Home / Employee time clock | Employee Time Clock | WebPage + BreadcrumbList |
| ZKTeco | Home / ZKTeco attendance integration | ZKTeco Attendance Integration | WebPage + BreadcrumbList |

**Assessment:** Present and consistent in structure. Visible labels are sentence-case; JSON-LD names are Title Case — harmless. Home link always `/`. Current page is not linked in the visible crumb (text only) — acceptable.

**No missing breadcrumb on commercial pages.** Homepage correctly has none.

**Priority:** P3 cleanup only if wanting exact visible/schema label parity.

---

## 8. Homepage pathway audit

### What works

- Clear category positioning (employee roster / schedule / attendance) — title and H1 in `landing-page/index.html` ~6, ~830
- Body links to scheduling, attendance, ZKTeco, SMB (features/pricing/FAQ regions ~950–975, ~1133, ~1163)
- Footer links to **all six** commercial pages (~1277–1282)
- Organization / WebSite / SoftwareApplication JSON-LD on homepage (~31–81)

### Gaps

| Gap | Priority |
|-----|----------|
| No **body** contextual link to `/employee-leave-and-availability` | **P1** |
| No **body** contextual link to `/employee-time-clock-app` | **P1** |
| Homepage Start Free in header often `#contact` while commercial pages use `/sign-up` | OK (Gate 1) — document, don’t “fix” unless strategy changes |

**Recommendation:** Add one natural leave mention (roster blocking / time off) and one natural time-clock / punch-capture mention in existing feature sections — not a link farm.

---

## 9. Internal-link graph

### Page-level summary

| Page | Homepage link | Header commercial | Footer commercial siblings | Breadcrumb | Contextual inbound | Contextual outbound | Risk |
|------|---------------|-------------------|----------------------------|------------|--------------------|---------------------|------|
| Home | — | No | Full set | No | N/A | Sched, Attn, ZKTeco, SMB (+ footer all) | Low (add leave/time-clock body) |
| Scheduling | Footer + body | No | Partial | Yes | Leave, Attn, SMB, Time clock, Home | Leave, Attn, Time clock, SMB, Home | Medium footer gap |
| SMB | Footer + body | No | Partial | Yes | Leave, Sched, Time clock, Home | Sched, Attn, ZKTeco, Home | Medium (missing leave/time-clock out) |
| Leave | Footer only (body) | No | Near-full (no ZKTeco) | Yes | Sched FAQ/body | Sched, Attn, SMB | Low–medium |
| Attendance | Footer + body | No | Thin | Yes | Sched, ZKTeco, Time clock, SMB, Leave | Sched, ZKTeco, Time clock | Medium footer + leave gap |
| Time clock | Footer only (body) | No | Full | Yes | Attn, ZKTeco, Sched | ZKTeco, Attn, Sched, Leave, SMB | Low |
| ZKTeco | Footer + body | No | Partial | Yes | Home, Attn, Time clock, SMB | Attn, Time clock, Home | Medium (missing leave/time-clock footer) |

### Contextual link table (non-footer, non-breadcrumb)

| Source page | Target page | Link type | Current anchor | Context | Assessment |
|-------------|-------------|-----------|----------------|---------|------------|
| Home | Scheduling | Contextual | employee scheduling software | Features | Strong |
| Home | Attendance | Contextual | employee attendance software | Features | Strong |
| Home | ZKTeco | Contextual | Supports selected ZKTeco terminals / ADMS push / ZKTeco attendance integration | Hero/features/FAQ | Strong |
| Home | SMB | Contextual | employee scheduling software for small business | Pricing | Strong |
| Home | Leave | — | — | — | **Missing body link** |
| Home | Time clock | — | — | — | **Missing body link** |
| Scheduling | Leave | Contextual | See leave and availability → / employee leave and availability | Mid-page + FAQ | Strong |
| Scheduling | Attendance | Contextual | employee attendance software | Attendance handoff | Strong |
| Scheduling | Time clock | Contextual | clock events enter the system | Attendance handoff | Strong |
| Scheduling | SMB | Contextual | employee scheduling software for small business | Pricing note | Strong |
| Scheduling | ZKTeco | — | — | — | Optional; not required |
| SMB | Scheduling | Contextual | See the full employee scheduling workflow → | Mid-page | Strong |
| SMB | Attendance | Contextual | employee attendance software | Fit | Strong |
| SMB | ZKTeco | Contextual | ZKTeco attendance integration | Fit | Strong |
| SMB | Leave | — | — | — | **Missing** |
| SMB | Time clock | — | — | — | **Missing** |
| Leave | Scheduling | Contextual | See how weekly scheduling works → / employee scheduling software | Mid + later | Strong |
| Leave | Attendance | Contextual | employee attendance software | After publish | Strong |
| Leave | SMB | Contextual | employee scheduling software for small business | Fit | Strong |
| Leave | Time clock | — | — | — | Optional |
| Leave | ZKTeco | — | — | — | Optional |
| Attendance | Scheduling | Contextual | See how employee scheduling software creates the weekly plan → | Week review | Strong |
| Attendance | ZKTeco | Contextual | ZKTeco attendance integration | Capture + FAQ | Strong |
| Attendance | Time clock | Contextual | employee time clock workflow | Capture note | Strong |
| Attendance | Leave | — | — | — | **Missing** (leave-backed states) |
| Attendance | SMB | — | — | — | Optional via pricing/home |
| Time clock | ZKTeco | Contextual | ZKTeco attendance integration / See ZKTeco ADMS setup… | Capture + match | Strong |
| Time clock | Attendance | Contextual | Explore employee attendance software → | Review | Strong |
| Time clock | Scheduling | Contextual | employee scheduling software | Review note | Strong |
| Time clock | Leave | Contextual | employee leave and availability | Review note | Strong |
| Time clock | SMB | Contextual | employee scheduling software for small business | Fit | Strong |
| ZKTeco | Attendance | Contextual | See how employee attendance software reviews… | Matching | Strong |
| ZKTeco | Time clock | Contextual | See how clock events enter and get matched → | Matching | Strong |
| ZKTeco | Home | Contextual | employee roster software | Fit card | OK |
| ZKTeco | Scheduling | Footer only | Employee scheduling software | Footer | Prefer optional contextual |

Footer-only links are **not** treated as sufficient substitutes for the missing contextual rows marked above.

---

## 10. Anchor-text audit

### Preferred anchor families (do not force one exact phrase)

| Destination | Preferred family |
|-------------|------------------|
| Scheduling | employee scheduling software; weekly scheduling; staff roster workflow |
| Attendance | employee attendance software; plan versus actual; present/late/absent review |
| Time clock | clock events; employee time clock workflow; how punches enter |
| ZKTeco | ZKTeco attendance integration; ADMS push; supported ZKTeco terminals |
| Leave | leave and availability; approved time off on the roster |
| SMB | scheduling for small business; small-business fit / plans |

### Observations

- Exact-match density is generally moderate and natural.
- Few generic “learn more” traps; arrows like “See … →” are descriptive enough.
- Time-clock page correctly avoids “mobile time clock app” as a positive claim.
- Risk of blur: using “attendance” anchors for time-clock destinations or “ZKTeco software” for attendance destinations — current links mostly avoid this.

**Priority:** P2 refine only where Batch 2 adds new links.

---

## 11. Orphan-page and crawl-depth findings

| Check | Result |
|-------|--------|
| Indexable commercial orphans | **None** — all six appear in homepage footer and sitemap |
| Crawl depth from homepage | **1 click** via footer for all; **1 click** via body for scheduling/attendance/ZKTeco/SMB |
| Leave / time clock body depth | Effectively **footer-primary** from homepage → treat as underlinked, not orphan |
| Privacy/terms | Intentionally noindex; linked from footers; correctly absent from sitemap |

**No P0 orphan issues.**

---

## 12. Keyword cannibalization assessment

| Page pair | Overlapping terms | Distinct intent | Risk level | Recommendation |
|-----------|-------------------|-----------------|------------|----------------|
| Homepage vs scheduling | roster, weekly schedule, staff | Home = category + conversion; Scheduling = how to build/publish | **Minor** | Keep; reinforce scheduling depth on child page |
| Scheduling vs SMB scheduling | employee scheduling software | Scheduling = workflow; SMB = fit/plans/limits | **Moderate** (intentional) | Keep both; ensure SMB stays plan/fit-led; scheduling stays feature-led |
| Attendance vs time clock | punches, clock-in, roster comparison | Attendance = review outcomes; Time clock = capture + app-keyword qualification | **Moderate** | Keep ownership fences; internal links should clarify “review” vs “enter” |
| Attendance vs ZKTeco | ZKTeco, punches, attendance | Attendance = product review; ZKTeco = protocol/setup | **Minor** | Keep; already well linked |
| Time clock vs ZKTeco | ZKTeco, matching, punches | Time clock = capture story; ZKTeco = device integration | **Minor** | Keep; already linked both ways contextually |
| Scheduling vs leave | time off, roster cells | Scheduling = assign week; Leave = record/approve leave | **No meaningful risk** | Keep |
| Attendance vs leave | vacation/sick on grid | Attendance consumes leave states; Leave owns recording | **No meaningful risk** | Add one attendance→leave contextual link |

Titles/H1s inspected are differentiated enough that **no high-risk cannibalization** was found. Do not merge pages for overlap of shared vocabulary.

---

## 13. Metadata and canonical audit

| Page | Title | Canonical matches OG URL | Robots |
|------|-------|--------------------------|--------|
| Home | Employee Roster Software for Small Teams \| Simple Roster Plus | Yes (`/`) | index, follow |
| Scheduling | Employee Scheduling Software for Small Teams \| … | Yes | index, follow |
| SMB | Employee Scheduling Software for Small Business \| … | Yes | index, follow |
| Leave | Employee Leave and Availability Software \| … | Yes | index, follow |
| Attendance | Employee Attendance Software Connected to Your Roster \| … | Yes | index, follow |
| Time clock | Employee Time Clock Software for Scheduled Teams \| … | Yes | index, follow |
| ZKTeco | ZKTeco Attendance Integration \| … | Yes | index, follow |

**Findings:**

- No duplicate titles across indexable pages.
- Descriptions are distinct; attendance vs time clock both mention punches but with different verbs (compare/review vs record/match).
- Branding suffix `| Simple Roster Plus` is consistent on commercial titles.
- No unexpected commercial `noindex`.
- Homepage JS may rewrite canonical to `siteUrl + "/"` at runtime (`landing-page/index.html` ~1306–1307) — still www canonical; low risk.

**No P0 metadata defects found.**

---

## 14. Structured-data audit

| Location | Types | Notes |
|----------|-------|-------|
| Homepage | Organization, WebSite, SoftwareApplication | Site-level entities; `#software` / `#website` IDs referenced by commercial WebPage `about` / `isPartOf` |
| Each commercial page | WebPage + BreadcrumbList | Consistent pattern |
| FAQ sections | Visible `<details>` FAQs | **No `FAQPage` schema** on any page |

**Assessment:**

- Not emitting `FAQPage` is acceptable if strategy prefers avoiding FAQ rich results until answers are frozen; Rich Results currently validates Breadcrumbs (observed in production for time-clock).
- Do **not** add MobileApplication / payroll / biometric schema.
- Do **not** add schema merely for quantity.
- Optional later: homepage `SoftwareApplication` description could mention leave/time-clock lightly — P3 only.

---

## 15. Sitemap and robots audit

**Sitemap** (`landing-page/sitemap.xml`):

- Contains home + all six commercial URLs exactly once
- HTTPS + www
- No trailing-slash or `/index.html` duplicates
- Privacy/terms correctly omitted

**Robots** (`landing-page/robots.txt`):

```text
User-agent: *
Allow: /
Sitemap: https://www.simplerosterplus.com/sitemap.xml
```

**Vercel:** clean URLs, no trailing slash — aligns with canonical policy.

**Priority:** No P0 sitemap issues. Optional `lastmod` remains unnecessary unless editorial process wants it (P3).

---

## 16. Template-consistency audit

| Area | Consistency | Notes |
|------|-------------|-------|
| Sticky header + CTAs | High | Same Gate 1 CTA destinations on commercial pages |
| Breadcrumbs | High | Same visual + schema pattern |
| Hero + proof strip | Medium–high | Shared visual language; section IDs differ by intent |
| FAQ `<details>` | High | Same interaction model |
| Inline CSS duplication | High duplication | Each page embeds large `<style>` block |
| Footer commercial set | **Low** | Drift is the clearest inconsistency |
| Homepage vs commercial CTA | Intentional | `#contact` vs `/sign-up` |

Differences that are **intentional and useful:** section content, ownership copy, screenshots, FAQ topics.  
Differences that are **inconsistent / risky:** footer link inventories, incomplete SEO runner configs.

---

## 17. Repeated-HTML and maintainability assessment

### Evidence of risk already materializing

Footer commercial lists diverged as pages launched. That is exactly the failure mode of copy-pasted HTML without a shared fragment.

### Is duplicated static HTML creating enough risk to justify shared-template tooling?

**Yes — enough for a lightweight fix; not enough for a framework migration.**

| Option | Verdict |
|--------|---------|
| Keep current static duplication | Acceptable short-term only if Batch 2 manually syncs footers and a checklist prevents drift |
| **Introduce lightweight shared-fragment generation** | **Recommended** — e.g. a small Node script that injects a standard footer (and optionally header chrome) into commercial HTML, or a single maintained `footer.partial.html` compiled before deploy |
| Introduce a small static-site generator | Possible later if page count grows past ~10–12 commercial URLs |
| Full framework migration | **Not recommended now** — disproportionate to SEO needs |

**Tradeoffs:** A fragment script adds a tiny build step but prevents the Phase 2 footer drift from repeating. An SSG adds conventions and CI complexity without ranking benefit by itself.

---

## 18. Mobile navigation and accessibility findings

| Topic | Finding | Priority |
|-------|---------|----------|
| Mobile section nav | Hidden at `max-width: 820px` without alternate menu | P2 |
| Log in on small screens | Often hidden; Start Free remains | P2 |
| FAQ controls | Native `<details>`/`<summary>` — keyboard accessible | OK |
| Breadcrumbs | Text remains; usable | OK |
| Focus styles | Buttons use `:focus-visible` patterns on commercial templates | OK |
| Horizontal overflow | Prior `seo:verify` runs on leave/time-clock passed viewport checks | Requires production verification for pages without runner configs |
| Reduced motion | Prefer-reduced-motion rules present on templates | OK |

No evidence of a hamburger/drawer implementation in repository CSS/JS.

---

## 19. SEO verification-runner coverage

**Docs:** `docs/seo-verification-runner.md`  
**Configs:** `scripts/seo/page-configs.mjs`  
**Scripts:** `npm run seo:check`, `npm run seo:verify`

| Page | Config present |
|------|----------------|
| Leave | Yes |
| Time clock | Yes |
| Scheduling | **No** |
| Attendance | **No** |
| ZKTeco | **No** |
| SMB | **No** |
| Homepage | **No** |

**Gaps (P1):** Add configs for the four missing commercial pages (title/H1/canonical/schema/required links from live HTML). Homepage optional as a thinner “generic URL” verify or dedicated config later (P2).

**CI:** Still correctly deferred until configs cover the full commercial set and several green runs exist.

**Noise:** WebP warnings when `<picture><source type="image/webp">` is used but `<img src>` is PNG — known; do not weaken pages for it (P3 runner tweak later).

---

## 20. Recommended Phase 3 implementation plan

### Batch 1 — Consistency foundations (P1)

1. Standardize commercial footer link set across homepage + six commercial pages (use homepage inventory as baseline; mark `aria-current` on current page).
2. Add SEO runner configs for scheduling, attendance, ZKTeco, SMB; run `seo:check` for each.
3. Confirm sitemap remains complete after any URL/label changes (should already be complete).

**Files likely affected:** six commercial HTML footers, optionally homepage footer order, `scripts/seo/page-configs.mjs`  
**Risk:** Low  
**Verify:** Visual footer check + `seo:check` per page

### Batch 2 — Internal-link structure (P1)

1. Homepage body: one leave pathway + one time-clock/punch-capture pathway.
2. Attendance → leave contextual link near leave-backed / vacation status discussion.
3. SMB → leave and time-clock contextual links in fit/workflow sections.
4. Optional: ZKTeco footer siblings; scheduling footer siblings (if not fully solved in Batch 1).
5. Light anchor-text pass on new links only.

**Files likely affected:** `landing-page/index.html`, attendance, SMB, possibly scheduling/ZKTeco  
**Risk:** Low if ownership fences respected  
**Verify:** Link graph re-check + `seo:check` requiredInternalLinks updates

### Batch 3 — Maintainability + mobile polish (P2)

1. Decide and implement lightweight shared-footer (or footer+header chrome) generation — **recommended**.
2. Optional mobile nav: expose Log in + FAQ/section jump without stuffing commercial links into header.
3. Optional runner improvement: detect WebP via `<source type="image/webp">`.
4. Optional homepage config for production verify.

**Risk:** Medium for fragment tooling (needs a clear “source of truth” and smoke test)  
**Verify:** Diff of generated footers identical across pages; one `seo:verify` smoke on a representative page

---

## 21. Changes not recommended

| Temptation | Recommendation |
|------------|----------------|
| Restructure to nested `/solutions/...` URLs | **Reject** — migration cost > benefit |
| Put all six commercial pages in main header | **Reject** — overcrowds; footer/home/contextual suffice |
| Merge attendance + time clock | **Reject** — distinct intents |
| Merge attendance + ZKTeco | **Reject** — distinct intents |
| Merge scheduling + SMB | **Reject** — intentional SMB angle |
| Full Next.js/Astro marketing migration now | **Reject** — disproportionate |
| Add FAQPage everywhere immediately | **Defer** — only with intentional rich-result strategy |
| Add excessive schema / MobileApplication | **Reject** |
| Automate Search Console indexing API | **Reject** |
| Resume legal/privacy during Phase 3 | **Reject** unless explicitly unpaused |
| Broad copy rewrites for “Phase 3” | **Reject** — structure first |

---

## 22. Production validation plan

After Batch 1–2 deploy:

1. Spot-check each commercial URL: 200, title, canonical, footer siblings.
2. Click every new contextual link.
3. Run:
   - `npm run seo:check` (all configured pages)
   - `npm run seo:verify -- <page-key>` for at least attendance + scheduling + time-clock
4. Mobile: 375px — Start Free visible; footer usable; no overflow.
5. Rich Results / URL Inspection sample on one updated page (Breadcrumbs).

---

## 23. Search Console follow-up plan

Manual (no API automation):

| Check | Purpose |
|-------|---------|
| Pages → indexing status for all seven indexable URLs | Submitted vs indexed |
| URL Inspection canonical selected | Confirm www clean URLs |
| Performance → Queries | Watch scheduling vs SMB overlap; attendance vs time clock |
| Enhancements → Breadcrumbs | Valid item counts |
| Coverage / Page indexing issues | Soft 404s, redirected, crawled not indexed |

Separate monitoring from structural implementation. Review query overlap after 2–4 weeks of impressions on the newer leave/time-clock URLs.

---

## 24. Final prioritized findings table

| ID | Finding | Priority | Evidence | Expected benefit | Files likely affected | Risk | Verification |
|----|---------|----------|----------|------------------|-----------------------|------|--------------|
| F1 | Footer commercial sets inconsistent across pages | **P1** | Attendance/scheduling/ZKTeco/SMB footers omit siblings; home/leave/time-clock fuller | Crawl equity + user discovery | All commercial HTML + home footer | Low | Manual footer matrix |
| F2 | SEO runner missing 4 commercial page configs | **P1** | `scripts/seo/page-configs.mjs` only leave + time-clock | Repeatable QA | `page-configs.mjs` | Low | `seo:check` |
| F3 | Homepage body lacks leave + time-clock pathways | **P1** | Home body grep: leave/time-clock only in footer | Better topical routing | `landing-page/index.html` | Low | Click path + crawl |
| F4 | Attendance lacks contextual link to leave | **P1** | No leave href in attendance body | Clarifies leave-backed statuses ownership | attendance `index.html` | Low | Link present |
| F5 | SMB lacks contextual links to leave + time clock | **P1** | SMB body links sched/attn/zkteco only | Completes SMB hub role | SMB `index.html` | Low | Link present |
| F6 | Mobile hides section nav + Log in without replacement menu | **P2** | CSS `display:none` rules on commercial pages | Access parity | Commercial CSS/HTML | Low–med | Mobile keyboard check |
| F7 | Duplicated HTML already caused footer drift | **P2** (actionable as Batch 3) | Footer matrix | Prevent recurrence | New fragment script + HTML | Med | Generated equality |
| F8 | No FAQPage schema | **P3** / defer | No FAQPage in repo HTML | Optional rich results | Commercial pages | Low | Rich Results Test |
| F9 | Breadcrumb visible vs JSON-LD label casing differs | **P3** | e.g. time clock visible vs schema name | Cosmetic consistency | Commercial JSON-LD/HTML | None | Visual |
| F10 | WebP runner warning noise | **P3** | `seo:check` WebP warn despite `<source type=webp>` | Cleaner CI signal later | `scripts/seo-check.mjs` | Low | Re-run check |
| F11 | Scheduling title vs SMB title closely related | Monitor | Both “Employee Scheduling Software for …” | Intent separation | Copy only if queries collide | Low | GSC queries |
| F12 | Flat URL architecture | **Keep** | Current sitemap + vercel | Avoid migration risk | None | — | — |

### Critical issues found

**None (P0).** No broken commercial canonicals, no indexable orphans, no accidental commercial `noindex`, no missing sitemap entries for Phase 2 pages.

### Highest-value internal-link improvements

1. Standardize footers  
2. Homepage body → leave + time clock  
3. Attendance → leave  
4. SMB → leave + time clock  

---

## Appendix A — Preferred commercial footer order (proposed)

Match homepage intent:

1. Employee roster software (`/`)  
2. Employee scheduling  
3. Leave and availability  
4. Small business scheduling  
5. Employee attendance  
6. Employee time clock  
7. ZKTeco integration  
8. Pricing (`/#pricing`)  
9. Privacy / Terms  
10. Log in / Start Free  

Mark current page with `aria-current="page"` where linked.

---

## Appendix B — Quality checklist

- [x] All six commercial pages inspected  
- [x] Homepage inspected  
- [x] Header, footer, breadcrumbs, metadata, schema, sitemap, robots inspected  
- [x] Internal-link graph produced  
- [x] Required cannibalization pairs assessed  
- [x] SEO runner + configs inspected  
- [x] Recommendations prioritized  
- [x] Implementation deferred (audit-only deliverable)  

---

*End of Phase 3 audit. Next step: review findings, then draft a separate implementation prompt for Batches 1–2 (and optionally 3).*
