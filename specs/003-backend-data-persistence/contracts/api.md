# Contract: HTTP API

One Hono app (`server/app.ts`). Every deployment serves it on its own origin under `/api`. `API_SURFACE` decides which groups are mounted (research R4):

| Group | `public` deployment (wedding.johansuryanto.dev) | `admin` deployment (admin.wedding.johansuryanto.dev) |
|---|---|---|
| `/api/public/*` | ✅ | ✅ (used by previews) |
| `/api/couple/*` | ✅ | ❌ 404 |
| `/api/admin/*` | ❌ 404 | ✅ |
| `/api/cron/*` | ❌ 404 | ✅ |
| `/api/dev/media/*` | only when `MEDIA_DRIVER=local` | only when `MEDIA_DRIVER=local` |

## Conventions

- **JSON** in and out (`application/json; charset=utf-8`), except the CSV export.
- **Caching.** Every response sends `Cache-Control: no-store` (research R14).
- **Origin check.** Every non-GET request needs an `Origin` header in that deployment's allow-list (`PUBLIC_ORIGIN` or `ADMIN_ORIGIN` + local development origins), otherwise 403 `bad_origin` (FR-010).
- **Request body size.** At most 256 KB, otherwise 413 `too_large`. Files never pass through the API.
- **Errors.** Every error uses the same shape. `message` is Indonesian and safe to show the user.

  ```json
  { "error": { "code": "slug_taken", "message": "Nama alamat sudah dipakai pasangan lain", "fields": { "slug": "…" }, "retryAt": "…" } }
  ```

| HTTP | `code` | Frontend error class |
|---|---|---|
| 400 | `invalid_body` | `ValidationError` (with `fields`) |
| 401 | `unauthenticated` | `SessionExpiredError` (admin) / `LockedError` (couple) |
| 403 | `bad_origin`, `unavailable` | `UnavailableError` for `unavailable` |
| 404 | `not_found` | `NotFoundError` |
| 409 | `conflict`, `slug_taken` | `ConflictError`, `SlugTakenError` |
| 413 | `too_large` | `ValidationError` |
| 422 | `validation`, `slug_reserved`, `media_not_ready`, `limit_exceeded`, `not_publishable` | `ValidationError` |
| 423 | `locked` (with `retryAt`) | `LockedOutError` |
| 429 | `rate_limited` (with `retryAt`) | `RateLimitedError` |
| 5xx / network / 12 s timeout | none | `NetworkError` |

## Cookies

All are `HttpOnly; Secure; SameSite=Lax; Path=/api`. Locally over `http://` the `Secure` flag is dropped.

| Cookie | Set by | Value | Lifetime |
|---|---|---|---|
| `ws_admin` | `POST /api/admin/login` | 32 random bytes, base64url; the server stores the SHA-256 | 7 days, absolute |
| `wc_<coupleId>` | `POST /api/public/couples/:slug/unlock` | signed `coupleId.passcodeVersion.exp` | 30 days |
| `wv` | the first public POST with no `wv` cookie | 16 random bytes; the server stores an HMAC | 1 year |

---

## Public (`/api/public`), no login

### `GET /api/public/couples/:slug`
The invitation (US1).
- **200** `{ couple: PublicCouple }`. Content has every `media:<id>` replaced with absolute URLs.
- **403** `unavailable`: the couple is a draft. No content is sent ("Undangan belum tersedia", FR-003).
- **404** `not_found` ("Undangan tidak ditemukan").

### `GET /api/public/couples/:slug/wishes?cursor=`
- **200** `Page<Wish>`, visible wishes only, newest first, 20 per page (FR-018).
- **403** for drafts, **404** if not found.

### `POST /api/public/couples/:slug/wishes`
- **Body:** `WishInput` `{ name, message, attendance? }`.
- **201** `{ wish: Wish }`.
- **400** `invalid_body` with `fields` (same messages as `validateWish`).
- **403** `unavailable` for drafts. **429** `rate_limited`. **404**.

### `POST /api/public/couples/:slug/rsvp`
- **Body:** `RsvpInput` `{ name, attendance, guestCount }`.
- **200** `{ rsvp: RsvpResponse, replaced: boolean }`. An earlier response from the same `wv` is replaced (FR-017).
- **400**, **403**, **429**, **404** as for wishes.

### `GET /api/public/couples/:slug/rsvp/mine`
- **200** `{ rsvp: RsvpResponse | null }`: this browser's earlier response, so the form can show "Terima kasih, respons Anda sudah kami terima" after a refresh (US5-1).

