# Data Model: Admin Login & Couple Dashboard

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-02

Invitation content keeps feature 001's `WeddingContent` structure ([001 data-model](../001-wedding-invitation-site/data-model.md)). This feature wraps it in a **Couple** record and adds **Media**, **AdminSession** and **Backup**. All validation lives in one zod schema (`src/data/schema.ts`), shared by the dashboard forms, the tests and, later, the backend.

## Couple

| Field | Type | Rules |
|---|---|---|
| `id` | string (UUID) | Generated on create; never changes |
| `slug` | string | **Unique**. Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, **3–40 characters**, not in `RESERVED_SLUGS`. Suggested by `slugify(brideNick, groomNick)`. |
| `status` | `'draft' \| 'active'` | New couples are `'draft'`. Shown as "Draf" / "Aktif". |
| `defaultTheme` | `ThemeId` | `'romantic-floral' \| 'elegant-classic' \| 'rustic-garden'`. Used when a link has no `?t=`. |
| `content` | `WeddingContent` | Feature 001 structure. Image `src` values may be `media:<id>` (see Media). |
| `version` | integer | Starts at 1, +1 on every update. Updates must send the version they were based on. |
| `createdAt` / `updatedAt` | ISO string | Set by the repository |

**State transitions**

```text
create ──► draft ──publish──► active
             ▲                  │
             └────unpublish─────┘
duplicate(any) ──► new draft (slug "<slug>-salinan", "-salinan-2", …)
delete(any) ──► removed, together with every Media it references
```

**Rules from the spec**
- **FR-006**: The slug must be unique, in the allowed format and not reserved. Changing the slug of an `active` couple requires the admin to confirm "shared links will stop working".
- **Edge case**: An update whose `expectedVersion` ≠ the stored `version` is rejected with `ConflictError`, and the UI offers to reload or overwrite.
- **FR-009**: The public site shows only `active` couples. The admin preview shows any status.

## WeddingContent: validation added for the dashboard (FR-012)

| Path | Rule (verbatim error message) |
|---|---|
| `couple.bride/groom.nickname` | Required, 1–30 characters ("Nama panggilan wajib diisi") |
| `couple.bride/groom.fullName` | Required, 2–80 characters |
| `couple.bride/groom.father/mother` | Required, 2–80 characters |
| `couple.bride/groom.photo` | Required ImageRef ("Foto wajib diunggah") |
| `cover.background` | Required ImageRef |
| `events` | At least 1 ("Minimal satu acara"). **Exactly one** `isMain` ("Pilih tepat satu acara utama"). |
| `events[].start` | ISO 8601 with an offset of +07:00, +08:00 or +09:00 |
| `events[].end` | `null`, or later than `start` ("Jam selesai harus setelah jam mulai") |
| `events[].mapUrl` | Optional; if present, must be an `https://` URL |
| `gallery` | At most **30** items |
| `gallery[].alt` | Required, trimmed, 1–150 characters ("Deskripsi foto wajib diisi") |
| `gifts.accounts[].accountNumber` | Digits only after removing spaces and dashes ("Nomor rekening hanya boleh angka") |
| `music.src` | Optional; `media:` ref or URL |
| `shareMessage` | Optional; up to 2000 characters |

## Media

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Referenced from content as `media:<id>` |
| `coupleId` | string | The owning couple. Deleted together with the couple. |
| `kind` | `'image' \| 'audio'` | |
| `mime` | string | e.g. `image/webp`, `image/jpeg`, `audio/mpeg` |
| `blob` | Blob | Stored bytes, already compressed for images |
| `size` | number (bytes) | After compression |
| `width` / `height` | number | Images only |
| `createdAt` | ISO string | |

**Upload rules (FR-016)**

| Kind | Accepted input | Limit before processing | Result |
|---|---|---|---|
| Image | `image/*` | ≤ **10 MB** | Resized to the longest side of its preset (cover/gallery 1600, story 1000, portrait 800, logo 400) and stored as WebP at quality 0.8, or JPEG at 0.82 where WebP can't be encoded |
| Audio | `audio/*` | ≤ **10 MB** | Stored as-is |

Rejections say why, for example "Ukuran maksimal 10 MB" or "File harus berupa gambar".

**Orphans**: when a draft is saved, any media no longer referenced by the couple's content are deleted. Unsaved uploads that are discarded are deleted when the editor closes.

## AdminSession (this phase)

| Field | Type | Notes |
|---|---|---|
| `email` | string | |
| `expiresAt` | ISO string | 12 hours after login |

Stored at localStorage key `admin.session`. The lockout state `{ failures, lockedUntil }` is stored at `admin.lockout`. **5** consecutive failures set `lockedUntil` to now + **60 s**, and a successful login resets it. See [contracts/auth.md](./contracts/auth.md).

## ServiceConfig (`src/config/service.ts`, public landing page)

| Field | Type | Notes |
|---|---|---|
| `brandName` | string | e.g. "Undangan Digital Johan" (placeholder) |
| `whatsappNumber` | string | International format without `+`, e.g. `6281234567890` (placeholder) |
| `whatsappMessage` | string | Pre-filled message for the contact button |
| `sampleSlug` | string | `anisa-raka`; used for the theme examples `/<sampleSlug>?t=1|2|3` |
| `tagline`, `steps[]`, `features[]` | strings | Landing page texts |

## Backup

See [contracts/backup-format.md](./contracts/backup-format.md): a versioned envelope containing `couples: Couple[]` and `media: SerializedMedia[]`, where `blob` becomes base64.

## Relationships

```text
Couple 1 ──── * Media          (Media.coupleId; content refers to them as media:<id>)
Couple * ──── 1 Theme          (defaultTheme; themes are code, not data)
Couple 1 ──── * GuestLink      (generated on the couple's send-invitation page; not stored)
Admin  1 ──── * Couple         (single admin manages all couples; no per-couple users)
```
