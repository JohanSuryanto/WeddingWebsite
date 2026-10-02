# Contract: Backup File

**File name**: `undangan-backup-YYYYMMDD-HHmm.json`

```jsonc
{
  "format": "wedding-admin-backup",
  "formatVersion": 1,
  "createdAt": "2026-10-02T10:15:00.000Z",
  "app": { "build": "<git sha or version>" },
  "couples": [ /* Couple, exactly as in data-layer.md (content keeps media:<id> refs) */ ],
  "media": [
    {
      "id": "…", "coupleId": "…", "kind": "image", "mime": "image/webp",
      "size": 183245, "width": 1600, "height": 1067, "createdAt": "…",
      "data": "<base64>"
    }
  ]
}
```

## Restore rules

1. **Validate first.** Restore parses with zod: `format`, `formatVersion` ≤ the supported version, every couple has a valid id, slug, status, theme, version and timestamps, and its content has the expected structure, every media item has valid base64, and `size` matches the decoded length. Content is *not* checked against the full content rules, because drafts may be unfinished; those rules apply when the admin saves. Any failure → "File cadangan tidak valid" with the first problem, and nothing is written.
2. **Show a summary.** The admin sees how many couples and photos the file contains, the total size, and which slugs already exist.
3. **Two modes:**
   - **Ganti semua** (replace all): clear both stores, then write everything.
   - **Tambahkan** (add): skip couples whose `id` or `slug` already exists. Report the skipped ones by name.
4. **Media keep their ids**, so the `media:` refs in the content stay valid. Media whose `coupleId` isn't being restored are skipped.
5. **Atomic.** Each couple and its media are written in one transaction, so a failed write leaves no half-restored couple.

**Round-trip guarantee (SC-008)**: back up, then restore with "Ganti semua" into an empty database. The result has identical couple records (all fields, including `version`) and byte-identical media. This is checked by a unit test and an end-to-end test.