### `GET /api/public/couples/:slug/gate`
The passcode screen (US4). Works for drafts too (US4-8).
- **200** `CoupleGate`: `{ names: "Budi & Sari", status, unlocked, retryAt }`. `unlocked` is true when a valid `wc_<id>` cookie is present. `retryAt` is set while the couple's passcode entry is paused.
- **404**.

### `POST /api/public/couples/:slug/unlock`
- **Body:** `{ passcode: "4821" }`.
- **204** + sets `wc_<coupleId>`.
- **401** `unauthenticated` "Kode akses salah".
- **423** `locked` with `retryAt`, after 5 wrong attempts, for 15 min, per couple (FR-010d). The passcode isn't checked during the pause.
- **404**.

---

## Couple (`/api/couple`), valid `wc_<coupleId>` cookie required

If the cookie is missing, invalid, expired, or carries an older `passcode_version`: **401** `unauthenticated`. The page shows the passcode screen again (US4-6).

### `GET /api/couple/:slug/send-invitation`
- **200** `{ couple: PublicCouple, status }`. Same shape as the public read, but drafts are included (US4-8). The page uses it to build guest links and the preview link.

### `GET /api/couple/:slug/responses?wishesCursor=`
- **200** `{ totals: RsvpTotals, rsvps: RsvpRecord[], wishes: Page<Wish> }`.
- RSVPs are sorted newest first. Only visible wishes are included. Read only (FR-019).

### `GET /api/couple/:slug/rsvps.csv`
- **200** `text/csv; charset=utf-8` with a byte-order mark. `Content-Disposition: attachment; filename="rsvp-<slug>-YYYYMMDD.csv"` (research R16).

### Guest list (`/api/couple/:slug/guests`)
The couple's saved guest names on the send-invitation page, shared with the admin (`/api/admin/couples/:id/guests`, same routes).
| Method & path | Responses |
|---|---|
| `GET …/guests` | **200** `{ guests: { id, name, sentAt }[] }` in the couple's order |
| `PUT …/guests` `{ names: string[] }` | **200** the new list. Max 1000 names of 200 characters; cleaned like the page (spaces collapsed, blanks dropped). A name that stays keeps its id and `sentAt`; repeated names match in order |
| `PATCH …/guests/:guestId` `{ sent }` | **200** `{ guest }`. `sentAt` set to now, or cleared. **404** for another couple's guest |

### `POST /api/couple/:slug/lock`
- **204**. Clears `wc_<coupleId>` ("Keluar" on the couple page).

---

## Admin (`/api/admin`), valid `ws_admin` cookie required (except login)

Every route below except `login` and `session` returns **401** `unauthenticated` without a valid session. This is the server-side guarantee of FR-006 and SC-002.

### Session
| Method & path | Body | Responses |
|---|---|---|
| `POST /login` | `{ email, password }` | **200** `{ session: { email, expiresAt } }` + `ws_admin`. **401** "Email atau kata sandi salah". **423** `locked` + `retryAt` (5 failures → 60 s) |
| `POST /logout` | – | **204**. Deletes the session row and clears the cookie |
| `GET /session` | – | **200** `{ session: AdminSession \| null }` |

### Couples
| Method & path | Body / query | Responses |
|---|---|---|
| `GET /couples` | – | **200** `{ couples: CoupleSummary[] }`, newest updated first. Includes `accessWarning`, `restorePending` |
| `POST /couples` | `NewCouple & { passcode?: string }` | **201** `{ couple: Couple }`. Status `draft`, version 1, a random passcode if none is given. **409** `slug_taken`. **422** `slug_reserved` / `validation` |
| `GET /couples/:id` | – | **200** `{ couple: Couple, media: Record<id, MediaInfo> }`. **404** |
| `GET /couples/by-slug/:slug` | – | Same as above, drafts included (admin previews) |
| `PATCH /couples/:id` | `{ expectedVersion, patch: Partial<NewCouple & { passcode }> }` | **200** `{ couple }`, version +1. A passcode change also increments `passcode_version`. **409** `conflict` / `slug_taken`. **422** `validation` / `media_not_ready` / `limit_exceeded` |
| `POST /couples/:id/status` | `{ status }` | **200** `{ couple }`. **422** `not_publishable` (content fails the schema, restore still pending, or media not ready) |
| `POST /couples/:id/duplicate` | – | **201** `{ couple }`. New draft with a unique `-salinan` slug and a new passcode; media are copied inside the provider (research R9) |
| `DELETE /couples/:id` | – | **204**. Removes the database rows and queues and attempts deletion of the couple's media folder (FR-013) |

