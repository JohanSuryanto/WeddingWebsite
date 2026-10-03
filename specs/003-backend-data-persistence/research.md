# Research: Server Storage for Couples, Media and Guest Responses

**Feature**: 003-backend-data-persistence · **Date**: 2026-10-02

Every decision here is bound by spec FR-025: each hosted service must be free at the scale in the spec's Assumptions:
- about 30 couples, 10 published at a time
- about 300 guests per couple
- a few thousand visits per month
- about 30 MB of media per couple

Free-plan limits below were checked on 2026-10-02 from each provider's pricing or limits page. They change, so `quickstart.md` § "Free-tier watch" lists where to re-check them.

---

## R1. Database: PostgreSQL, not MongoDB

**Decision**: PostgreSQL. Each couple's invitation content goes in one `jsonb` column, and everything else goes in ordinary relational tables.

**Rationale**:
- **The data is relational.** One couple owns many media files, RSVPs and wishes. Deleting a couple must remove all of them (FR-013, SC-008), which foreign keys with `ON DELETE CASCADE` give us for free.
- **We need hard guarantees.**
  - Unique address names (002 FR-006).
  - A conditional `UPDATE … WHERE version = $n` for the cross-device conflict check (FR-005).
  - One RSVP per browser per couple (FR-017), enforced as `UNIQUE (couple_id, visitor_hash)` with an upsert.
  - All-or-nothing restore of a couple (FR-021).
  
  Postgres handles all of these with constraints and transactions.
- **Content stays flexible.** `WeddingContent` is a deep, evolving document already validated by zod (`src/data/schema.ts`). Storing it as `jsonb` keeps the document model (the main reason to pick MongoDB) without spreading it across 10+ tables. The schema shared with the frontend stays the single source of validation.
- **Learning value.** SQL, migrations and constraints carry over to most backend work.

**Alternatives considered**:
- **MongoDB Atlas M0** (free, 512 MB). Fits the content document well, but uniqueness, cascades and multi-document atomicity need more application code. Its free tier also has no automatic wake-up advantage over Neon.
- **SQLite on Turso** (free). Good, but a less common skill, and `jsonb` querying is weaker.

## R2. Postgres hosting: Neon (Free plan)

**Decision**: Neon Free, in the AWS Asia Pacific (Singapore) region `aws-ap-southeast-1`, using the **pooled** connection string.

**Rationale**:
- **Free plan, verified 2026-10-02:**
  - permanent, with no credit card
  - 1 GB storage per project
  - 100 compute-hours per project per month
  - 10 branches
  - 5 GB network egress
- **Wakes up on its own.** The database scales to zero after 5 minutes idle and wakes automatically on the next query in about a second. That meets SC-003's "within 10 seconds after a quiet period" without anyone resuming it by hand.
- **Expected use is far below the limits.** Content is about 50 KB per couple and responses about 300 rows per couple, so the whole database stays under 50 MB. Compute only runs while requests arrive.
- **Close to users.** Singapore is the closest region to Indonesian guests and admin, and it matches the server region (R4).
- **Free dev branch.** A `dev` branch is available if wanted, though local development doesn't need it (R10).

**Alternatives considered**:
- **Supabase Free.** It bundles Postgres, storage and auth, but free projects pause after 7 days of inactivity and must be resumed by hand. A quiet wedding invitation would go offline.
- **Render Postgres free.** Expires after 30 days.
- **Aiven free.** Fine, but it has no automatic wake-up and offers fewer regions.

## R3. Media storage: Cloudinary (Free plan), behind a replaceable `MediaProvider`

**Decision**: Cloudinary Free. The browser uploads files directly to Cloudinary using a short-lived signature from our server. Files are served from Cloudinary's CDN with no transformations, since photos are already compressed on the admin's device (002 FR-015). All provider calls sit behind a server-side `MediaProvider` interface with two implementations: `cloudinary` and `local` (local disk, for development and tests).

**Rationale**:
- **Free plan, verified 2026-10-02:**
  - no credit card
  - 25 credits per month, where 1 credit = 1 GB stored, 1 GB delivered, or 1,000 transformations
