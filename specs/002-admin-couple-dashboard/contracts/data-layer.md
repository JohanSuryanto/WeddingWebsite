# Contract: Data Layer

The single replaceable layer (FR-018). Screens import only from `src/data` and never from an implementation directly. The backend phase adds `Http*` classes that implement the same interfaces and changes only the wiring files.

```ts
// src/data/types.ts
export type CoupleStatus = 'draft' | 'active'

export interface Couple {
  id: string
  slug: string
  status: CoupleStatus
  defaultTheme: ThemeId
  content: WeddingContent        // ImageRef.src may be "media:<id>"
  version: number
  createdAt: string
  updatedAt: string
}

export type NewCouple = Pick<Couple, 'slug' | 'defaultTheme' | 'content'>
export type CoupleSummary = Pick<Couple, 'id' | 'slug' | 'status' | 'defaultTheme' | 'updatedAt'> & {
  names: string                  // "Anisa & Raka"
  mainDate: string | null        // main event start (ISO), if any
  coverSrc: string | null        // for thumbnails
}

export class ConflictError extends Error {}        // version mismatch
export class SlugTakenError extends Error {}       // unique slug violated
export class NotFoundError extends Error {}

export interface CoupleRepository {
  list(): Promise<CoupleSummary[]>                               // newest updated first
  get(id: string): Promise<Couple>                               // NotFoundError
  findBySlug(slug: string, opts?: { includeDrafts?: boolean }): Promise<Couple | null>
  create(input: NewCouple): Promise<Couple>                      // status 'draft', version 1; SlugTakenError
  update(id: string, patch: Partial<NewCouple>, expectedVersion: number): Promise<Couple>
                                                                 // ConflictError | SlugTakenError
  setStatus(id: string, status: CoupleStatus): Promise<Couple>
  duplicate(id: string): Promise<Couple>                         // new draft, unique "-salinan" slug, media copied
  remove(id: string): Promise<void>                              // also removes the couple's media
}

export interface StoredMedia {
  id: string; coupleId: string; kind: 'image' | 'audio'; mime: string
  size: number; width?: number; height?: number; createdAt: string
}

export interface MediaStore {
  put(coupleId: string, blob: Blob, meta: { kind: 'image' | 'audio'; width?: number; height?: number }): Promise<StoredMedia>
  getBlob(id: string): Promise<Blob | null>
  remove(id: string): Promise<void>
  removeUnreferenced(coupleId: string, referenced: Set<string>): Promise<number>
  usage(): Promise<{ usedBytes: number; quotaBytes: number | null }>
}
```

## Helpers (shared by both sites)

| Function | Purpose |
|---|---|
| `resolveMedia(content, store)` → `{ content, dispose }` | Replaces `media:<id>` with `blob:` URLs. Other `src` values pass through. Missing media resolve to `''`, so `SafeImage` shows its placeholder. |
| `collectMediaRefs(content)` → `Set<string>` | Every media id referenced by the content. Used for orphan cleanup and duplication. |
| `slugify(a, b)`, `isReservedSlug(s)`, `SLUG_PATTERN` | FR-006 |
| `weddingContentSchema`, `coupleSchema` (zod) | FR-012; used by the forms, tests, backup restore and, later, the backend |

## Wiring per site

| File | This phase | Backend phase |
|---|---|---|
| `src/data/index.admin.ts` | `IndexedDbCoupleRepository`, `IndexedDbMediaStore` (database `wedding-admin`, version 1, stores `couples` keyed by `id` with unique index `slug`, and `media` keyed by `id` with index `coupleId`) | `HttpCoupleRepository`, `HttpMediaStore` |
| `src/data/index.public.ts` | `StaticCoupleRepository` (bundled samples, read-only; write methods throw) | `HttpCoupleRepository` (public read endpoints only) |

## Behavioural guarantees (tested with `fake-indexeddb`)

1. `create` assigns `version: 1`, `status: 'draft'`, timestamps, and rejects duplicate or reserved slugs.
2. `update` with a stale `expectedVersion` throws `ConflictError` and changes nothing.
3. `remove` deletes the couple and every media item with that `coupleId`.
4. `duplicate` copies the content and media to new ids, rewrites `media:` refs, and creates a unique slug.
5. On first run, the admin repository is seeded with the Anisa & Raka sample (media copied into the `MediaStore`), so SC-007 holds.
