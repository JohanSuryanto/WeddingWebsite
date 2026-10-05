# Contract: Backup File v2

This extends 002 `contracts/backup-format.md` (v1). The restore code reads **both** versions. Export always writes v2.

**File name**: `undangan-backup-YYYYMMDD-HHmm.json`

```jsonc
{
  "format": "wedding-admin-backup",
  "formatVersion": 2,
  "createdAt": "2026-10-02T10:15:00.000Z",
  "app": { "build": "<git sha>" },
  "couples": [ /* Couple incl. passcode (data-layer.md); content keeps media:<id> refs */ ],
  "media": [
    { "id": "…", "coupleId": "…", "kind": "image", "mime": "image/webp",
      "size": 183245, "width": 1600, "height": 1067, "createdAt": "…",
      "data": "<base64>" }
  ],
  "rsvps":  [ { "id": "…", "coupleId": "…", "name": "…", "attendance": "hadir", "guestCount": 2, "submittedAt": "…", "updatedAt": "…" } ],
  "wishes": [ { "id": "…", "coupleId": "…", "name": "…", "message": "…", "attendance": null, "hidden": false, "createdAt": "…" } ],
  "guests": [ { "id": "…", "coupleId": "…", "name": "…", "position": 0, "sentAt": null } ]
}
```

**Not included**: visitor hashes (tied to `SESSION_SECRET`), sessions, throttles, rate limits and security events. After a restore, a guest's next RSVP creates a new row rather than replacing their old one. That's acceptable, and the admin can delete duplicates.

## Export (browser-driven, research R12)

1. `GET /api/admin/export` returns the v2 document with `media[].url` instead of `data`.
2. For each media item, the browser runs `fetch(url)` from the CDN (CORS allowed), base64-encodes the result and checks `size`. A progress bar shows "Mengunduh foto 12 dari 87".
3. The browser saves the file. If any media fetch fails, the export stops with the failing item named. No partial file is saved.

## Restore (browser-driven)

1. **Parse and validate** with zod (v1 or v2). This is the same validation as 002 rule 1, extended with `rsvps` and `wishes` checked against data-model.md. On failure the admin sees "File cadangan tidak valid" and nothing is written.
2. **Preflight.** `POST /api/admin/import/preflight` returns existing ids and slugs. The summary screen lists every couple and, for each conflicting one, offers **Lewati** (skip), **Ganti** (replace) or **Simpan keduanya** (keep both). The default is Lewati.
3. **For each couple not skipped**, in sequence:
   1. "Keep both": generate a new couple id, a unique slug (`slugify` + `-pulihan`), new media ids, and rewrite refs with `rewriteMediaRefs`.
   2. v1 couple (no passcode): set `randomPasscode()`.
   3. `PUT /api/admin/import/couples/:id` `{ couple, media: meta[], mode }` returns `pendingMediaIds`.
   4. Upload each pending media file with the normal 3-step flow, using `id` = the original (or rewritten) media id.
   5. `POST …/responses` with that couple's RSVPs, wishes and guest list (v2 only; ids are kept, existing ids skipped; files from before the guest list have no `guests`).
   6. `POST …/finish`. The couple keeps its backed-up status (Draf/Aktif).
4. **Report**: "Dipulihkan", "Dilewati" or "Gagal" for each couple. A failed couple stays `restorePending`. It shows "Pemulihan belum selesai" in the list and can't be published until the restore is run again.

## Guarantees

- **Safe to re-run (US6-3).** Running the same file again creates no duplicates: couples upsert by id, media that's already `ready` is skipped, and responses skip existing ids.
- **Round trip (SC-005, US7-2).** Export, then restore into an empty database, gives back identical couples (all fields except `version`, which restarts at 1, and `updatedAt`), byte-identical media, and the same RSVPs and wishes. This is checked by an integration test (PGlite + LocalProvider) and an end-to-end test.
- **Never through a function.** No request carries media bytes through the API (4.5 MB function limit).
