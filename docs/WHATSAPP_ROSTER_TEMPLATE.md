# WhatsApp roster publish template (Twilio / Meta)

**Status:** Link-first (Jul 2026). Staff get a share URL; they can download a PNG from the share page.

**Sender:** Simple Roster Plus — `+1 (561) 730-3361` (`whatsapp:+15617303361`)

**Related:** `lib/messaging/roster-whatsapp-notify.ts`, `app/share/roster/[token]/`

---

## Product shape

```text
Publish
  → Twilio text Utility template to opted-in staff
  → Message includes share link
  → Staff open link → view roster → optional “Download image”
```

- **No image attached to WhatsApp** (avoids Media template + Blob-on-every-send).
- PNG is generated **only when** someone taps **Download image** on the share page.
- Manual **Share → WhatsApp (Link)** still opens `wa.me` with the link (unlimited).

---

## Create this template in Twilio

| Field | Value |
|-------|--------|
| **Friendly name** | `srp_roster_link` |
| **Content type** | **Text** (not Media) |
| **WhatsApp category** | **Utility** |
| **Language** | English (EN / en_US) |
| **Sender / WABA** | Simple Roster Plus (`+15617303361`) |

### Body (copy exactly — one paragraph)

```
Hi {{1}}, your roster for {{2}} is ready. View it and download an image here: {{3}}
```

### Why this wording

- Variables are **not** alone on their own lines
- Message does **not** start or end with a bare variable
- Enough static text around `{{1}}` / `{{2}}` / `{{3}}` for Meta Utility review

### Sample values (required for Meta)

| Variable | Sample |
|----------|--------|
| `{{1}}` | `Maria` |
| `{{2}}` | `6th July – 12th July` |
| `{{3}}` | `https://simplerosterplus.vercel.app/share/roster/example-token` |

Use a real published share URL from your app for `{{3}}` if Meta is picky (Copy share link after Publish).

### App contract (what SRP sends)

```ts
contentVariables: {
  "1": firstName,   // staff first name
  "2": weekLabel,   // "6th July – 12th July"
  "3": shareUrl,    // https://…/share/roster/{token}
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
| `TWILIO_WHATSAPP_ROSTER_CONTENT_SID` | Approved **text** template `HX…` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Canonical HTTPS base for share links in messages |

`BLOB_READ_WRITE_TOKEN` is **optional** for this flow (only needed if you still use temp Blob sample tools).

---

## Do not use

| Old approach | Why |
|--------------|-----|
| Media `weeklyroster` with `{{1}}` = PNG | Image blast — retired for automated notify |
| Text with isolated `{{3}}` on its own line | Meta rejected |
| Four vars for personal schedule lines | Overkill; link + download is enough |

---

## Checklist

- [ ] Text Utility `srp_roster_link` **Approved** + business initiated
- [ ] Env SID updated + redeploy
- [ ] WhatsApp alerts enabled in Settings
- [ ] Staff opted in with valid numbers
- [ ] Publish → amber banner shows link sends
- [ ] Open share link → **Download image** works on phone/desktop

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-09 | Text draft with 4 vars — rejected / 21658 |
| 2026-07-10 | Media image blast attempt |
| 2026-07-12 | Link-first + share-page Download image |
