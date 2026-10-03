# Contract: Frontend Data Layer (backend swap)

This builds on 002 `contracts/data-layer.md`. Screens keep importing from `src/data`, `src/services` and `src/admin/auth`. Only the implementations and the wiring files change (FR-004).

## Interface changes (small, additive)

```ts
// src/data/types.ts
export interface Couple { /* 002 fields */ passcode: string }          // NEW (admin only)
export type NewCouple = Pick<Couple, 'slug' | 'defaultTheme' | 'content'> & { passcode?: string }
export type CoupleSummary = /* 002 fields */ & { accessWarning: boolean; restorePending: boolean }

export interface MediaStore {
  /* 002 methods unchanged: put, getBlob, remove, removeUnreferenced, usage */
  /** NEW: delivery URL when known (HTTP store); resolveMedia prefers it over getBlob. */
  urlOf?(id: string): string | undefined
}

export interface UsageReport {                    // NEW: usage() return widened
  usedBytes: number; quotaBytes: number | null      // 002 shape kept for StorageMeter
  percent: number; warn: boolean; label: string     // e.g. "Kuota media: 12,4 dari 25 kredit"
}

export class SessionExpiredError extends Error {}   // 401 from any admin call
export class UnavailableError extends Error {}      // 403 unavailable (draft)
export class NetworkError extends Error {}          // network, timeout, 5xx
export class LockedOutError extends Error { retryAt: Date }   // moved here from admin/auth (shared with passcode)
export class RateLimitedError extends Error { retryAt: Date }

// NEW public-site read model
export interface PublicCoupleSource {
  get(slug: string): Promise<PublicCouple>              // NotFoundError | UnavailableError | NetworkError
}
```

```ts
// src/services/types.ts — additions
export interface WishService {
  list(cursor?: string): Promise<Page<Wish>>             // was Promise<Wish[]>; Wishes section adds "Muat lebih banyak"
  submit(input: WishInput): Promise<Wish>
}
export interface RsvpService {
  submit(input: RsvpInput): Promise<RsvpResponse>
  mine(): Promise<RsvpResponse | null>                   // NEW (US5-1)
}

/** Send-invitation page (US4). */
export interface CoupleAccessService {
  gate(slug: string): Promise<CoupleGate>
  unlock(slug: string, passcode: string): Promise<void>  // InvalidPasscodeError | LockedOutError
  lock(slug: string): Promise<void>
  load(slug: string): Promise<{ couple: PublicCouple; status: CoupleStatus }>   // LockedError → show passcode screen
  responses(slug: string, wishesCursor?: string): Promise<{ totals: RsvpTotals; rsvps: RsvpRecord[]; wishes: Page<Wish> }>
  csvUrl(slug: string): string
}

/** Admin "Respons" tab (FR-019). */
export interface ResponsesAdminService {
  list(coupleId: string, wishesCursor?: string): Promise<{ totals: RsvpTotals; rsvps: RsvpRecord[]; wishes: Page<WishRecord> }>
  csvUrl(coupleId: string): string
  deleteRsvp(id: string): Promise<void>
  setWishHidden(id: string, hidden: boolean): Promise<WishRecord>
  deleteWish(id: string): Promise<void>
}
```

## Implementations

| Interface | 002 implementation (removed) | 003 implementation |
|---|---|---|
| `CoupleRepository` (admin) | `IndexedDbCoupleRepository` | `src/data/http/HttpCoupleRepository.ts` → `/api/admin/couples*` |
| `MediaStore` (admin) | `IndexedDbMediaStore` | `src/data/http/HttpMediaStore.ts` (three-step upload, contracts/media-upload.md) |
| `CoupleRepository` (public) | `StaticCoupleRepository` | replaced by `PublicCoupleSource` → `src/data/http/HttpPublicCoupleSource.ts` |
| `AuthService` | `LocalAuthService` | `src/admin/auth/HttpAuthService.ts` (contracts/auth.md) |
| `RsvpService` / `WishService` | `memory.ts` | `src/services/http.ts` (per couple slug) |
| `CoupleAccessService` | – | `src/services/coupleAccess.ts` |
| `ResponsesAdminService` | – | `src/admin/responses/http.ts` |

All of them use one helper, `src/data/http/client.ts`:

```ts
apiFetch<T>(path: string, init?: { method?; body?; signal? }): Promise<T>
// same-origin '/api' + path, credentials: 'same-origin', JSON in/out,
// AbortSignal.timeout(12_000), maps error envelope → error classes (contracts/api.md table)
```

## Wiring files (the only places that pick implementations)

| File | Exports |
|---|---|
| `src/data/index.admin.ts` | `coupleRepository = new HttpCoupleRepository()`, `mediaStore = new HttpMediaStore()`, `ready = Promise.resolve()` |
| `src/data/index.public.ts` | `publicCouples = new HttpPublicCoupleSource()` |
| `src/services/index.ts` | `createServicesFor(content, { slug, mode: 'live' \| 'preview' })`. `live` (public invitation) → HTTP RSVP and wish services for that couple. `preview` (admin live and full-page previews) → the in-memory services seeded with `content.sampleWishes`, so previews never write real responses |

## Behavioural guarantees (tested against the real API with PGlite)

1. `HttpCoupleRepository.update` with a stale `expectedVersion` throws `ConflictError`, including when the newer save came from "another device" (a second client).
2. Any admin call after logout or session expiry throws `SessionExpiredError`. The editor keeps its form state (US2-4).
3. `HttpMediaStore.put` resolves only after the server has marked the media `ready`. If the upload fails, it rejects, leaving the item `pending` and never referenced (FR-015).
4. `resolveMedia(content, mediaStore)` returns CDN URLs through `urlOf` with no `blob:` copies, and `dispose` does nothing for them.
5. Public pages never receive `media:` refs, `passcode`, drafts' content or hidden wishes.
6. `createServicesFor` in the admin preview never calls `/api/public/*/rsvp` or `/wishes` (checked with a request spy in an end-to-end test).