- **It fits the expected scale:**
  - Storage: 30 couples × up to 30 MB = at most about 0.9 GB, so about 1 credit.
  - Delivery: 3,000 visits × about 5 MB = about 15 GB, so about 15 credits. A visit is the cover, two portraits, the gallery that loads as guests scroll, and the music.
  - Total: about 16 of 25 credits.
- **Room to spare.** The 80% storage warning (FR-014) is based on the Cloudinary usage endpoint, which reports credits used, so it also covers delivery.
- **Bypasses the 4.5 MB request limit.** Direct browser uploads mean files never pass through a Vercel Function, whose requests are capped at 4.5 MB (verified 2026-10-02). Music files can be up to 10 MB.
- **Free CDN with CORS.** Cloudinary serves files from a global CDN with permissive CORS. That makes client-side backup assembly possible (R12).
- **Hard-to-guess file addresses.** Files are stored as `<root>/<coupleId>/<mediaId>`, with a random UUID for each id. That meets the spec's assumption that "media addresses are long and hard to guess but not secret".
- **No admin API call per upload.** Cloudinary's upload response comes signed with our API secret. The server verifies that signature instead of calling Cloudinary's rate-limited admin API.
- **Audio support.** Audio uploads use Cloudinary's `video` resource type.

**Alternatives considered**:
- **Cloudflare R2.** 10 GB storage and free egress, so bandwidth is better. But it requires a payment method on file, and S3-style presigned uploads need more setup. Kept as the documented swap: one new `MediaProvider` implementation.
- **Vercel Blob (Hobby).** Same vendor as hosting, but smaller free allotments, and it shares Hobby's non-commercial restriction.
- **GCP Cloud Storage.** Needs a billing account with a card. The always-free tier covers only US regions and small egress, so a surprise bill is possible. Rejected for a learning project.
- **Supabase Storage.** 1 GB, but the project-pausing problem from R2 applies.
- **Storing files in Postgres.** This would quickly exceed the 1 GB free database limit and slow every query.

## R4. Server: Hono on Vercel Functions, one catch-all function, deployed with **both** sites

**Decision**:
- **Framework.** The server is a TypeScript **Hono** app in `server/`. It's exposed through one Vercel Node.js function, `api/index.ts`, using `hono/vercel`. A rewrite sends `/api/(.*)` to that function.
- **Deployment.** Both existing Vercel projects (public and admin) deploy the same function. Each site calls its own `/api` on the same origin. Both use one Neon database and one Cloudinary account.
- **Who serves what.** The environment variable `API_SURFACE` (`public` | `admin`) decides which route groups each deployment mounts:
  - **public**: `/api/public/*` and `/api/couple/*`. Admin routes return 404, so admin endpoints are never exposed on `wedding.johansuryanto.dev` (the server-side version of 002 FR-001).
  - **admin**: `/api/admin/*`, `/api/public/*` (for previews) and `/api/cron/*`.
- **Region.** The function region is `sin1` (Singapore).

**Rationale**:
- **Free plan, verified 2026-10-02.** Vercel Hobby includes 1,000,000 function invocations per month, 4 h of active CPU, 100 GB of fast data transfer, and a maximum duration of 300 s. At our scale, invocations are in the low tens of thousands.
- **No CORS and no third-party cookies.** Each site calls its own origin, so cookies can be host-only, `SameSite=Lax` and `HttpOnly`. Neither site's cookies are ever visible to the other site's scripts (FR-008).
- **One catch-all function.** This avoids per-function cold starts and any function-count limits.
- **Why Hono:**
  - It's small and typed, and works with the standard `Request`/`Response` API.
  - The same app runs on Vercel, on Node (`@hono/node-server`, for development and end-to-end tests) and on Cloudflare Workers or Render if we ever move.
  - `app.request()` lets unit tests exercise the real routes with no network.
- **Close to the database.** The `sin1` region sits next to Neon Singapore, keeping each query round trip to a few milliseconds.

