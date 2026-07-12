# WhatsApp roster publish template (Twilio / Meta)

**Status:** Link-first via **Call to action** URL button (Jul 2026). Plain text with a full URL in the body was rejected for business-initiated.

**Sender:** Simple Roster Plus — `+1 (561) 730-3361` (`whatsapp:+15617303361`)

**Related:** `lib/messaging/roster-whatsapp-notify.ts`, `app/share/roster/[token]/`

---

## Product shape

```text
Publish
  → Twilio Call-to-action Utility template to opted-in staff
  → Body: name + week · Button: opens share page
  → Staff tap button → view roster → optional “Download image”
```

- **No image attached to WhatsApp** (avoids Media template + Blob-on-every-send).
- PNG is generated **only when** someone taps **Download image** on the share page.
- Manual **Share → WhatsApp (Link)** still opens `wa.me` with the link (unlimited).

---

## Create this template in Twilio

Duplicate the rejected text template (or create new), then:

| Field | Value |
|-------|--------|
| **Friendly name** | `srp_roster_link` (or `srp_roster_cta`) |
| **Content type** | **Call to action** (not plain Text, not Media) |
| **WhatsApp category** | **Utility** |
| **Language** | English (EN / en_US) |
| **Sender / WABA** | Simple Roster Plus (`+15617303361`) |

### Body (no URL — one paragraph)

```
Hi {{1}}, your roster for {{2}} is ready. Tap View roster below to open it and download an image.
```

### Button

| Field | Value |
|-------|--------|
| **Type** | URL (website) |
| **Button text** | `View roster` |
| **URL** | `https://simplerosterplus.vercel.app/share/roster/{{3}}` |

Meta requires a **fixed domain + path prefix**; only the trailing segment may be a variable. Do **not** put the full URL in `{{3}}` — send the share **token** only.

If production ever moves to a custom domain, update this button URL in a **new** template (the base is baked into Meta approval).

### Sample values (required for Meta)

| Variable | Sample | Notes |
|----------|--------|--------|
| `{{1}}` | `Maria` | First name |
| `{{2}}` | `6th July – 12th July` | Friendly week range |
| `{{3}}` | A real share token (path only) | e.g. from `/share/roster/<token>` — not `https://…` |

The combined button URL must open a real published share page when you submit.

### App contract (what SRP sends)

```ts
contentVariables: {
  "1": firstName,      // staff first name
  "2": weekLabel,      // "6th July – 12th July"
  "3": shareToken,     // path suffix only → …/share/roster/{{3}}
}
```

### After approval

1. Copy Content SID (`HX…`)
2. Vercel: `TWILIO_WHATSAPP_ROSTER_CONTENT_SID=<new HX>`
3. Redeploy
4. Org: Settings → WhatsApp alerts on
5. Staff: phone + WhatsApp opt-in
6. **Publish** (or **Share → WhatsApp (Direct)** to resend)

---

## Environment

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Account |
| `TWILIO_AUTH_TOKEN` | Auth |
| `TWILIO_WHATSAPP_FROM` | `+15617303361` |
| `TWILIO_WHATSAPP_ROSTER_CONTENT_SID` | Approved **Call to action** template `HX…` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Used to validate HTTPS share links exist; button domain is fixed in the Twilio template |

`BLOB_READ_WRITE_TOKEN` is **optional** for this flow.

---

## Do not use

| Old approach | Why |
|--------------|-----|
| Plain Text with `{{3}}` = full HTTPS URL | Rejected for business-initiated (Jul 2026) |
| Media `weeklyroster` with PNG | Image blast — retired |
| Text with isolated vars on their own lines | Meta rejected |
| Full URL as the button variable | Meta requires path suffix after static base |

---

## Checklist

- [ ] Call-to-action Utility **Approved** + **WhatsApp business initiated** green
- [ ] Button URL base matches production (`simplerosterplus.vercel.app`)
- [ ] Env SID updated + redeploy
- [ ] WhatsApp alerts enabled in Settings
- [ ] Staff opted in with valid numbers
- [ ] Publish → amber banner shows link sends
- [ ] Tap **View roster** → share page → **Download image** works

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-09 | Text draft with 4 vars — rejected / 21658 |
| 2026-07-10 | Media image blast attempt |
| 2026-07-12 | Link-first text body + full URL var — rejected business initiated |
| 2026-07-12 | Switch to Call-to-action URL button; `{{3}}` = share token |