`MediaInfo = { id, kind, mime, size, width?, height?, url, status }`.

### Media (contracts/media-upload.md)
| Method & path | Body | Responses |
|---|---|---|
| `POST /couples/:id/media` | `{ kind, mime, size, width?, height?, id? }` (`id` only for restore) | **201** `{ media: MediaInfo, upload: UploadTicket }`. **422** `limit_exceeded` (type or size) |
| `POST /media/:id/complete` | the provider's upload result | **200** `{ media: MediaInfo }` (`ready`). **422** `validation` when the signature, size or key doesn't match |
| `DELETE /media/:id` | – | **204** |
| `POST /couples/:id/media/prune` | `{ referenced: string[] }` | **200** `{ removed: number }`. Deletes this couple's media not in the list (the existing `removeUnreferenced`) |
| `GET /usage` | – | **200** `{ media: { used, limit, unit: 'credits' \| 'bytes', warn }, database: { usedBytes, limitBytes, warn } }`. `warn` at ≥ 80% (FR-014) |

### Guest responses
| Method & path | Responses |
|---|---|
| `GET /couples/:id/responses?wishesCursor=` | **200** `{ totals, rsvps: RsvpRecord[], wishes: Page<WishRecord> }`. Hidden wishes are included and flagged |
| `GET /couples/:id/rsvps.csv` | CSV, same format as the couple export |
| `DELETE /rsvps/:id` | **204** (for example, a duplicate from another device) |
| `PATCH /wishes/:id` `{ hidden }` | **200** `{ wish: WishRecord }` |
| `DELETE /wishes/:id` | **204** |

### Backup and restore (contracts/backup-format.md)
| Method & path | Body | Responses |
|---|---|---|
| `GET /export` | – | **200** a v2 backup without media `data` (media carry `url`); the browser adds the bytes |
| `POST /import/preflight` | `{ couples: { id, slug }[] }` | **200** `{ existingIds: string[], existingSlugs: string[], pendingIds: string[] }`. `pendingIds` are couples whose earlier restore didn't finish; the restore screen continues them by default ("Lanjutkan") |
| `PUT /import/couples/:id` | `{ couple: Couple, media: MediaMeta[], mode: 'create' \| 'replace' }` | **200** `{ couple, pendingMediaIds: string[] }`. Sets `restore_pending = true`. Media already `ready` with the same id are kept and left out of `pendingMediaIds` (safe to re-run) |
| `POST /import/couples/:id/responses` | `{ rsvps: RsvpRecord[], wishes: WishRecord[] }` | **200** `{ inserted: number, skipped: number }`. Existing ids are skipped |
| `POST /import/couples/:id/finish` | – | **200** `{ couple }` with `restore_pending = false`. **422** `media_not_ready` with the list of missing ids |

---

## Cron (`/api/cron`)

### `GET /api/cron/cleanup`
- Needs `Authorization: Bearer ${CRON_SECRET}`, which Vercel Cron sends. Otherwise **401**.
- Runs daily on the admin project (`vercel.json` `crons`).
- Retries `media_deletions`, deletes `pending` media older than 24 h, and removes expired `admin_sessions`, stale `rate_limits` and `security_events` older than 30 days.
- **200** `{ deleted: {...counts} }`.

## Public-site route changes

| Route | Change |
|---|---|
| `/:slug` | Data from `GET /api/public/couples/:slug`. Loading skeleton, then the invitation, "Undangan belum tersedia", "Undangan tidak ditemukan", or "Undangan sedang tidak dapat dimuat, coba lagi" with a retry button (FR-024) |
| `/:slug/send-invitation` | Starts with `GET …/gate`. If locked, shows the **passcode screen**: "Masukkan kode akses", 4 one-digit inputs (`inputmode="numeric"`, `autocomplete="one-time-code"`), and the couple's names. Once unlocked, shows the existing link generator plus a new **"Respons Tamu"** panel (totals, RSVP list, wishes, "Unduh CSV") and a "Keluar" link |

Admin-site routes are unchanged from 002. Additions:
- a **"Respons"** tab in the editor
- a **passcode** field with "Acak" (randomise) and "Salin pesan" (copy message) buttons in the Pengaturan tab
- the usage meter switches to `GET /usage`