**Caveat (recorded in the spec's Assumptions)**: Vercel Hobby is for **non-commercial personal use only**. That rules out receiving payment to create or host the site, and advertising a paid service. If the admin starts charging couples, either upgrade to Vercel Pro or move the Hono app to a host that allows commercial use on its free plan. Cloudflare Workers is one option; the code is portable by design.

**Alternatives considered**:
- **A separate API project at `api.wedding.johansuryanto.dev`.** Needs CORS with credentials on both sites, and the admin cookie would have to be set for a shared parent domain.
- **Vercel external rewrite (proxy) from admin to public `/api`.** Adds a proxy hop, and it's unclear whether cookies are forwarded reliably.
- **Express or Fastify.** Heavier, Node-only, and they need adapters for serverless.
- **Render free web service.** Sleeps after 15 minutes, with 30–60 s cold starts. That breaks SC-003.
- **Cloudflare Workers Free.** Allows commercial use and is very fast, but its 10 ms CPU limit per request is too tight for password hashing (R6). Kept as the documented move if the service turns commercial.
- **Next.js rewrite.** Would mean rewriting both frontends.

## R5. Database access: Drizzle ORM + postgres.js (production) / PGlite (tests and local development)

**Decision**:
- **Schema and migrations.** `drizzle-orm` with schema in `server/db/schema.ts`. `drizzle-kit` generates SQL migrations into `server/db/migrations/`, which are committed and applied with `npm run db:migrate`.
- **Drivers:**
  - **Production:** `postgres` (postgres.js) against Neon's pooled URL, with `prepare: false` because the pooler runs PgBouncer in transaction mode, and `max: 1` per function instance.
  - **Tests and local development:** `@electric-sql/pglite`, a real Postgres compiled to WASM that runs in-process via `drizzle-orm/pglite`.

**Rationale**:
- Drizzle reads like SQL, so you learn SQL rather than an abstraction. Its schema files are typed TypeScript, and the same schema works with both drivers.
- PGlite gives every test a fresh, real Postgres in milliseconds, with no Docker. That matters on this Windows machine.
- postgres.js supports interactive transactions over TCP, which Vercel Node functions allow. Neon's HTTP driver can't do interactive transactions, and restore and duplicate need them.

**Alternatives considered**:
- **Prisma.** Heavier client, and it needs a separate engine in serverless functions.
- **Kysely.** Fine, but Drizzle includes the migration tool.
- **Raw `pg`.** No types and no migration tooling.
- **Docker Postgres for development.** An extra install on Windows.

## R6. Admin authentication: scrypt password hash in environment variables, opaque session in Postgres, HttpOnly cookie

**Decision**:
- **Credentials.** They live in the server's environment variables: `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`.
  - The hash format is `scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>`, with N=2^15, r=8, p=1, a 16-byte salt and a 32-byte key.
  - It's computed with Node's built-in `crypto.scrypt`, so no extra dependency.
  - `npm run hash-password` is updated to print this format.
- **Login.** On success the server creates 32 random bytes, sets them as cookie `ws_admin` and stores only their SHA-256 in `admin_sessions` with `expires_at = now + 7 days`.
  - Cookie attributes: `HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=604800`.
  - The expiry is absolute: it doesn't extend while the admin keeps using the site.
- **Each admin request** looks up the hash and checks it hasn't expired.
- **Logout** deletes the row, which ends that session (US2-5).
- **Lockout (FR-009).** A row in the `throttles` table, keyed `login:admin`: 5 failures → `locked_until = now + 60 s`. Because the state lives in the database, refreshing or switching browsers doesn't get around it.
- **CSRF.** Every non-GET request must carry an `Origin` header that matches the deployment's own origin (`PUBLIC_ORIGIN` or `ADMIN_ORIGIN`, plus local development origins). That's FR-010. `SameSite=Lax` adds a second layer.

**Rationale**:
- One admin, so no users table is needed. Resetting the password means changing an environment variable and redeploying, which is the reset method the spec's Assumptions describe.
- scrypt is memory-hard and built in. Storing the hash in a server-side environment variable meets FR-007, and it's never sent to the browser (unlike 002's `VITE_` variable).
- Opaque sessions are easy to revoke on logout, unlike stateless JWTs.
- The 002 `AuthService` interface is kept, so screens don't change (contracts/auth.md).

