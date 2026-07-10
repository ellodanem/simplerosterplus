# WhatsApp roster publish template (Twilio / Meta)

**Status:** Image blast (Shift Close pattern) — Jul 2026.

**Sender:** Simple Roster Plus — `+1 (561) 730-3361` (`whatsapp:+15617303361`)

**Related:** `lib/messaging/roster-whatsapp-notify.ts`, `lib/messaging/roster-blob.ts`, `app/api/roster/weeks/[id]/whatsapp/route.ts`

---

## Product shape

On **Publish**, the manager browser:

1. Publishes the week (share link goes live)
2. Captures a **PNG of the full roster grid** (`html2canvas`)
3. Uploads it to **Vercel Blob** (public HTTPS URL)
4. Sends the same image to every **opted-in** staff member via Twilio

This matches Shift Close’s `weeklyroster` media template — **not** a personalized text schedule.

---

## Twilio / Meta template (create this)

| Field | Value |
|-------|--------|
| **Friendly name** | `srp_roster_publish` (or reuse approved `weeklyroster` if it matches) |
| **Content type** | **Media** (not Text) |
| **WhatsApp category** | **Utility** |
| **Language** | English (US) |
| **Body** | Static only — **no** `{{1}}` in the body text |
| **Media variable** | `{{1}}` = public HTTPS URL of the PNG |

### Body (static)

```
Your weekly roster is ready
```

(Or: `Your Simple Roster Plus schedule is ready.`)

### Sample for Meta approval

Provide any public sample PNG URL as media `{{1}}` (e.g. a placeholder roster image on HTTPS).

### App contract

```ts
contentVariables: { "1": mediaUrl }  // public Blob URL
```

Do **not** send name/week/schedule text variables — that causes Twilio **21658** against a media template.

---

## Environment (Vercel)

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio account |
| `TWILIO_AUTH_TOKEN` | Auth token |
| `TWILIO_WHATSAPP_FROM` | `+15617303361` (or `whatsapp:+15617303361`) |
| `TWILIO_WHATSAPP_ROSTER_CONTENT_SID` | Approved **Media** template `HX…` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write (auto-injected if Blob store linked) |

Redeploy after changing env vars.

---

## Pipeline

```text
Publish click
  → POST /api/roster/weeks/[id]/status  (publish only)
  → html2canvas(hidden RosterShareTable)
  → POST /api/roster/weeks/[id]/whatsapp { imageBase64 }
       → Vercel Blob public PNG
       → for each opted-in staff: media template {{1}}=url
```

---

## Why Text templates failed

A Text Utility template with four body variables (`{{1}}`–`{{4}}`) and an isolated `{{3}}` line was **rejected by Meta**. The proven path (Shift Close) is **Media + static body + media `{{1}}`**.

---

## Checklist

- [ ] Media template approved for WhatsApp **business initiated**
- [ ] `TWILIO_WHATSAPP_ROSTER_CONTENT_SID` = that `HX…` SID
- [ ] `BLOB_READ_WRITE_TOKEN` set (or Blob store linked to the Vercel project)
- [ ] Org: Settings → WhatsApp alerts on
- [ ] Staff: contact number + WhatsApp opt-in
- [ ] Publish week → amber banner shows sent/failed summary
- [ ] Twilio logs show outbound with media (not 21658)

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-09 | First text-template draft (rejected / 21658) |
| 2026-07-10 | Switched to Shift Close image blast (Media + Blob) |
