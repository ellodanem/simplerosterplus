# SEO Clean-URL Follow-Up — Legal Pages

**Date:** 17 July 2026
**Context:** `landing-page/vercel.json` enables `cleanUrls: true` and `trailingSlash: false`.
**Goal:** Align legal-page canonicals and internal links with clean public URLs without indexing placeholder stubs.

---

## 1. Files changed

| Path | Change |
| --- | --- |
| `landing-page/privacy.html` | Canonical updated to clean `/privacy` URL. `noindex, follow` kept. Placeholder copy unchanged. |
| `landing-page/terms.html` | Canonical updated to clean `/terms` URL. `noindex, follow` kept. Placeholder copy unchanged. |
| `landing-page/index.html` | Footer legal links updated to `/privacy` and `/terms`. |
| `landing-page/employee-scheduling-software/index.html` | Footer legal links updated to `/privacy` and `/terms`. |
| `landing-page/employee-attendance-software/index.html` | Footer legal links updated to `/privacy` and `/terms`. |
| `docs/seo-clean-urls-follow-up.md` | This documentation record. |

**Unchanged on purpose**

- Source filenames remain `privacy.html` and `terms.html`.
- `landing-page/sitemap.xml` was not modified.
- Homepage, scheduling, and attendance page canonicals were not modified.
- No additional redirect rules were added beyond existing `vercel.json` `cleanUrls` / `trailingSlash` settings.
- Application functionality and pricing were not modified.

---

## 2. Legal canonical URLs

| Page | Old canonical | New canonical |
| --- | --- | --- |
| Privacy | `https://www.simplerosterplus.com/privacy.html` | `https://www.simplerosterplus.com/privacy` |
| Terms | `https://www.simplerosterplus.com/terms.html` | `https://www.simplerosterplus.com/terms` |

---

## 3. Internal legal links updated

Public footer links now use clean paths:

| File | Privacy link | Terms link |
| --- | --- | --- |
| `landing-page/index.html` | `/privacy` | `/terms` |
| `landing-page/employee-scheduling-software/index.html` | `/privacy` | `/terms` |
| `landing-page/employee-attendance-software/index.html` | `/privacy` | `/terms` |

Repository search confirmed no remaining public `href` values of:

- `privacy.html`
- `terms.html`
- `/privacy.html`
- `/terms.html`

Documentation and source-filename mentions may still say `privacy.html` / `terms.html`; those are not public navigation links.

---

## 4. Robots / noindex confirmation

Both legal pages still include:

```html
<meta name="robots" content="noindex, follow">
```

Placeholder legal content was not rewritten.

---

## 5. Sitemap confirmation

`landing-page/sitemap.xml` still lists only:

- `https://www.simplerosterplus.com/`
- `https://www.simplerosterplus.com/employee-scheduling-software`
- `https://www.simplerosterplus.com/employee-attendance-software`

`/privacy` and `/terms` were **not** added.

---

## 6. Production checks required

After deployment, verify headers:

```bat
curl.exe -I https://www.simplerosterplus.com/privacy
curl.exe -I https://www.simplerosterplus.com/privacy.html
curl.exe -I https://www.simplerosterplus.com/terms
curl.exe -I https://www.simplerosterplus.com/terms.html
```

Expected:

| URL | Expected result |
| --- | --- |
| `/privacy` | `200` |
| `/privacy.html` | `308` to `/privacy` |
| `/terms` | `200` |
| `/terms.html` | `308` to `/terms` |

Also inspect production source:

- `view-source:https://www.simplerosterplus.com/privacy`
- `view-source:https://www.simplerosterplus.com/terms`

Expected in source:

- Privacy canonical: `https://www.simplerosterplus.com/privacy`
- Terms canonical: `https://www.simplerosterplus.com/terms`
- Both still contain `noindex, follow`

Finally confirm homepage, scheduling, and attendance page source use footer links:

- `/privacy`
- `/terms`