**Alternatives considered**:
- **Auth.js, Clerk or Supabase Auth.** Overkill for one account, and they add another vendor.
- **JWT in a cookie.** Can't be revoked on logout without a denylist.
- **argon2.** Needs native binaries in serverless functions.

## R7. Couple passcode: admin-readable value, stateless signed access cookie, per-couple throttle

**Decision**:
- **Storage.** `couples.passcode` (4 digits) is stored as plain text so the admin can read it back (spec Assumption "Passcode strength"). It's never returned by any public or couple endpoint.
- **Version.** `couples.passcode_version` (int) increases whenever the passcode changes.
- **Unlocking.** `POST /api/public/couples/:slug/unlock` checks the passcode against the `throttles` row `passcode:<coupleId>`:
  - 5 failures → locked for 15 min.
  - Each lockout also writes a `security_events` row, so the dashboard can show its warning when there are 3 or more in 24 h (FR-010d).
- **Access cookie.** On success the server sets `wc_<coupleId>` = `base64url(coupleId.passcodeVersion.expiresAt).HMAC-SHA256(SESSION_SECRET)`.
  - Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=2592000` (30 days).
  - Couple endpoints verify the signature and expiry and that `passcodeVersion` still matches. Changing the passcode therefore ends every existing unlock (FR-010c) without storing any sessions.
- **Comparison.** Passcodes are compared in constant time.

**Rationale**:
- The page link plus the passcode is the couple's "account", and the spec says couples have no logins.
- A signed cookie needs no table and costs nothing to check. The version number gives instant revocation.
- **Throttling per couple rather than per IP** matches the spec ("for that couple's page") and stops spreading guesses across many IPs. The trade-off: a stranger can lock the real couple out for up to 15 minutes. That's acceptable, and the warning flags it.

**Alternatives considered**:
- **Hashing the passcode.** Only 10,000 possible values, so a hash protects nothing. It would also stop the admin from reading the code back.
- **Per-IP throttling only.** Easy to get around with a pool of IPs.

## R8. Guest identity and rate limits

**Decision**:
- **Visitor id.** The server sets cookie `wv` on the first public POST: 16 random bytes, `HttpOnly; Secure; SameSite=Lax; Path=/api; Max-Age=31536000` (1 year). The database stores only `HMAC(SESSION_SECRET, wv)` as `visitor_hash`. That hash is the "same browser" from the spec (FR-017).
- **RSVP.** Saved with `INSERT … ON CONFLICT (couple_id, visitor_hash) DO UPDATE`.
- **Rate limits** (FR-020) use fixed windows in the `rate_limits` table:
  - `wish:<coupleId>:<visitorHash>`: 5 per 10 min (the spec rule)
  - `rsvp:<coupleId>:<visitorHash>`: 5 per 10 min
  - `ip:<coupleId>:<ipHash>`: 30 per 10 min across both types, a backstop for guests who clear their cookies. The IP comes from `x-forwarded-for` (first hop, set by Vercel).
- **Length limits.** Name 2–60 characters, message 3–500 (shared `src/lib/validation.ts`). Wishes are stored as plain text and rendered as text by React, so no HTML is ever interpreted.

**Rationale**: An HttpOnly cookie can't be read or forged by page scripts. Hashing means raw identifiers are never stored. A database counter needs no Redis.

**Alternatives considered**:
- **`localStorage` visitor id.** Readable by scripts and easy to change.
- **Upstash Redis free.** Another vendor for a few counters.
- **CAPTCHA.** Adds friction for guests; may be added later if spam appears.

## R9. Upload flow and the "never save pointing at a missing file" rule

**Decision**: Every upload goes through three steps, all hidden inside `HttpMediaStore.put()` (screens unchanged):
1. **Ask for a signature.** `POST /api/admin/couples/:id/media` with `{ kind, mime, size, width?, height? }`.
   - The server enforces the 002 limits again (FR-012): image ≤ 10 MB, audio ≤ 10 MB, and at most 30 gallery images per couple (checked at save time).
   - It inserts a `media` row with `status = 'pending'` and returns Cloudinary upload parameters with a signature valid for 10 minutes.
2. **Upload.** The browser sends the file directly to Cloudinary, which reports progress.
3. **Confirm.** `POST /api/admin/media/:id/complete` with Cloudinary's response. The server verifies the response signature, `public_id` and `bytes`, then marks the row `ready`.

**Save check**: `PATCH /api/admin/couples/:id` rejects (with 422 `media_not_ready`) any content that refers to a `media:<id>` which isn't `ready` and owned by this couple (FR-015). A failed upload therefore can't end up in a saved couple, and the admin retries that single file.

**Cleanup**:
- Removing media, or deleting a couple, first moves each file to the `media_deletions` table and then deletes it from Cloudinary straight away.
- Any delete that fails is retried by the daily cron job (`/api/cron/cleanup`, one cron on the admin project), which also removes `pending` media older than 24 h.
- Deleting a couple uses Cloudinary's delete-by-prefix (`<root>/<coupleId>/`), which needs one call.

That covers FR-013 and SC-008: deletion is immediate, with a retry within 24 hours.

**Duplicating a couple**: The server copies each media file inside Cloudinary by uploading from the source file's URL to a new public id. No bytes pass through the browser or the function body.

## R10. Local development and end-to-end tests without cloud services

**Decision**:
- **Drivers chosen by environment variables:**
  - `DATABASE_URL=pglite:./.data/dev-db` runs Postgres in-process and saves it to disk.
  - `MEDIA_DRIVER=local` writes files to `.data/media/` and serves them at `/api/dev/media/<key>`. This route is mounted only when `MEDIA_DRIVER=local`.
- **`npm run dev`.** A small Vite plugin, `vite/apiDevServer.ts`, mounts the Hono app at `/api` inside the Vite dev server. It picks the API surface from the request's host: `admin.localhost` gets admin, anything else gets public. That mirrors production with one command.
- **Production build check.** `scripts/serve.ts` (converted from `serve.mjs`, run with tsx) mounts the same Hono app with `@hono/node-server`'s `getRequestListener`. Playwright then runs the end-to-end tests against built sites plus a real API, using a temporary PGlite database and local media.
- **Unit and integration tests.** Vitest calls `app.request()` against a fresh in-memory PGlite database per test file, with migrations applied.

**Rationale**: The spec requires that local development and testing never touch production data. This also keeps development free, works offline and needs no Docker.

## R11. Data layer swap (keeping the screens unchanged)

**Decision**:
- **New classes.** Add `HttpCoupleRepository`, `HttpMediaStore`, `HttpAuthService`, `HttpRsvpService` and `HttpWishService`. They implement the existing interfaces in `src/data/types.ts`, `src/admin/auth/types.ts` and `src/services/types.ts`.
- **Rewiring.** Change only `src/data/index.public.ts`, `src/data/index.admin.ts`, `src/services/index.ts` and the auth provider wiring.
- **Interface additions:**
  - `MediaStore.urlOf(id): string | undefined`. `resolveMedia` uses it before falling back to `getBlob`, so the admin preview uses CDN URLs rather than blob copies.
  - `Couple.passcode` (admin side only).
  - `CoupleSummary.accessWarning`.
  - Service types for couple-facing responses.
- **Delete.** The IndexedDB implementations and the "preview phase" banner (FR-004). `idb` and `fake-indexeddb` stay only as long as the 002 backup reader needs them; it doesn't (the backup is JSON), so they're removed.
- **Public reads.** The public site gets content with media already resolved to absolute URLs from the server, using the shared `mapSources` from `src/data/resolveMedia.ts`. The invitation renders without a media store.
- **Errors.** HTTP errors map to the existing error classes (`ConflictError`, `SlugTakenError`, `NotFoundError`, `ValidationError`) plus new ones: `SessionExpiredError`, `UnavailableError` and `NetworkError`.

## R12. Backup and restore with a 4.5 MB request limit

**Decision**: The browser does the work, and the server only handles small JSON requests.
- **Export**:
  - `GET /api/admin/export` returns couples (including passcode), media metadata with URLs, RSVPs and wishes, with no file bytes.
  - The browser then fetches each media URL from the CDN (Cloudinary sends `Access-Control-Allow-Origin: *`) and writes a format-version-2 file (contracts/backup-format.md).
- **Restore (format v1 from 002 or v2)**. The browser parses and validates the file with the existing zod code, then for each couple:
  1. **Check for conflicts.** `GET /api/admin/import/preflight` returns which ids and slugs already exist, and the admin picks skip, replace or keep both for each conflicting couple (FR-021).
  2. **Create the couple.** `PUT /api/admin/import/couples/:id` creates or replaces it with its **original id** inside a transaction, along with media rows already marked `pending`.
  3. **Upload its media.** Each file goes through the normal 3-step flow using its original media id. Media that is already `ready` is skipped, so running the restore again creates nothing new.
  4. **Responses.** `POST /api/admin/import/couples/:id/responses` adds RSVPs and wishes, skipping ids that already exist.
  5. **Finish.** `POST /api/admin/import/couples/:id/finish` checks that every referenced media file is `ready`. Until then the couple stays in Draf and is flagged "Pemulihan belum selesai".
- **Keep both** gives the restored couple a new id and slug, new media ids, and rewrites its media references (the existing `rewriteMediaRefs`).
- **Passcodes.** Couples imported from v1 get a random passcode (spec edge case).

**Rationale**: No request ever carries file bytes through a function. Restore can be re-run safely after a failure, using the original ids and the `ready` check (US6-3).

## R13. Seeding the sample couple

**Decision**: `npm run db:seed` is a tsx script, safe to run more than once:
- If slug `anisa-raka` doesn't exist, it uploads the sample images and music from `src/content/samples/anisa-raka/` through the configured `MediaProvider`.
- It then inserts the couple as Aktif with the `sampleWishes` as visible wishes, and prints the passcode.
- It runs once per environment (local, production). The end-to-end test setup runs it automatically.
- **Image imports.** The sample content file imports its images (`import coverBg from './images/cover-bg.webp'`), which plain Node can't load. The seed runs with `tsx --import ./scripts/asset-loader.mjs`, a small Node module hook that turns image and audio imports into their absolute file paths. That keeps one sample source shared by Vite and the seed.

The bundled `StaticCoupleRepository` and the sample images leave the public bundle. The landing page's theme examples link to `/anisa-raka?t=N`, which is served from the database (002 FR-010b).

## R14. Caching and freshness

**Decision**:
- **API responses.** Every response sends `Cache-Control: no-store`. At this scale, every page view goes straight to Neon in Singapore, which meets SC-001's "visible within 10 s of publish" with no cache to invalidate.
- **Media.** Each file's public id is a new UUID, so a media URL never points at different content. Cloudinary's long CDN caching is therefore always safe.
- **Static assets.** Hashed files keep their existing caching.

**Alternatives considered**: `s-maxage` with stale-while-revalidate on the edge. Not needed at this scale, and it risks showing a stale couple after publishing.

## R15. Loading and error states (FR-024, SC-003)

**Decision**:
- **Loading state.** The public `CouplePage` shows the existing cover-style loading skeleton while it fetches.
- **Timeouts.** Requests time out after 12 s (`AbortSignal.timeout`). A network error, a timeout or a 5xx response shows `MessagePage` "Undangan sedang tidak dapat dimuat, coba lagi" with a "Coba lagi" button.
- **Admin errors.** The editor keeps form state on any error and shows a toast. On a 401 it opens a re-login dialog over the editor and retries the save after a successful login (US2-4).

## R16. Spreadsheet export

**Decision**: `GET …/rsvps.csv` returns a UTF-8 CSV with a byte-order mark, so Excel shows Indonesian text correctly.
- **Columns:** `Nama, Kehadiran, Jumlah Tamu, Waktu (WIB)`.
- **Safety:** values starting with `= + - @` get a leading apostrophe, to prevent spreadsheet formula injection.
- **Who can use it:** the admin, and the couple through the access cookie.

## Resolved unknowns

All Technical Context items are decided. Nothing is left as NEEDS CLARIFICATION.
