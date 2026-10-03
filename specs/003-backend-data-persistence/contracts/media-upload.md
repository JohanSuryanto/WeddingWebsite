# Contract: Media Upload and Storage

## Server-side provider interface (`server/media/provider.ts`)

```ts
export interface MediaProvider {
  /** Signed parameters the browser uses to upload directly (never through the API). */
  createUploadTicket(key: string, kind: 'image' | 'audio', maxBytes: number): UploadTicket
  /** Verify the provider's upload result really came from the provider for `key`. */
  verifyUpload(key: string, result: unknown): Promise<{ bytes: number; url: string; width?: number; height?: number }>   // async: the local driver reads its sidecar file
  /** Server-side upload of bytes already on the server (seed script). */
  upload(key: string, bytes: Uint8Array, kind: 'image' | 'audio', mime: string): Promise<{ url: string; bytes: number; width?: number; height?: number }>
  copy(fromKey: string, toKey: string, kind: 'image' | 'audio'): Promise<{ url: string }>   // duplicate
  remove(key: string, kind: 'image' | 'audio'): Promise<void>
  removePrefix(prefix: string): Promise<void>                                              // couple delete
  usage(): Promise<{ used: number; limit: number; unit: 'credits' | 'bytes' }>
}

export interface UploadTicket {
  url: string                       // where the browser POSTs multipart/form-data
  fields: Record<string, string>    // extra form fields (signature, timestamp, public_id, api_key, …)
  fileField: string                 // 'file'
  expiresAt: string                 // 10 min
}
```

| Implementation | Selected by | Notes |
|---|---|---|
| `CloudinaryProvider` | `MEDIA_DRIVER=cloudinary` + `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MEDIA_ROOT` (e.g. `wedding/prod`) | Signed upload with `public_id = <MEDIA_ROOT>/<coupleId>/<mediaId>`, `resource_type = image` or `video` (audio). `overwrite=false`. `verifyUpload` recomputes Cloudinary's response signature (SHA-1 of `public_id` + `version` + secret). `copy` = an upload whose source is the original file's URL. `removePrefix` = delete resources by prefix (image and video). `usage` = admin API credits used vs limit |
| `LocalProvider` | `MEDIA_DRIVER=local` | Ticket URL is `/api/dev/media/upload/<key>`, with an HMAC in `fields`. Files go to `.data/media/<key>`. Served at `/api/dev/media/<key>` with byte ranges (WebKit audio). `usage` = sum of sizes vs 1 GB |

## Browser flow (`HttpMediaStore.put`), unchanged signature

```text
put(coupleId, blob, { kind, width, height })
  1. POST /api/admin/couples/:id/media  { kind, mime: blob.type, size: blob.size, width, height }
        ← { media: { id, status: 'pending' }, upload: UploadTicket }
  2. POST upload.url  (FormData: ...upload.fields, [fileField]: blob)  with progress events
        ← provider result JSON
  3. POST /api/admin/media/:id/complete  <provider result>
        ← { media: { …, status: 'ready', url } }
  resolve StoredMedia (and cache url for urlOf)
```

**Errors**:
- **Step 1.** `limit_exceeded` returns "Ukuran maksimal 10 MB" or "Jenis file tidak didukung".
- **Step 2.** A network or provider error rejects with `NetworkError`. The media field shows "Gagal mengunggah — Coba lagi" for **that file only**, and retrying repeats steps 1–3 with a new id (FR-015).
- **Step 3.** A signature mismatch rejects with `ValidationError`.
- **Leftovers.** A `pending` item that's never completed is removed by the cron after 24 h.

**Progress**: steps 1 and 3 are tiny. Step 2 reports `upload.onprogress` through an optional `onProgress` in `put`'s meta (additive). `GalleryField` and `ImageField` show a percentage per file.

## Server rules

| Rule | Where |
|---|---|
| Size and type limits (image or audio ≤ 10 MB; allowed MIME types listed in data-model.md) | Step 1 (from the declared size) **and** step 3 (from the verified `bytes`) |
| ≤ 30 gallery images, ≤ 1 music | Couple save (`PATCH`) |
| Content refs must be `ready` and owned by the couple | Couple save and publish |
| Deleting removes provider files | `DELETE /media/:id`, `prune`, couple delete. Queued in `media_deletions` first, then attempted immediately, then retried by the cron |
| Hard-to-guess delivery URLs | Random UUID per media file. New file → new URL, so CDN caching is safe |

## Delivery URLs

- Cloudinary image: `https://res.cloudinary.com/<cloud>/image/upload/<publicId>`
- Cloudinary audio: `https://res.cloudinary.com/<cloud>/video/upload/<publicId>`

There's no transformation in the URL, so no transformation credits are used. Photos were already compressed in the browser (002 FR-015).

## Budget check (Cloudinary Free, 25 credits per month)

| Item | Estimate | Credits |
|---|---|---|
| Storage | 30 couples × ≤ 30 MB | ≈ 0.9 |
| Delivery | 3,000 visits × ≈ 5 MB | ≈ 15 |
| Transformations | none (copies and uploads only) | ≈ 0 |
| **Total** | | **≈ 16 / 25** |

The dashboard warns at 80% (FR-014). If delivery grows past the free plan, swap in an `R2Provider` (free egress), which needs only a new implementation of this interface.
