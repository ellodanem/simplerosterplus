# WhatsApp roster publish template (Twilio / Meta)

**Status:** Draft for approval (Jul 2026). Replaces legacy `weeklyroster` template, which has **no variables** and causes Twilio error **21658** when the app sends `ContentVariables`.

**Sender:** Simple Roster Plus — `+1 (561) 730-3361` (`whatsapp:+15617303361`)

**Related:** `lib/messaging/roster-whatsapp-notify.ts`, `TWILIO_WHATSAPP_ROSTER_CONTENT_SID` in `.env.example`

---

## Why the old template failed

The app sends four content variables on every publish:

| Key | Source | Example |
|-----|--------|---------|
| `1` | Staff first name | `Althea` |
| `2` | Week range | `2026-07-06 – 2026-07-12` |
| `3` | Personal schedule (multi-line) | See below |
| `4` | Share URL | `https://simplerosterplus.vercel.app/share/roster/…` |

Legacy template `weeklyroster` (`HX1d4be730426014c0b2808690c31596bb`) is static — no `{{1}}`–`{{4}}` placeholders — so Twilio returns **21658: The ContentVariables Parameter is invalid**.

---

## New template (recommended)

### Twilio / Meta fields

| Field | Value |
|-------|--------|
| **Friendly name** | `srp_roster_publish` |
| **Content type** | Text (or Text + optional footer — keep text-only for faster approval) |
| **WhatsApp category** | **Utility** (transactional schedule update — not Marketing) |
| **Language** | English (US) — `en` / `en_US` |
| **WABA / sender** | Simple Roster Plus (`+15617303361`) |

### Body (copy into Content Template Builder)

Use **exactly four** numbered variables, in order:

```
Hi {{1}}, your schedule for {{2}}:

{{3}}

View full roster: {{4}}
```

### Sample values (required for Meta approval)

Submit these as examples when creating the template:

**{{1}}** — `Maria`

**{{2}}** — `Jul 6 – Jul 12, 2026`

**{{3}}** —

```
Mon, Jul 6: Morning 06:00–13:00
Tue, Jul 7: Morning 06:00–13:00
Wed, Jul 8: Afternoon 13:00–21:00
Thu, Jul 9: Afternoon 13:00–21:00
Fri, Jul 10: Off
```

**{{4}}** — `https://simplerosterplus.vercel.app/share/roster/example-token`

### Filled preview (what staff should see)

```
Hi Maria, your schedule for Jul 6 – Jul 12, 2026:

Mon, Jul 6: Morning 06:00–13:00
Tue, Jul 7: Morning 06:00–13:00
Wed, Jul 8: Afternoon 13:00–21:00
Thu, Jul 9: Afternoon 13:00–21:00
Fri, Jul 10: Off

View full roster: https://simplerosterplus.vercel.app/share/roster/example-token
```

---

## Create in Twilio (step by step)

1. **Twilio Console** → **Messaging** → **Content Template Builder** → **Create new template**.
2. Add **WhatsApp** as a channel; connect to your WABA if prompted.
3. Set category **Utility**, language **English (US)**.
4. Paste the **body** above with `{{1}}` … `{{4}}`.
5. Enter the **sample values** for each variable.
6. Submit for **WhatsApp approval** (Meta review — often minutes to 24h for Utility).
7. When status is **Approved**, copy the new **Content SID** (`HX…`).
8. Update Vercel env:
   - `TWILIO_WHATSAPP_ROSTER_CONTENT_SID=<new HX sid>`
9. **Redeploy** production (and preview if you test there).
10. **Publish** a roster week again (Back to draft → Publish if already published).

---

## Approval tips

- **Utility, not Marketing** — this is “here is your work schedule,” not a promotion.
- Avoid urgency language (“Act now”, “Limited time”).
- Do **not** add “message and data rates may apply” (WhatsApp; owner decision Jul 2026).
- Variable `{{3}}` may include newlines; keep samples realistic but under ~500 characters.
- If Meta rejects long `{{3}}`, use the **compact fallback** below (requires a small code change to merge schedule + link into one variable).

---

## Compact fallback (only if Meta rejects four variables)

If approval fails because `{{3}}` is too dynamic, switch to **three variables** and a code change:

**Body:**

```
Hi {{1}}, your roster for {{2}} is ready.

{{3}}
```

**{{3}} sample:** personal schedule lines + blank line + `https://…` (app would concatenate schedule + URL before send).

Not implemented in code today — use the four-variable template first.

---

## After go-live

- Retire or ignore legacy `weeklyroster` template in Twilio (do not delete until new SID is live).
- Monitor **Twilio → Monitor → Logs → Messaging** for failed sends.
- Caps: Pro **500** automated WhatsApp messages / calendar month (`docs/PRICING.md`).

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-09 | Draft `srp_roster_publish` — fixes 21658 vs static `weeklyroster` |
