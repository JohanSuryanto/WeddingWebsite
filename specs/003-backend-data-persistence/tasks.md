---

description: "Task list for Server Storage for Couples, Media and Guest Responses"
---

# Tasks: Server Storage for Couples, Media and Guest Responses

**Input**: Design documents from `/specs/003-backend-data-persistence/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (api, data-layer, auth, media-upload, backup-format), quickstart.md

**Tests**: Included. Plan.md § Technical Context commits to:
- Vitest unit tests and API integration tests (Hono `app.request()` + in-memory PGlite)
- Playwright against the built sites plus the real API
- keeping the existing 001 and 002 suites green (SC-007)

**Organization**: Grouped by user story in spec order: US1–US4 (P1), US5–US6 (P2), US7 (P3).

**Rules for every task**:
- **Language.** All UI and API `message` text is Indonesian.
- **One-way imports.** `src/` never imports `server/`. `server/` may import only these pure modules from `src/`: `src/data/schema.ts`, `slug.ts`, `passcode.ts`, `mediaLimits.ts`, `resolveMedia.ts`, `types.ts`, `src/lib/validation.ts` and `src/content/types.ts`.
- **Screens use the swap points.** Screens import data only through `src/data`, `src/services` and `src/admin/auth`.
- **Secrets stay on the server.** They live only in the server environment, never in `VITE_` variables.
- **Uniform API responses.** Every API response uses the error envelope and `Cache-Control: no-store` (contracts/api.md § Conventions).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1–US7)

## Path Conventions

- **Frontends:** `src/` (public entry `index.html` → `src/public-site/`, admin entry `admin.html` → `src/admin/`).
- **Backend:** `server/`. The Vercel entry is `api/index.ts`. Scripts live in `scripts/`.
- **Tests:**
  - `tests/unit` (Vitest, jsdom)
  - `tests/api` (Vitest, node environment, PGlite)
  - `tests/e2e` (public Playwright)
  - `tests/e2e-admin` (admin Playwright)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, configs and tooling for a server tree living beside the two frontends.

- [X] T001 Update `package.json`.
  - **Add dependencies:** `hono`, `@hono/node-server`, `drizzle-orm`, `postgres`, `@electric-sql/pglite`, `cloudinary`.
  - **Add dev dependencies:** `drizzle-kit`, `tsx`, `@types/node` (if missing).
  - **Add scripts:**
    - `"db:generate": "drizzle-kit generate"`
    - `"db:migrate": "tsx scripts/db-migrate.ts"`
    - `"db:seed": "tsx scripts/db-seed.ts"`
    - `"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.server.json"`
  - Run `npm install`.
- [X] T002 [P] Create `tsconfig.server.json`.
  - Extends `tsconfig.json`, with `"types": ["node"]`, `"lib": ["ES2023"]` (no DOM) and `module`/`moduleResolution` `NodeNext` or `Bundler` to match.
  - `include`: `server/**/*.ts`, `api/**/*.ts`, `scripts/**/*.ts`, `vite/**/*.ts`, `drizzle.config.ts`, and the shared `src` files listed in the rules above.
  - Exclude `server`, `api` and `scripts` from the root `tsconfig.json`.
- [X] T003 [P] Edit `eslint.config.js`.
  - Add a `no-restricted-imports` rule for `src/**` that forbids `**/server/**` and `**/api/**`.
  - Add a Node-globals config block for `server/**`, `api/**`, `scripts/**` and `vite/**`.
- [X] T004 [P] Rewrite `.env.example` to the variables in quickstart.md §1 and §4, each with a comment:
  - `DATABASE_URL`, `MEDIA_DRIVER`, `MEDIA_ROOT`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET`
  - `PUBLIC_ORIGIN`, `ADMIN_ORIGIN`, `API_SURFACE`, `VITE_PUBLIC_SITE_URL`
  
  Remove `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD_SHA256`. Add `.data/` to `.gitignore`.
- [X] T005 [P] Set up one deployment config for both sites. Today the admin site is a static deploy of `dist/admin`, which would not include `api/index.ts`. From now on, both Vercel projects deploy from the **repository root**, so both get the `api/` function.
  - **Rewrite the root `vercel.json`** to:
    ```json
    {
      "regions": ["sin1"],
      "rewrites": [
        { "source": "/api/(.*)", "destination": "/api" },
        { "source": "/(.*)", "has": [{ "type": "host", "value": "admin.wedding.johansuryanto.dev" }], "destination": "/admin.html" },
        { "source": "/(.*)", "destination": "/index.html" }
      ],
      "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 19 * * *" }]
    }
    ```
    The cron runs at 02:00 WIB.
  - **Delete `admin-static/vercel.json`.** Keep `admin-static/_redirects` for Netlify-style hosts.
  - **Per-project Vercel settings:**

    | Project | Root directory | Build command | Output directory |
    |---|---|---|---|
    | Public | repository root | `npm run build:public` | `dist/public` |
    | Admin | repository root | `npm run build:admin` | `dist/admin` |
  - **Document this** in `README.md` § Deploy, replacing the static-hosting table.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, HTTP framework, test harness, media provider, shared types and the basic admin session that every admin endpoint depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Server core

- [X] T006 Create `server/env.ts`. It exports `loadEnv(source = process.env)`, which parses with zod and returns a typed `Env`:
  - `DATABASE_URL` (`postgres://…` or `pglite:<path>` or `pglite:memory`)
  - `MEDIA_DRIVER` (`cloudinary` | `local`, default `local`), `MEDIA_ROOT` (default `wedding/dev`), and the `CLOUDINARY_*` variables, required when the driver is `cloudinary`
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (optional when `API_SURFACE=public`)
  - `SESSION_SECRET`, at least 32 characters
  - `CRON_SECRET` (optional)
  - `PUBLIC_ORIGIN`, `ADMIN_ORIGIN`
  - `API_SURFACE` (`public` | `admin` | `both`, default `both`; `both` is for development and tests only)
  - `LOCAL_MEDIA_DIR` (default `.data/media`)
  
  Failures throw one error that lists every missing variable.
- [X] T007 Create `server/db/schema.ts` with Drizzle definitions of all 9 tables in data-model.md:
  - **`couples`:**
    - `id` uuid PK, `slug` text UNIQUE NOT NULL
    - `status` text NOT NULL default `'draft'` with CHECK `('draft','active')`
    - `default_theme` text NOT NULL CHECK `IN ('romantic-floral','elegant-classic','rustic-garden')` (the `ThemeId` values), `content` jsonb NOT NULL
    - `version` integer NOT NULL default 1
    - `passcode` char(4) NOT NULL CHECK `~ '^\d{4}$'`, `passcode_version` integer NOT NULL default 1
    - `restore_pending` boolean NOT NULL default false
    - `created_at`, `updated_at` timestamptz NOT NULL
  - **`media`:**
    - `id` uuid PK, `couple_id` FK ON DELETE CASCADE
    - `kind` CHECK `('image','audio')`, `mime` text NOT NULL, `size` integer NOT NULL
    - `width`/`height` integer NULL
    - `provider_key` text NOT NULL UNIQUE, `url` text NULL
    - `status` CHECK `('pending','ready')`, `created_at`
  - **`rsvps`:**
    - `id`, `couple_id` FK CASCADE, `visitor_hash` text NOT NULL
    - `name` text NOT NULL, `attendance` CHECK `('hadir','tidak_hadir')`, `guest_count` smallint NOT NULL
    - `submitted_at`, `updated_at`
    - UNIQUE `(couple_id, visitor_hash)`
  - **`wishes`:**
    - `id`, `couple_id` FK CASCADE, `visitor_hash` text NULL
    - `name`, `message` text NOT NULL, `attendance` text NULL
    - `hidden` boolean NOT NULL default false, `created_at`
    - index `(couple_id, created_at DESC, id DESC)`
  - **`admin_sessions`:** `token_hash` text PK, `created_at`, `expires_at`, `user_agent` NULL
  - **`throttles`:** `key` text PK, `failures` smallint NOT NULL default 0, `locked_until` timestamptz NULL
  - **`security_events`:** bigserial `id`, `kind` text NOT NULL, `couple_id` uuid NULL FK CASCADE, `created_at`
  - **`rate_limits`:** `bucket` text PK, `window_start` timestamptz NOT NULL, `count` integer NOT NULL
  - **`media_deletions`:** `provider_key` text PK, `resource_type` CHECK `('image','video','prefix')`, `attempts` smallint NOT NULL default 0, `created_at`
- [X] T008 Create `drizzle.config.ts` (schema `server/db/schema.ts`, out `server/db/migrations`, dialect `postgresql`). Run `npm run db:generate` to produce and commit the initial SQL migration in `server/db/migrations/`. Depends on T007.
- [X] T009 Create `server/db/client.ts`.
  - `createDb(databaseUrl)` returns a Drizzle instance:
    - `pglite:memory` or `pglite:<path>`: `drizzle-orm/pglite` with `new PGlite(path?)`.
    - Anything else: `drizzle-orm/postgres-js` with `postgres(url, { prepare: false, max: 1 })`.
  - `migrateDb(db)` applies `server/db/migrations` using the migrator that matches the driver.
  - Cache one instance per URL at module level, so warm function invocations reuse it.
- [X] T010 [P] Create `scripts/db-migrate.ts`. It loads `.env.local` with `process.loadEnvFile` when present, calls `migrateDb(createDb(DATABASE_URL))` and logs "Migrasi selesai". Depends on T009.
- [X] T011 [P] Create `server/http/errors.ts`.
  - `class ApiError(status, code, message, extra?: { fields?, retryAt? })` plus factories for every code in the contracts/api.md table:
    - `invalidBody`, `unauthenticated`, `badOrigin`, `unavailable`, `notFound`, `conflict`, `slugTaken`, `tooLarge`
    - `validation`, `slugReserved`, `mediaNotReady`, `limitExceeded`, `notPublishable`, `locked`, `rateLimited`
  - Also export `toResponse(err)`, which produces `{ error: { code, message, fields?, retryAt? } }`. Unknown errors become 500 "Terjadi kesalahan di server", with the details logged.
- [X] T012 [P] Create `server/http/middleware.ts`:
  - **`noStore`:** sets `Cache-Control: no-store`.
  - **`bodyLimit`:** 256 KB → `tooLarge`.
  - **`originCheck(allowed: string[])`:** on non-GET/HEAD requests, the `Origin` header must be in the list, otherwise `badOrigin`. The allowed list is `PUBLIC_ORIGIN`, `ADMIN_ORIGIN` and, when either is `http://`, also `http://localhost:*`, `http://admin.localhost:*`.
  - **`clientIp(c)`:** the first `x-forwarded-for` hop, else `x-real-ip`, else `'0.0.0.0'`.
- [X] T013 [P] Create `server/http/cookies.ts`: `setCookie(c, name, value, maxAgeSec)` and `clearCookie(c, name)` with `HttpOnly; SameSite=Lax; Path=/api` and `Secure` only when the request URL is https. Also `getCookie`, and `hmac(secret, data)` / `safeEqual(a, b)` using `node:crypto` `createHmac`/`timingSafeEqual`.
- [X] T014 Create `server/app.ts`. `createApp(env: Env, deps?: { db?, media? })` builds a Hono app with `basePath('/api')`.
  - Applies `noStore`, `bodyLimit` and `originCheck` globally, and `onError(toResponse)`.
  - Mounts route groups by `API_SURFACE` exactly as in contracts/api.md: public→`public`+`couple`; admin→`admin`+`public`+`cron`; both→all. `devMedia` is mounted only when `MEDIA_DRIVER=local`.
  - `notFound` returns `notFound()`.
  - Route modules start as empty Hono routers in `server/routes/{public,couple,admin,adminMedia,adminResponses,adminImport,cron,devMedia}.ts`.
  
  Depends on T006, T009, T011–T013.
- [X] T015 [P] Create `api/index.ts`: `import { handle } from 'hono/vercel'`, `export default handle(createApp(loadEnv()))`. Also `export const config = { runtime: 'nodejs' }` if Vercel requires it. Depends on T014.
- [X] T016 Create `vite/apiDevServer.ts`, a Vite plugin with `configureServer(server)`.
  - It loads `.env.local`, runs `migrateDb` once, and builds two apps with `createApp`: `API_SURFACE=admin` for hosts starting with `admin.` and `public` otherwise.
  - It mounts them with `getRequestListener` from `@hono/node-server` for `req.url` starting with `/api`.
  - Register it in `vite.config.ts` next to `devHostRouting()`.
  
  Depends on T014.
- [X] T017 Convert `scripts/serve.mjs` to `scripts/serve.ts` (run with `tsx`).
  - Keep the static serving and byte ranges.
  - Before static handling, send `/api/*` to the same per-host `createApp` pair as T016, using `process.env`.
  - Update `package.json` `preview` to `tsx scripts/serve.ts 4817`.
  
  Depends on T014.

### Shared code and media

- [X] T018 [P] Create `src/data/passcode.ts`: `PASSCODE_PATTERN = /^\d{4}$/`, `isValidPasscode(s)`, and `randomPasscode()` using `crypto.getRandomValues` (works in the browser and Node 22). Add `tests/unit/passcode.test.ts`: the pattern, 1,000 random values all valid, and a spread of first digits.
- [X] T019 [P] Create `src/data/mediaLimits.ts`.
  - **Move** `MAX_UPLOAD_BYTES = 10 * 1024 * 1024` from `src/admin/media/compressImage.ts` and re-import it there.
  - **Add:**
    - `MAX_AUDIO_BYTES = 10 * 1024 * 1024`
    - `MAX_GALLERY = 30`
    - `IMAGE_MIMES = ['image/webp','image/jpeg','image/png']`
    - `AUDIO_MIMES = ['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav']`
    - `checkMediaLimits(kind, mime, size)`, which returns an Indonesian message ("Ukuran maksimal 10 MB" / "Jenis file tidak didukung") or `null`
  - Check `src/admin/editor` and the schema for an existing gallery limit constant and reuse it, so there's a single source.
- [X] T020 Extend `src/data/types.ts` additively, per contracts/data-layer.md:
  - `Couple.passcode: string`; `NewCouple` gains `passcode?: string`; `CoupleSummary` gains `accessWarning: boolean; restorePending: boolean`.
  - `MediaStore.urlOf?(id)`; `UsageReport` (`usedBytes`, `quotaBytes`, `percent`, `warn`, `label`) as the `usage()` return type.
  - `PublicCouple`, `CoupleGate`, `RsvpRecord`, `RsvpTotals`, `WishRecord`, `Page<T>`.
  - Error classes `SessionExpiredError`, `UnavailableError`, `NetworkError`, `LockedOutError { retryAt: Date }`, `RateLimitedError { retryAt: Date }`, `InvalidPasscodeError`.
  
  Move `LockedOutError` out of `src/admin/auth/types.ts` and re-export it there. Fix the compile errors in `StorageMeter.tsx` and anywhere else that reads `usage()`.
- [X] T021 Create `src/data/http/client.ts`.
  - `apiFetch<T>(path, { method = 'GET', body?, signal? })`: same-origin `'/api' + path`, `credentials: 'same-origin'`, JSON body and response, signal `AbortSignal.any([signal, AbortSignal.timeout(12_000)])`.
  - **Error mapping** per the contracts/api.md table:
    - 400/413/422 → `ValidationError(fields)`
    - 401 → `SessionExpiredError`
    - 403 `unavailable` → `UnavailableError`
    - 404 → `NotFoundError`
    - 409 `conflict` → `ConflictError`; 409 `slug_taken` → `SlugTakenError`
    - 423 → `LockedOutError`
    - 429 → `RateLimitedError`
    - network, abort or 5xx → `NetworkError`
  - Also export `onUnauthorized(listener)`, which fires when any `/admin/` call gets 401.
  - Add `tests/unit/apiClient.test.ts` with a mocked `fetch` covering every mapping.
- [X] T022 Create `server/media/provider.ts` with the `MediaProvider` and `UploadTicket` interfaces from contracts/media-upload.md, plus `upload(key, bytes: Uint8Array, kind, mime): Promise<{ url, bytes, width?, height? }>`, a server-side upload used by the seed and by `copy`. Add `keyFor(root, coupleId, mediaId)` → `${root}/${coupleId}/${mediaId}` and `createMediaProvider(env)`.
- [X] T023 Create `server/media/local.ts` (`LocalProvider`, files under `LOCAL_MEDIA_DIR/<key>`):
  - **Ticket:** URL `/api/dev/media/upload/<key>`, `fields.sig = hmac(SESSION_SECRET, key|maxBytes|exp)`, `fileField: 'file'`, `expiresAt` +10 min.
  - **`verifyUpload`:** checks the stored sidecar `<key>.json` written by the upload route.
  - **Other methods:** `copy`/`remove`/`removePrefix` use `fs`. `usage` = total bytes vs 1 GB, unit `bytes`. `url` = `/api/dev/media/<key>`.
  
  Implement `server/routes/devMedia.ts`:
  - `POST /dev/media/upload/*` checks the signature, expiry and size, writes the file and its sidecar `{ bytes, mime, signature }`, and returns that JSON.
  - `GET /dev/media/*` streams the file with the right `Content-Type` and supports byte ranges (copy the logic from `scripts/serve.ts`).
  
  Depends on T022.

### Basic admin session (every admin endpoint needs it)

- [X] T024 [P] Create `server/auth/password.ts`. `hashPassword(pw)` produces `scrypt$32768$8$1$<saltB64>$<hashB64>` (16-byte salt, 32-byte key, `maxmem` 64 MB). `verifyPassword(pw, stored)` uses `timingSafeEqual`, and `DUMMY_HASH` is for constant-time misses.
  - Rewrite `scripts/hash-password.mjs` to print this format, as `scripts/hash-password.ts` via tsx; update the `package.json` script.
  - Add `tests/unit/password.test.ts` (round trip, wrong password, malformed hash → false).
- [X] T025 [P] Create `server/db/repos/throttles.ts`.
  - **`check(db, key, now)`** returns `{ lockedUntil }` or null.
  - **`fail(db, key, { max, lockMs }, now)`** increments `failures`. At `max`, it sets `locked_until = now + lockMs`, resets `failures` to 0 and returns `{ locked: true, retryAt }`.
  - **`succeed(db, key)`** deletes the row.
  - **`recordEvent(db, kind, coupleId|null)`** inserts into `security_events`.
  - **`lockoutCount(db, coupleId, sinceHours = 24)`**.
- [X] T026 Create `server/auth/admin.ts` and the session parts of `server/routes/admin.ts`.
  - **`POST /admin/login`:**
    - Validates `{ email, password }`.
    - Checks the throttle `login:admin`; if locked → `locked(retryAt)` with message "Terlalu banyak percobaan. Coba lagi dalam {n} detik.".
    - Compares the email case-insensitively and checks the password with `verifyPassword`, using `DUMMY_HASH` when the email doesn't match.
    - On failure: `fail(…, { max: 5, lockMs: 60_000 })` and `unauthenticated('Email atau kata sandi salah')`. When that failure triggers the lockout, return 423 instead and record a `login_lockout` event.
    - On success: `succeed`, 32 random bytes → cookie `ws_admin` (Max-Age 604800), insert `admin_sessions(token_hash = sha256, expires_at = now + 7 days, user_agent)`, and return `{ session: { email, expiresAt } }`.
  - **`POST /admin/logout`** deletes the row and clears the cookie (204).
  - **`GET /admin/session`** returns the session or null.
  - **`requireAdmin`** middleware, applied to every other `/admin/*` route, returns 401 `unauthenticated` when the cookie is missing, unknown or expired.
  
  Depends on T024, T025.
- [X] T027 Create `src/admin/auth/HttpAuthService.ts` implementing `AuthService` from contracts/auth.md: `init()` (GET session), `login`, `logout`, `current()` (cached), `subscribe`, and a `BroadcastChannel('admin-auth')` to sync other tabs. Errors: 401 → `InvalidCredentialsError`, 423 → `LockedOutError(retryAt)`.
  - Wire it in `src/admin/auth/AuthProvider.tsx`. `AdminApp` waits for `init()`, showing a centered spinner, before rendering routes.
  - Delete `src/admin/auth/LocalAuthService.ts` and `tests/unit/auth.test.ts`.
  - Remove `VITE_ADMIN_*` references from `src/vite-env.d.ts`.
- [X] T028 Create `tests/api/harness.ts`, exporting:
  - `makeTestApp(overrides?)`, which creates a temporary `LOCAL_MEDIA_DIR` (os.tmpdir) and `pglite:memory`, runs `migrateDb`, and calls `createApp({ …testEnv, API_SURFACE: 'both' })`. `ADMIN_PASSWORD_HASH` = `hashPassword('rahasia123')`, computed once.
  - `req(app, method, path, { body?, cookie?, origin? = ADMIN_ORIGIN })`, which returns `{ status, json, cookies }`.
  - `loginAdmin(app)`, which returns the `ws_admin` cookie string.
  
  Add a `tests/api` project to `vite.config.ts` `test` with environment `node` (use `test.projects`, or a separate `vitest.api.config.ts` run by `npm test`).
- [X] T029 Add `tests/api/session.test.ts`: a successful login sets the cookie, `GET /admin/session` with the cookie returns the email, logout makes the cookie stop working (US2-5 basis), and a wrong password returns 401 with message "Email atau kata sandi salah".
- [X] T030 Update `playwright.config.ts`.
  - **webServer:**
    - command `npm run build && tsx scripts/serve.ts 4817`
    - env `DATABASE_URL=pglite:./.data/e2e-db`, `MEDIA_DRIVER=local`, `LOCAL_MEDIA_DIR=.data/e2e-media`
    - `ADMIN_EMAIL=admin@test.local`, `ADMIN_PASSWORD_HASH` computed in the config with `node:crypto.scryptSync` in the T024 format for `rahasia123`
    - `SESSION_SECRET` (fixed test value), `PUBLIC_ORIGIN=http://localhost:4817`, `ADMIN_ORIGIN=http://admin.localhost:4817`
  - **globalSetup:** add `tests/global-setup.ts`, which deletes `.data/e2e-*` before the server starts.
  - Remove the `TEST_ADMIN.hash` SHA-256 export and `VITE_ADMIN_*`. Keep the viewports and projects unchanged.

**Checkpoint**: `npm run dev` serves both sites with `/api` mounted. Admin login works against the server. `npm test` runs the unit and API suites.

---

## Phase 3: User Story 1 - A couple saved in the admin goes live on the public address (Priority: P1) 🎯 MVP

**Goal**: Couples are stored in Postgres and created and edited from the existing dashboard. Guests on any device see published couples at `/<slug>`, drafts show "Undangan belum tersedia", and outages show a retry message.

**Independent Test**: quickstart V1–V3, V7 and V23. Create and publish "Budi & Sari" in the admin. Open `/budi-sari` in a fresh browser profile. Edit and refresh. Set Draf and confirm the response has no content.

### Tests for User Story 1

- [X] T031 [P] [US1] Write `tests/api/couples.test.ts` (fails until T033–T036 are done). It covers:
  - Create with only nicknames (`emptyContent` from `src/data/emptyContent.ts` + names) → 201: status `draft`, version 1, a random 4-digit passcode when none is given. Content missing `cover`/`couple`/`events`/`closing` → 422.
  - A duplicate slug → 409 `slug_taken`; a reserved slug (`login`) → 422 `slug_reserved`.
  - `PATCH` with a stale `expectedVersion` → 409 `conflict` and nothing changes.
  - `PATCH` content that fails `weddingContentSchema` → 422 with `fields`.
  - Status → `active` on an incomplete draft → 422 `not_publishable` whose message is the `firstContentProblem` text. On complete content → 200.
  - Media basics (LocalProvider): ticket → upload → complete → `ready`. `PATCH` content referencing a `pending` id or another couple's media → 422 `media_not_ready`.
  - List is newest updated first, with `names`, `mainDate`, `coverSrc`, `accessWarning`, `restorePending`.
  - `DELETE` removes the couple; `GET /public/couples/:slug` returns 200 when active, 403 `unavailable` with **no `content` key** when draft, 404 when unknown.
  - Public responses never contain `passcode`, `passcode_version` or `media:` refs.
- [X] T032 [P] [US1] Write `tests/api/surfaces.test.ts`:
  - With `API_SURFACE=public`, every `/api/admin/*` path and `/api/cron/cleanup` → 404, and `/api/public/couples/x` → 404 `not_found` (mounted).
  - With `admin`, `/api/couple/*` → 404.
  - A POST without `Origin` or with a foreign `Origin` → 403 `bad_origin`.
  - A body over 256 KB → 413.

### Implementation for User Story 1

- [X] T033 [US1] Create `server/db/repos/couples.ts`:
  - **`list`** (summaries computed from `content`, like `IndexedDbCoupleRepository`): `names` = "bride & groom" nicknames, `mainDate` = start of the main event, `coverSrc`. `accessWarning = lockoutCount ≥ 3`, `restorePending`.
  - **`get`**, **`findBySlug(slug, { includeDrafts })`**.
  - **`create`:**
    - Validates the slug with `SLUG_PATTERN` and `isReservedSlug` from `src/data/slug.ts`.
    - Validates the content for **structure only**, with `storedContentSchema`. Move that schema out of `src/data/backup.ts` (`storedCoupleSchema.content`) into `src/data/schema.ts` and export it; `backup.ts` imports it back. Drafts may be unfinished (data-model.md § Content validation).
    - The passcode is `randomPasscode()` unless one is given and valid.
    - Maps a unique violation to `slugTaken`.
  - **`update(id, patch, expectedVersion)`:**
    - When `patch.content` is present, validate it with the **full** `weddingContentSchema` (the editor form already requires that).
    - Then a single `UPDATE … WHERE id AND version = expected RETURNING *` that sets `version = version + 1`. When `patch.passcode` differs, it also sets `passcode_version = passcode_version + 1`.
    - Zero rows → `conflict` (or `notFound` when the id is missing).
  - **`setStatus`:** `active` requires full `weddingContentSchema` success (otherwise `notPublishable(firstContentProblem(content))`) and `restore_pending = false` (otherwise `notPublishable('Pemulihan belum selesai')`).
  - **Media references.** `create`, `update` and `setStatus('active')` all call `assertReferencesReady` from T034.
  - **`remove`**.
  
  Row↔`Couple` mapping returns ISO strings.
- [X] T034 [US1] Create `server/lib/publicContent.ts`. `toPublicCouple(couple, mediaUrlById)` uses `mapSources` from `src/data/resolveMedia.ts` to replace each `media:<id>` with its `ready` URL (missing → `''`) and returns `PublicCouple { slug, defaultTheme, content }`.

  Also create `server/db/repos/media.ts` with the basics the editor needs. A couple can't be saved without its required cover and portrait photos (`schema.ts`), so uploads must work in US1:
  - `readyUrls(db, coupleId)` → `Map<id, url>`
  - `createPending(coupleId, meta, id?)`, `markReady(id, verified)`, `get`, `listForCouple`, `deleteRows(ids)`
  - `assertReferencesReady(coupleId, content)`, which uses `collectMediaRefs` and throws `mediaNotReady({ fields: { media: missingIds } })` for any ref that isn't `ready` or belongs to another couple
  
  US3 (T055) adds limits and the deletion queue.
- [X] T035 [US1] Implement the couple routes in `server/routes/admin.ts`, behind `requireAdmin`. Validate bodies with zod, using `NewCouple` fields + `passcode` (`PASSCODE_PATTERN`):
  - `GET /admin/couples`, `POST /admin/couples`
  - `GET /admin/couples/:id` and `GET /admin/couples/by-slug/:slug`, both returning `{ couple, media: Record<id, MediaInfo> }`
  - `PATCH /admin/couples/:id` `{ expectedVersion, patch }`
  - `POST /admin/couples/:id/status`, `DELETE /admin/couples/:id`
  - `POST /admin/couples/:id/duplicate`: new draft, unique `-salinan` slug (reuse the existing slug helper), new passcode, same content. US3 adds media copying.
  
  Also create `server/routes/adminMedia.ts` (behind `requireAdmin`) with the basic upload routes. They use `createMediaProvider(env)`, so they work with `LocalProvider` now and with Cloudinary after T054:
  - `POST /admin/couples/:id/media` `{ kind, mime, size, width?, height?, id? }` → `createPending` with key `keyFor(MEDIA_ROOT, coupleId, mediaId)`, then return `{ media, upload: createUploadTicket(key, kind, MAX_UPLOAD_BYTES) }`
  - `POST /admin/media/:id/complete` → `verifyUpload`, then `markReady`
  - `DELETE /admin/media/:id` → `provider.remove` + delete the row
  - `POST /admin/couples/:id/media/prune` `{ referenced }` → remove this couple's media not in the list
  
  US3 (T056) adds limit checks, the deletion queue and `GET /admin/usage`.
- [X] T036 [US1] Implement `GET /public/couples/:slug` in `server/routes/public.ts`:
  - 404 `notFound('Undangan tidak ditemukan')`
  - draft → `unavailable('Undangan belum tersedia')` with no content
  - active → `{ couple: toPublicCouple(...) }`
- [X] T037 [US1] Create `src/data/http/HttpCoupleRepository.ts`, implementing `CoupleRepository` over the T035 endpoints with `apiFetch`. `findBySlug(slug, { includeDrafts })` uses `by-slug`. It calls `httpMediaStore.prime(mediaMap)` with each couple response's `media` map, so `urlOf` works. Dates are kept as ISO strings.
- [X] T038 [US1] Create `src/data/http/HttpMediaStore.ts`:
  - `prime(map)`, `urlOf(id)` and `getBlob(id)` (fetch `urlOf(id)` → blob, or null).
  - **`put(coupleId, blob, meta)`** runs the 3 steps from contracts/media-upload.md with `fetch`:
    1. POST the ticket.
    2. POST `FormData` (`...upload.fields`, `[fileField]: blob`) to `upload.url`.
    3. POST `complete`.
    
    Then `prime` the URL and return `StoredMedia`. Errors: `ValidationError` from steps 1 and 3, `NetworkError` from step 2.
  - **`remove`** → `DELETE /admin/media/:id`. **`removeUnreferenced`** → `prune`.
  - **`usage()`** returns `{ usedBytes: 0, quotaBytes: null, percent: 0, warn: false, label: '' }` until T059.
  
  T059 adds upload progress and the real usage numbers.
- [X] T039 [US1] Change `resolveMedia` in `src/data/resolveMedia.ts` to use `store.urlOf?.(id)` before `getBlob`. URLs from `urlOf` aren't added to `created`, so `dispose` doesn't revoke them. Extend `tests/unit/resolveMedia.test.ts` (create it if missing) for the `urlOf` path.
- [X] T040 [US1] Create `src/data/http/HttpPublicCoupleSource.ts`. `get(slug)` calls `GET /public/couples/:slug` and returns `PublicCouple`, throwing `NotFoundError`, `UnavailableError` or `NetworkError`.
- [X] T041 [US1] Rewire the data layer:
  - `src/data/index.admin.ts` exports `coupleRepository = new HttpCoupleRepository()`, `mediaStore = httpMediaStore`, `ready = Promise.resolve()`.
  - `src/data/index.public.ts` exports `publicCouples = new HttpPublicCoupleSource()`.
  - **Delete** `src/data/indexeddb/` and `src/data/static/`, and remove `idb` and `fake-indexeddb` from `package.json` and from `tests/setup.ts`.
  - **Replace** `tests/unit/repository.test.ts` with nothing (it's covered by `tests/api/couples.test.ts`).
  - Remove the `SAMPLE_COUPLES` import from the public bundle. `src/content/samples` stays only for the seed script and the landing-page texts that still need it.
- [X] T042 [US1] Update `src/public-site/pages/CouplePage.tsx`:
  - Load with `publicCouples.get(slug)`, showing the existing loading skeleton (or a cover-style placeholder) while pending.
  - `NotFoundError` → `NotFound.tsx`; `UnavailableError` → `Unavailable.tsx` ("Undangan belum tersedia").
  - `NetworkError` → `MessagePage` with title "Undangan sedang tidak dapat dimuat, coba lagi" and a "Coba lagi" button that re-runs the fetch (FR-024).
  - Render the invitation with the `PublicCouple` content and `defaultTheme`, keeping the `inv` and `t` behaviour.
  
  Update `src/public-site/pages/CoupleSendInvitation.tsx` the same way, temporarily, for active couples. US4 replaces this with the gate.
- [X] T043 [US1] Update the admin screens for the HTTP repository:
  - `src/admin/AdminLayout.tsx`: remove the preview-phase banner (002 FR-019).
  - `src/admin/preview/FullPreviewPage.tsx` and `AdminSendInvitationPage.tsx`: use `findBySlug(…, { includeDrafts: true })`.
  - `src/admin/couples/CoupleListPage.tsx`: handle `NetworkError` with an error state and "Coba lagi".
  - The editor (`src/admin/editor/useCoupleForm.ts`): on `ConflictError` keep showing the existing "sudah diubah" warning; on `NetworkError` show the toast "Gagal menyimpan. Periksa koneksi lalu coba lagi." and keep form state.
  - **Publish refused.** "Terbitkan" in `src/admin/couples/CoupleListPage.tsx` and `src/admin/editor/tabs/PengaturanTab.tsx` (via `EditorPage.tsx` `setStatus`): on a `ValidationError` from a 422 `not_publishable`, show the toast "Belum bisa diterbitkan: {message}". The message is the server's first content problem, so the admin knows what to fill in. 002 published without checking; this is the only new step (SC-007).
  - Hide the "Cadangan" navigation link and route in `src/admin/AdminApp.tsx` behind `const BACKUP_ENABLED = false` until US6 (its IndexedDB backup code no longer works).
- [X] T044 [US1] Create `scripts/db-seed.ts`. It's safe to run more than once:
  - Load `.env.local` if present, then `createDb` and `createMediaProvider`.
  - If slug `anisa-raka` is missing:
    - Insert the couple from `src/content/samples/anisa-raka/content.ts` with status `active`, default theme `'romantic-floral'` (`DEFAULT_THEME`) and a `randomPasscode()`.
    - Upload every local image and `backsound.wav` referenced by the sample with `provider.upload` under new media ids (status `ready`), and rewrite `src` to `media:<id>` with `mapSources`.
    - Insert `sampleWishes` into `wishes` (`visitor_hash` NULL).
  - Print `Anisa & Raka siap. Kode akses: ####`.
  - **Image imports under Node.** `content.ts` does `import coverBg from './images/cover-bg.webp'`, which plain Node/tsx can't load. Create `scripts/asset-loader.mjs`, a Node module-customization hook (`module.register`), that resolves `.webp`, `.jpg`, `.png`, `.wav` and `.mp3` imports to a module whose default export is the file's absolute path.
    - Run the seed with `tsx --import ./scripts/asset-loader.mjs scripts/db-seed.ts`; update the `db:seed` script in `package.json`.
    - The seed then reads each `src` path with `fs.readFile` before uploading.
- [X] T045 [US1] Make the e2e suites run against the API:
  - `tests/global-setup.ts` runs migrate + seed against the e2e database **after** cleanup, then saves the printed passcode to `.data/e2e-passcode.txt` for US4 specs.
  - Update `tests/e2e-admin/helpers.ts` so `login()` still goes through the UI.
  - Fix the 002 admin specs that relied on IndexedDB state: each spec creates its own couple with a unique slug, e.g. `budi-sari-${test.info().workerIndex}-${Date.now()}`. `fillRequired` keeps uploading the photos through the UI; that works now through T038 + `LocalProvider`.
  - Remove `tests/e2e-admin` checks of the 002 preview-phase banner and the IndexedDB backup page (backup returns in US6).
  - Run `npm run test:e2e`. The public suites must pass unchanged against the seeded `/anisa-raka` (SC-007).
- [X] T046 [P] [US1] Add `tests/e2e/error-state.spec.ts`. Route `**/api/public/couples/**` to abort, then assert "Undangan sedang tidak dapat dimuat, coba lagi" is shown. Unroute, click "Coba lagi", and assert the cover appears. Add `tests/e2e-admin/publish-live.spec.ts`: create and publish a couple in the admin, then in a **new browser context** open `http://localhost:4817/<slug>` and assert the names (SC-001), set it to Draf, reload, and assert "Undangan belum tersedia".

**Checkpoint**: The MVP. Couples live in the database and appear on the public site from any device without a redeploy.

---

## Phase 4: User Story 2 - Only the admin can change data (Priority: P1)

**Goal**: Login lockout enforced by the server, every write protected (SC-002), revocable sessions, and re-login without losing edits.

**Independent Test**: quickstart V4–V6 and V8.

### Tests for User Story 2

- [X] T047 [P] [US2] Write `tests/api/admin-protection.test.ts`.
  - **SC-002 sweep.** Iterate over a table of **every** admin route (method + path from contracts/api.md, including media, responses, import and usage) and assert 401 `unauthenticated` without a cookie, with a fake cookie, and with an expired session. To get an expired session, set the row's `expires_at` in the past.
  - Also assert a POST with a valid session but a foreign `Origin` → 403.
  - Add an "every route is in the table" check: walk `app.routes` and fail if an `/api/admin/` route (except `login`, `session`) is missing from the table.
  - **The table grows with the stories.** Start it with the routes that exist when US2 is built (T026, T035). Each later story that adds admin routes (T056, T079, T087, T093) must add them to the table. The "every route" check fails otherwise, and T100 re-runs it.
- [X] T048 [P] [US2] Write `tests/api/lockout.test.ts`:
  - 5 wrong passwords → the 5th returns 423 with `retryAt` ≈ now+60 s.
  - The correct password while locked → still 423, and the password isn't checked (spy on `verifyPassword`).
  - Once the lock passes (fake time), a success → 200 and the throttle row is deleted.
  - A `login_lockout` security event is recorded.

### Implementation for User Story 2

- [X] T049 [US2] Lockout UI in `src/admin/auth/LoginPage.tsx`. On `LockedOutError` from the server, disable the form and count down "Terlalu banyak percobaan. Coba lagi dalam {n} detik." from the server's `retryAt`. On `InvalidCredentialsError`, show "Email atau kata sandi salah" and clear the password field (002 behaviour).
- [X] T050 [US2] Create `src/admin/auth/ReloginDialog.tsx` and wire it into `src/admin/AdminLayout.tsx`.
  - Subscribe to `onUnauthorized` (T021) and `HttpAuthService` `'expired'`, then open a modal (existing `Dialog.tsx`) titled "Sesi berakhir, silakan masuk lagi" with the email (prefilled) and password fields.
  - On success, close and resolve a pending `retry()` promise.
  - In `src/admin/editor/useCoupleForm.ts`, on `SessionExpiredError` during save: keep form values, wait for the dialog's retry promise, then repeat the save once (US2-4).
  - Log out from other tabs through `BroadcastChannel`.
- [X] T051 [US2] Write `tests/e2e-admin/relogin.spec.ts`:
  - Log in, open a couple editor, then clear the session cookie with `context.clearCookies({ name: 'ws_admin' })`.
  - Change the bride's nickname and press "Simpan". The dialog appears; log in through it.
  - Assert the toast "Tersimpan" and that a reload shows the new nickname.
  
  Extend `tests/e2e-admin/login.spec.ts`: after 5 wrong attempts, a **second browser context** also shows the lockout message (server-enforced, FR-009).

**Checkpoint**: Writes are impossible without a valid server session, and session expiry never loses edits.

---

## Phase 5: User Story 3 - Photos and music are stored online (Priority: P1)

**Goal**: Build on the basic local upload from US1 (T034, T035, T038). This adds the Cloudinary provider for production, server-side limits, reliable deletion of unused files, upload progress, per-file retry and the usage meter.

**Independent Test**: quickstart V9–V11. Upload a cover, 5 gallery photos and music, then check on another device. Remove a photo and delete a couple; the files are gone.

### Tests for User Story 3

- [X] T052 [P] [US3] Write `tests/api/media.test.ts` (LocalProvider). The basic round trip is already in T031. This test covers:
  - A declared size over 10 MB → 422 `limit_exceeded` "Ukuran maksimal 10 MB"; MIME `image/gif` → "Jenis file tidak didukung".
  - A tampered upload result → 422 `validation`.
  - 31 gallery images → 422 `limit_exceeded`.
  - `prune` deletes the unreferenced files and rows.
  - Deleting a couple removes its whole folder (directory gone).
  - Duplicating copies files to new ids under the new couple and rewrites refs.
  - `GET /admin/usage` shape; the cron endpoint without the bearer token → 401.
  - The cron removes `pending` older than 24 h and retries `media_deletions`.
- [X] T053 [P] [US3] Write `tests/unit/cloudinaryProvider.test.ts`, mocking the `cloudinary` SDK:
  - The ticket signs the `public_id`, `timestamp` and `overwrite=false`, with `resource_type` `image` vs `video` for audio.
  - `verifyUpload` accepts the correct SHA-1 signature of `public_id=…&version=…` + secret and rejects a wrong one, a different `public_id` or a bytes mismatch.
  - `removePrefix` calls delete-by-prefix for both image and video resource types.

### Implementation for User Story 3

- [X] T054 [US3] Create `server/media/cloudinary.ts` (`CloudinaryProvider`), following contracts/media-upload.md:
  - **`createUploadTicket`:** URL `https://api.cloudinary.com/v1_1/<cloud>/<image|video>/upload`; fields `api_key`, `timestamp`, `public_id`, `overwrite=false`, `signature` (`cloudinary.utils.api_sign_request`).
  - **`verifyUpload`:** `cloudinary.utils.verify_api_response_signature`, or a manual SHA-1 check. It also checks `public_id === key` and returns `{ bytes, url: secure_url, width, height }`.
  - **`upload`:** `uploader.upload` from a data URI or stream.
  - **`copy`:** `uploader.upload(fromUrl, { public_id: toKey, resource_type })`.
  - **`remove`:** `uploader.destroy`.
  - **`removePrefix`:** `api.delete_resources_by_prefix` for `image` and `video`.
  - **`usage`:** `api.usage()` → `{ used: credits.usage, limit: credits.limit, unit: 'credits' }`.
- [X] T055 [US3] Extend `server/db/repos/media.ts` (basics from T034):
  - `countGallery(content) ≤ MAX_GALLERY` and at most 1 music file, otherwise `limitExceeded`.
  - `queueDeletion(keys | prefix)` + `flushDeletions(provider, keys)`: delete from the provider, remove the queue rows on success, and increment `attempts` on failure.
- [X] T056 [US3] Extend the routes in `server/routes/adminMedia.ts` (basics from T035):
  - **`POST /admin/couples/:id/media`:** run `checkMediaLimits(kind, mime, size)` first → `limitExceeded`. Pass the per-kind maximum to `createUploadTicket`.
  - **`POST /admin/media/:id/complete`:** after `verifyUpload`, check the verified `bytes` against the limit again; if over, delete the file and return 422.
  - **`DELETE /admin/media/:id`** and **`prune`:** go through `queueDeletion` → delete the rows → `flushDeletions`, instead of calling the provider directly.
  - **Add `GET /admin/usage`:**
    - `media` from `provider.usage()` with `warn` at ≥ 0.8.
    - `database` = `pg_database_size(current_database())` vs 1 GB (for PGlite, return the sum of the media table sizes or 0), with `warn` at ≥ 0.8.
- [X] T057 [US3] Wire the media rules into the couple flows (`server/db/repos/couples.ts`, `server/routes/admin.ts`):
  - `PATCH` and `create` also check the gallery and music limits (`assertReferencesReady` is already wired by T033).
  - `DELETE` couple: `queueDeletion(prefix '<root>/<coupleId>/')` inside the transaction, then `flushDeletions` after commit.
  - `duplicate`: for each media file, `provider.copy` to a new key and id, insert `ready` rows, and rewrite refs with `rewriteMediaRefs`.
- [X] T058 [US3] Implement `server/routes/cron.ts` `GET /cron/cleanup`:
  - Require `Authorization: Bearer ${CRON_SECRET}`, otherwise 401.
  - Retry every `media_deletions` row.
  - Delete `pending` media older than 24 h, along with their provider files.
  - Delete expired `admin_sessions`, `rate_limits` with `window_start` older than 1 h, and `security_events` older than 30 days.
  - Return the counts.
- [X] T059 [US3] Complete `src/data/http/HttpMediaStore.ts` (basics from T038):
  - **Progress.** `put(coupleId, blob, meta & { onProgress? })` sends step 2 with `XMLHttpRequest` instead of `fetch`, so it can report `upload.onprogress`. Network errors still reject with `NetworkError`.
  - **`usage()`** maps `GET /admin/usage` to `UsageReport`, with `label` "Kuota media: {used} dari {limit} kredit" (or MB for `bytes`) and `warn`.
  - Read the backend image dimensions from the existing compress step's output.
- [X] T060 [US3] Update `src/admin/media/ImageField.tsx`, `GalleryField.tsx` and `AudioField.tsx`:
  - Show a per-file progress percentage from `onProgress`.
  - On failure, mark **only that file** with "Gagal mengunggah — Coba lagi" and a retry button that re-runs `put` with the same blob. Other files are unaffected.
  - While any file is uploading or failed, the editor's "Simpan" is disabled with the hint "Tunggu unggahan selesai atau hapus file yang gagal" (FR-015).
  
  Track per-file state in a small hook, `src/admin/media/useUploads.ts`.
- [X] T061 [US3] Update `src/admin/couples/StorageMeter.tsx` to show `UsageReport.label` and the bar `percent`. At `warn`, show the alert "Penyimpanan hampir penuh (≥ 80%). Hapus foto yang tidak dipakai atau unduh cadangan." (FR-014). Also show the database line from usage.
- [X] T062 [US3] Update `tests/e2e-admin/media.spec.ts` to run against the local provider: upload a cover, 5 gallery images and the mp3 fixture, save, then open the public URL in a new context and assert every `img` `naturalWidth > 0` and audio `src` reachable. Add `tests/e2e-admin/upload-retry.spec.ts`: `page.route('**/api/dev/media/upload/**', abort)` for the first gallery file only. Assert "Gagal mengunggah" is on that item only and "Simpan" is disabled. Unroute, click "Coba lagi", then save successfully (US3-3). Remove a photo and save, then assert its file URL returns 404 (US3-4).

**Checkpoint**: Media works end to end and storage never piles up.

---

## Phase 6: User Story 4 - The couple unlocks their send-invitation page with a passcode (Priority: P1)

**Goal**: The admin sets and copies a 4-digit passcode. `/<slug>/send-invitation` shows only the passcode screen until it's unlocked. Signed 30-day couple cookies are revoked when the passcode changes. Wrong guesses pause entry per couple.

**Independent Test**: quickstart V12–V16.

### Tests for User Story 4

- [X] T063 [P] [US4] Write `tests/api/coupleAccess.test.ts`. It covers:
  - `GET /public/couples/:slug/gate` → `{ names, status, unlocked: false, retryAt: null }`, working for drafts.
  - Wrong passcode → 401 "Kode akses salah". The 5th wrong attempt → 423 with `retryAt` ≈ +15 min, and a `passcode_lockout` event is recorded.
  - The correct passcode while locked → 423.
  - Correct → 204, `wc_<id>` cookie set with Max-Age 2592000, and the gate shows `unlocked: true`.
  - `GET /couple/:slug/send-invitation` with the cookie → 200 (works for drafts), without it → 401. Couple A's cookie used on couple B → 401.
  - After the admin `PATCH`es the passcode, the old cookie → 401 (FR-010c). A tampered signature → 401. An expired `exp` → 401.
  - `POST /couple/:slug/lock` clears the cookie.
  - Admin list `accessWarning` becomes true after 3 lockouts within 24 h.
- [X] T064 [P] [US4] Write `tests/unit/coupleCookie.test.ts` for `signCoupleToken` and `verifyCoupleToken`: round trip, a wrong secret, a different couple id, the version, expiry and malformed input.

### Implementation for User Story 4

- [X] T065 [US4] Create `server/auth/coupleAccess.ts`:
  - **`signCoupleToken(secret, coupleId, passcodeVersion, exp)`:** `b64url(id).b64url(version).b64url(exp).hmac`.
  - **`verifyCoupleToken(secret, token, coupleId, currentVersion, now)`.**
  - **`unlock(db, couple, passcode)`:** throttle key `passcode:<id>`, `{ max: 5, lockMs: 15 * 60_000 }`. When locked → `locked(retryAt)` with message "Terlalu banyak percobaan. Coba lagi dalam {n} menit.", and `recordEvent('passcode_lockout')` when a lockout starts. A constant-time compare with `safeEqual`; a wrong code → `unauthenticated('Kode akses salah')`.
  - **`requireCouple`** middleware: resolves the couple by `:slug` (any status), reads cookie `wc_<id>` and verifies it, otherwise 401.
- [X] T066 [US4] Implement the routes:
  - In `server/routes/public.ts`: `GET /public/couples/:slug/gate` (`names` built like the summary; `unlocked` from a valid cookie; `retryAt` from the throttle) and `POST /public/couples/:slug/unlock` (sets `wc_<id>` for 30 days).
  - In `server/routes/couple.ts`, behind `requireCouple`: `GET /couple/:slug/send-invitation` → `{ couple: toPublicCouple(...), status }`, and `POST /couple/:slug/lock` → clears the cookie, 204.
- [X] T067 [US4] Create `src/services/coupleAccess.ts`, implementing the `CoupleAccessService` from contracts/data-layer.md: `gate`, `unlock` (401 → `InvalidPasscodeError`, 423 → `LockedOutError`), `lock` and `load`. `responses` and `csvUrl` are added in US5.
- [X] T068 [US4] Create `src/send-invitation/PasscodeScreen.tsx`:
  - Shows the couple's names and the heading "Masukkan kode akses".
  - **Inputs:** 4 single-digit inputs (`inputmode="numeric"`, `pattern="\d"`, `maxLength=1`, `autocomplete="one-time-code"` on the first, `aria-label="Digit {n}"`). It auto-advances, Backspace moves back, pasting 4 digits fills all of them, and it submits automatically when the 4th digit is entered.
  - **Errors:** `InvalidPasscodeError` shows "Kode akses salah", clears the inputs and focuses the first. `LockedOutError` disables the inputs and counts down "Terlalu banyak percobaan. Coba lagi dalam {n} menit.".
  - Themed with the couple's default theme. Works at 320 px.
- [X] T069 [US4] Rewrite `src/public-site/pages/CoupleSendInvitation.tsx`:
  - Call `gate(slug)`: `NotFoundError` → `NotFound`; locked → `PasscodeScreen`; on unlock, reload the gate.
  - Once unlocked, call `load(slug)` and render the existing `SendInvitationPage` with that couple and `VITE_PUBLIC_SITE_URL`. For drafts, show the notice "Undangan belum aktif — tautan sudah bisa disiapkan, tetapi tamu belum bisa membukanya." (US4-8).
  - Add a "Keluar" link that calls `lock` and returns to the passcode screen.
  - On a 401 during use (passcode changed), go back to `PasscodeScreen`.
- [X] T070 [US4] Admin passcode UI:
  - **`src/admin/editor/tabs/PengaturanTab.tsx`:** add a "Kode akses halaman kirim undangan" field (validated with `PASSCODE_PATTERN`, message "Kode akses harus 4 angka") with two buttons:
    - **"Acak"** sets `randomPasscode()`.
    - **"Salin pesan"** copies the template from `src/config/service.ts` (`passcodeMessage`): `Halo {names}! Halaman kirim undangan Anda:\n{publicUrl}/{slug}/send-invitation\nKode akses: {passcode}`. Use the existing `CopyField`/clipboard helper.
    
    Show the help text "Mengubah kode akan mengeluarkan pasangan dari halaman kirim undangan di semua perangkat."
  - **Form wiring:** add `passcode` to `src/admin/editor/formModel.ts` (form values ↔ `Couple`).
  - **`src/admin/couples/NewCouplePage.tsx`:** prefill a random passcode in an editable field.
  - **`src/admin/couples/CoupleListPage.tsx`:** add a "Salin pesan" action per couple, and the badge "⚠ Banyak percobaan kode" when `accessWarning`.
- [X] T071 [US4] Write `tests/e2e/passcode.spec.ts` (public projects, using the seed passcode from `.data/e2e-passcode.txt`):
  - A fresh context on `/anisa-raka/send-invitation` shows only "Masukkan kode akses". Assert no request to `/api/couple/` succeeded.
  - A wrong code shows "Kode akses salah". Enter the correct code, type the guest "Pak Andi", and assert the generated link contains no passcode.
  - Open the link in a new context: greeting "Pak Andi" and no passcode screen.
  
  Write `tests/e2e-admin/passcode-admin.spec.ts`: change the passcode in Pengaturan, then the previously unlocked public context returns to the passcode screen (US4-6). Use "Salin pesan" with clipboard permissions and assert the text includes the link and code.

**Checkpoint**: Couples can use their own page safely, and guests never see a passcode.

---

## Phase 7: User Story 5 - Guest RSVPs and wishes are saved (Priority: P2)

**Goal**: Saved RSVPs (replaced per browser) and wishes (paged, newest first) with rate limits. An admin "Respons" tab with hide and delete, a read-only "Respons Tamu" panel on the unlocked send-invitation page, and CSV export.

**Independent Test**: quickstart V17–V20.

### Tests for User Story 5

- [X] T072 [P] [US5] Write `tests/api/responses.test.ts`. It covers:
  - The first POST sets cookie `wv` (Max-Age 31536000).
  - RSVP validation uses the `validateRsvp` messages: name 2–60 characters, `attendance` in `hadir|tidak_hadir`, `guestCount` 1–5 when `hadir` and stored as 0 when `tidak_hadir`.
  - A second RSVP with the same `wv` → `replaced: true`, still 1 row; another `wv` → 2 rows.
  - `GET rsvp/mine` returns this browser's RSVP.
  - Wish validation: name 2–60, message 3–500.
  - Draft couple → 403 `unavailable` for both.
  - The 6th wish within 10 min from one `wv` → 429 "Terlalu banyak pesan, coba lagi nanti" with `retryAt`; 31 requests from one IP with rotating `wv` → 429.
  - Wishes list: 20 per page, newest first, cursor works, hidden excluded.
  - Admin responses include hidden wishes and `totals { attending, notAttending, people }`; hide and delete work.
  - Couple responses need the `wc_` cookie and exclude hidden wishes.
  - CSV has a byte-order mark, the header `Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)`, and a name `=SUM(1)` exported as `'=SUM(1)`.
- [X] T073 [P] [US5] Write `tests/unit/csv.test.ts` for `server/lib/csv.ts`: quoting of commas, quotes and newlines, the formula-prefix guard for `= + - @`, WIB time formatting (`Asia/Jakarta`), and the byte-order mark.

### Implementation for User Story 5

- [X] T074 [P] [US5] Create `server/auth/visitor.ts`. `visitorHash(c, env)` reads cookie `wv`, or creates 16 random bytes and sets it (Max-Age 31536000), and returns `hmac(SESSION_SECRET, wv)`. `ipHash(c, env)` = `hmac(SESSION_SECRET, clientIp(c))`.
- [X] T075 [P] [US5] Create `server/db/repos/rateLimits.ts`. `hit(db, bucket, limit, windowMs, now)` is an atomic upsert: if the window expired, reset to 1, otherwise increment. Over the limit it throws `rateLimited(retryAt = window_start + windowMs)` with message "Terlalu banyak pesan, coba lagi nanti".
- [X] T076 [P] [US5] Create `server/lib/csv.ts`. `rsvpCsv(rows)` produces `'﻿'` + the header `Nama,Kehadiran,Jumlah Tamu,Waktu (WIB)`, with Kehadiran shown as "Hadir"/"Tidak hadir" and time as `dd/MM/yyyy HH:mm` in `Asia/Jakarta`. Values are RFC 4180-escaped, and cells starting with `= + - @` get a `'` prefix.
- [X] T077 [US5] Create `server/db/repos/responses.ts`:
  - **`upsertRsvp(coupleId, visitorHash, input)`** → `{ rsvp, replaced }`. `guest_count = attendance === 'hadir' ? guestCount : 0`.
  - **`myRsvp`**.
  - **`addWish`**.
  - **`listWishes(coupleId, { includeHidden, cursor, limit: 20 })`:** keyset `(created_at, id) < cursor`, with the cursor = base64url `<iso>|<id>`.
  - **`listRsvps(coupleId)`** (newest first) and **`totals(coupleId)`**.
  - **`setWishHidden`**, **`deleteWish`**, **`deleteRsvp`**.
  
  Validate inputs with `validateRsvp`/`validateWish` from `src/lib/validation.ts`, converting `fieldErrors` → `invalidBody({ fields })`.
- [X] T078 [US5] Implement the public routes in `server/routes/public.ts`. Each requires an active couple (draft → `unavailable`) and calls `rateLimits.hit` with `wish:<coupleId>:<vh>` 5/10 min or `rsvp:<coupleId>:<vh>` 5/10 min, plus `ip:<coupleId>:<iph>` 30/10 min:
  - `GET /public/couples/:slug/wishes?cursor=`
  - `POST /public/couples/:slug/wishes` → 201
  - `POST /public/couples/:slug/rsvp` → 200 `{ rsvp, replaced }`
  - `GET /public/couples/:slug/rsvp/mine`
- [X] T079 [US5] Implement the couple and admin response routes:
  - **`server/routes/couple.ts`:** `GET /couple/:slug/responses?wishesCursor=` (visible wishes only) and `GET /couple/:slug/rsvps.csv` (`Content-Disposition: attachment; filename="rsvp-<slug>-YYYYMMDD.csv"`).
  - **`server/routes/adminResponses.ts`** (behind `requireAdmin`):
    - `GET /admin/couples/:id/responses` (hidden wishes included)
    - `GET /admin/couples/:id/rsvps.csv`
    - `DELETE /admin/rsvps/:id`
    - `PATCH /admin/wishes/:id` `{ hidden: boolean }`
    - `DELETE /admin/wishes/:id`
- [X] T080 [US5] Frontend services:
  - **`src/services/types.ts`:** `WishService.list(cursor?) → Page<Wish>`, `RsvpService.mine()`.
  - **`src/services/memory.ts`:** adapt to the new signatures (it's still used by the admin preview).
  - **`src/services/http.ts`:** `createHttpRsvpService(slug)` and `createHttpWishService(slug)` over `apiFetch`. Convert `createdAt` ISO → `Date`; 429 → `RateLimitedError`, shown as the form error "Terlalu banyak pesan, coba lagi nanti".
  - **`src/services/index.ts`:** `createServicesFor(content, { slug, mode: 'live' | 'preview' })`. `live` → HTTP; `preview` → memory. Update the call sites in `src/public-site/pages/CouplePage.tsx` (live) and the admin preview components in `src/admin/preview/*` and `PhonePreview.tsx` (preview).
  - Update `tests/unit/memoryServices.test.ts`.
- [X] T081 [US5] Update the invitation sections:
  - **`src/invitation/sections/Rsvp.tsx`:** on mount, call `rsvpService.mine()`. If present, show the existing confirmation state with the note "Respons Anda sudah kami terima. Kirim lagi untuk mengubahnya." and prefill the form.
  - **`src/invitation/sections/Wishes.tsx`:** load the first page from `list()`; "Muat lebih banyak" appends the next page until `nextCursor` is null; a new wish is prepended; show the rate-limit error message inline.
- [X] T082 [US5] Create `src/admin/responses/http.ts` (`ResponsesAdminService`) and `src/admin/editor/tabs/ResponsTab.tsx`, and register the tab "Respons" after "Pengaturan" in the editor tab list and routes (`src/admin/editor/EditorPage.tsx`, `src/admin/AdminApp.tsx`). The tab shows:
  - Totals cards: "Hadir", "Tidak hadir", "Total tamu".
  - An RSVP table (Nama, Kehadiran, Jumlah, Waktu) with a "Hapus" button that asks for confirmation.
  - "Unduh CSV" (link to `csvUrl`).
  - A wishes list with "Sembunyikan"/"Tampilkan" toggles (hidden ones dimmed with the label "Disembunyikan"), "Hapus" with confirmation, and "Muat lebih banyak".
  - Empty state "Belum ada respons." Usable at 375 px: the table becomes stacked cards.
- [X] T083 [US5] Create `src/send-invitation/GuestResponses.tsx` ("Respons Tamu"): read-only totals, the RSVP list, visible wishes with "Muat lebih banyak", and an "Unduh CSV" link. Add `responses` and `csvUrl` to `src/services/coupleAccess.ts`. Render it below the link generator in `src/public-site/pages/CoupleSendInvitation.tsx` (unlocked only).
- [X] T084 [US5] Write `tests/e2e/responses.spec.ts`:
  - Context A and context B each submit an RSVP and a wish on `/anisa-raka`. A submits its RSVP again (changing the count).
  - Reload in both: both wishes are visible.
  - Unlock send-invitation: totals show 2 RSVPs and the people sum matches.
  - The 6th wish from A shows "Terlalu banyak pesan, coba lagi nanti".
  
  Write `tests/e2e-admin/responses-tab.spec.ts`: hide a wish, assert it disappears from the public invitation, then download the CSV (`page.waitForEvent('download')`) and assert the header row.

**Checkpoint**: Guest responses persist and are visible to the admin and the couple.

---

## Phase 8: User Story 6 - Move existing browser data online (Priority: P2)

**Goal**: Restore a 002 (v1) backup into the server with per-couple conflict choices. It's safe to re-run after a failure, and half-restored couples are blocked from publishing.

**Independent Test**: quickstart V21.

### Tests for User Story 6

- [X] T085 [P] [US6] Write `tests/api/import.test.ts`. It covers:
  - `preflight` returns existing ids and slugs.
  - `PUT /admin/import/couples/:id` with mode `create` keeps the given couple id and media ids, sets `restore_pending = true`, and returns `pendingMediaIds`.
  - Status `active` while pending → 422 `not_publishable`.
  - Upload the pending media through the normal flow using the original ids, then `finish` → `restore_pending = false`. `finish` with missing media → 422 `media_not_ready` listing the ids.
  - Re-running the same `PUT` after media are ready → `pendingMediaIds` empty and no duplicate rows.
  - Mode `replace` overwrites content and slug and removes media no longer listed.
  - `responses` import skips existing ids (`inserted`/`skipped` counts).
- [X] T086 [P] [US6] Update `tests/unit/backup.test.ts`. `parseBackup` accepts v1 (002 fixtures) and v2 and rejects bad files with "File cadangan tidak valid", naming the first problem. Add a planning test for the "keep both" helper: new couple id, unique `-pulihan` slug, new media ids, refs rewritten.

### Implementation for User Story 6

- [X] T087 [US6] Implement `server/routes/adminImport.ts` (behind `requireAdmin`):
  - **`POST /admin/import/preflight`** `{ couples: {id, slug}[] }` → `{ existingIds, existingSlugs }`.
  - **`PUT /admin/import/couples/:id`** `{ couple, media: MediaMeta[], mode: 'create'|'replace' }`, in one transaction:
    - Validate `couple` with the coupleSchema shape (not full content rules, as 002 restore rule 1). Use `couple.passcode` or `randomPasscode()`.
    - Upsert by id with `restore_pending = true` and `version` 1.
    - For each media meta: if the id exists and is `ready`, keep it; otherwise upsert `pending` with key `keyFor(...)`.
    - For `replace`, queue deletion of media rows for this couple not in the list.
    - Return `{ couple, pendingMediaIds }`.
  - **`POST /admin/import/couples/:id/responses`** inserts with `ON CONFLICT (id) DO NOTHING`.
  - **`POST /admin/import/couples/:id/finish`** checks that every content ref is ready, then sets `restore_pending = false`.
  - Allow `POST /admin/couples/:id/media` to accept `id` for a pending restore row: return a new ticket for the existing pending row instead of creating one.
- [X] T088 [US6] Rewrite `src/data/backup.ts`:
  - **`parseBackup(text)`:** zod for `formatVersion` 1 | 2 → normalized `{ couples, media (with data), rsvps, wishes }`.
  - **`planKeepBoth(couple, media, existingSlugs)`:** new ids, `slugify` + `-pulihan` (+ number until unique), `rewriteMediaRefs`.
  - Keep `base64ToBlob` helpers. Remove the IndexedDB writers.
- [X] T089 [US6] Create `src/admin/backup/restore.ts`. `runRestore(parsed, choices, onProgress)`:
  - For each couple not skipped: apply keep-both planning; set `randomPasscode()` for v1; `PUT`; upload each `pendingMediaIds` blob via `HttpMediaStore.put`-style steps using the given id (add `putWithId` to `HttpMediaStore`); POST the responses (v2); then `finish`.
  - Each couple gets a status of "Dipulihkan", "Dilewati" or "Gagal" (with the message). It continues to the next couple after a failure.
- [X] T090 [US6] Rewrite the restore part of `src/admin/backup/BackupPage.tsx`:
  - Choose a file → `parseBackup` → preflight → a summary table (names, slug, photo count, size, and "Sudah ada" when conflicting) with a choice per conflicting couple: **Lewati** (default) / **Ganti** / **Simpan keduanya**.
  - "Pulihkan" runs `runRestore` with progress "Memulihkan {names}: foto {i} dari {n}", then a result list.
  - **`src/admin/couples/CoupleListPage.tsx`:** the badge "Pemulihan belum selesai" for `restorePending` couples, with a hint to run the restore again.
  - **`src/admin/AdminApp.tsx`:** set `BACKUP_ENABLED = true`. Hide the export button until US7 if it isn't done.
- [X] T091 [US6] Write `tests/e2e-admin/restore.spec.ts` with a v1 fixture `tests/e2e-admin/fixtures/backup-v1.json` (2 couples with small images; generate it in `scripts/generate-fixtures.mjs`):
  - Restore → both couples are listed with passcodes, and their public pages work after publishing.
  - Restore the same file again with all choices left at "Lewati" → reports "Dilewati" ×2 and the couple count is unchanged.
  - Interrupted run: abort the uploads for the second couple, assert "Gagal" and the "Pemulihan belum selesai" badge, then re-run → "Dipulihkan".

**Checkpoint**: Existing 002 data can be moved online safely.

---

## Phase 9: User Story 7 - Back up everything online (Priority: P3)

**Goal**: A full v2 backup (couples incl. passcodes, media bytes, RSVPs, wishes) built in the browser, and a round-trip restore.

**Independent Test**: quickstart V22.

### Tests for User Story 7

- [X] T092 [P] [US7] Write `tests/api/export.test.ts`. `GET /admin/export` returns `formatVersion` 2, couples with `passcode`, media with `url` and no `data`, all RSVPs and wishes (hidden included), and no `visitor_hash`. Round trip: export, fetch the media bytes from the local URLs, build the file, restore into a second fresh app (T089 logic driven from the test), and compare couples (excluding `version` and `updatedAt`), media bytes (sha256), RSVPs and wishes (SC-005).

### Implementation for User Story 7

- [X] T093 [US7] Implement `GET /admin/export` in `server/routes/adminImport.ts`: `{ format: 'wedding-admin-backup', formatVersion: 2, createdAt, app: { build: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' }, couples, media (ready only, with url), rsvps, wishes }`.
- [X] T094 [US7] Create `src/admin/backup/export.ts`. `runExport(onProgress)` calls `GET /admin/export`, then for each media item fetches `url` → blob → base64, checks `size`, and reports progress "Mengunduh foto {i} dari {n}". Any failure aborts with "Gagal mengunduh {kind} milik {names}". The result is downloaded as `undangan-backup-YYYYMMDD-HHmm.json`. Wire the "Unduh Cadangan" button in `src/admin/backup/BackupPage.tsx`.
- [X] T095 [US7] Write `tests/e2e-admin/backup-roundtrip.spec.ts`: create a couple with 2 photos, submit 1 RSVP and 1 wish publicly, then download the backup. Delete the couple, restore the file, and assert the couple, photos (loaded) and responses tab contents are back.

**Checkpoint**: Every user story is complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Bundle and security checks, docs, production setup and full validation.

- [X] T096 [P] Extend `scripts/check-public-build.mjs` to also fail when `dist/public` or `dist/admin` contain any of: `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `CLOUDINARY_API_SECRET`, `scrypt$`, `drizzle-orm`, `postgres(`, or strings from `server/`. Also fail when `dist/public` contains admin route code (existing check). Run it after `npm run build`.
- [X] T097 [P] Update `README.md`:
  - Replace the "Backend nanti" section with the architecture (Neon, Cloudinary, Hono on Vercel; research R1–R4 summary).
  - Add local development (quickstart §1), cloud setup and Vercel environment variables (§3–4), moving 002 data (§5), the free-tier watch (§7), and the Vercel Hobby non-commercial note.
  - Remove all mentions that "the admin login is not real security".
- [X] T098 [P] Add `tests/unit/noSecretsInSrc.test.ts`. It greps `src/**` for `process.env` (none allowed) and for `import.meta.env.` keys other than `VITE_PUBLIC_SITE_URL`, `DEV`, `PROD` and `MODE`.
- [X] T099 Accessibility and responsive pass on the new UI: `PasscodeScreen`, `GuestResponses`, `ResponsTab`, `ReloginDialog`, the upload progress and retry, and the restore summary. Check focus order, labels, `aria-live="polite"` for errors and countdowns, and no horizontal scroll. Add the new screens to `tests/e2e/responsive.spec.ts` and `tests/e2e-admin/responsive.spec.ts` at 320, 375, 768, 1366 and 1920.
- [X] T100 Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:e2e`. Fix all failures. Confirm `tests/api/admin-protection.test.ts` (T047) lists every admin route from all stories.
  - Add `tests/e2e/load-time.spec.ts`. Use Chromium with CDP network throttling (Fast 4G preset: 1.6 Mbps down, 750 kbps up, 150 ms latency). Open `/anisa-raka` and assert the cover heading is visible within 3 s, against the local build with a warm API (SC-003). The cold-start part of SC-003 is still measured in production by T102.
- [ ] T101 Production setup per quickstart §3–4:
  - Create the Neon project (Singapore, pooled URL) and the Cloudinary account.
  - Set the Vercel environment variables on both projects (`API_SURFACE` public and admin).
  - Run `npm run db:migrate` and `npm run db:seed` against production.
  - Deploy both projects.
  - Confirm the cron is listed on the admin project.
- [ ] T102 Run quickstart.md §6 scenarios V1–V25 on production. Record the results, including the SC-003 cold and warm timings on a 4G phone and the Cloudinary credit use after a week, in `specs/003-backend-data-persistence/checklists/validation.md`.
- [ ] T103 [P] Move the 002 browser data (quickstart §5): export a backup from the old deployment **before** switching, then restore it after deploying (US6).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and **blocks all stories**.
  - Internal order: T006 → T007 → T008 → T009 → T014 → (T015, T016, T017).
  - T011–T013 come before T014.
  - T022 → T023.
  - T024, T025 → T026 → T027.
  - T028 → T029.
  - T030 last.
- **US1 (Phase 3)**: after Foundational. **MVP.**
- **US2 (Phase 4)**: after Foundational. T047's route sweep is most useful after the other stories add routes; re-run it in Phase 10.
- **US3 (Phase 5)**: after US1, because it extends `couples.ts`, `media.ts`, `adminMedia.ts` and `HttpMediaStore` from T033–T038. US1 already includes the basic local upload, because a couple can't be saved without its required photos.
- **US4 (Phase 6)**: after US1 (couples repository, `CoupleSendInvitation`).
- **US5 (Phase 7)**: after US1. Its couple-facing panel (T083) needs US4 (T065–T069).
- **US6 (Phase 8)**: after US3, since restore uploads media through the 3-step flow.
- **US7 (Phase 9)**: after US6 (it shares the restore code for the round trip).
- **Polish (Phase 10)**: after the desired stories.

### User Story Dependencies

```text
Setup → Foundational ─┬─► US1 (MVP) ─┬─► US3 ──► US6 ──► US7
                      │              ├─► US4 ──► US5 (couple panel)
                      │              └─► US5 (public + admin parts)
                      └─► US2 (independent of US1 except for the e2e editor flow)
```

### Within Each User Story

- Write the API tests first and confirm they fail.
- Then repositories → routes → frontend implementations → screens → e2e.
- Server tasks that touch the same route file are done one after another (no [P]).

### Parallel Opportunities

- **Phase 1:** T002–T005.
- **Phase 2:** T010, T011, T012, T013, T015, T018, T019, T024 and T025 once their stated predecessors are done.
- **Within a phase:** all test-writing tasks marked [P].
- **US5:** T074, T075 and T076 (separate new files).
- **After US1:** US2, US3 and US4 can proceed in parallel. The only shared file is `src/admin/editor/useCoupleForm.ts`, which T050 (US2) and T060 (US3) both edit, so merge those two carefully.
- **Phase 10:** T096–T098.

---

## Parallel Example: User Story 5

```bash
# Tests first (both fail until implementation lands):
Task: "T072 Write tests/api/responses.test.ts"
Task: "T073 Write tests/unit/csv.test.ts"

# Independent new server modules:
Task: "T074 Create server/auth/visitor.ts"
Task: "T075 Create server/db/repos/rateLimits.ts"
Task: "T076 Create server/lib/csv.ts"
```

## Parallel Example: Foundational

```bash
Task: "T011 server/http/errors.ts"
Task: "T012 server/http/middleware.ts"
Task: "T013 server/http/cookies.ts"
Task: "T018 src/data/passcode.ts"
Task: "T019 src/data/mediaLimits.ts"
Task: "T024 server/auth/password.ts + hash-password script"
Task: "T025 server/db/repos/throttles.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup, then Phase 2 Foundational. Development runs offline with PGlite and local media.
2. Phase 3 US1: couples in the database, the public site reading from the API, and the seed.
3. **Stop and validate**: quickstart V1–V3, V7 and V23, plus the existing 001 and 002 e2e suites (SC-007).
4. Production needs Cloudinary for uploads (US3), so the first real deploy comes after US3. Before that, demo locally.

### Incremental Delivery

| Step | Adds |
|---|---|
| US1 + US2 | Safe, live couples |
| US3 | Real photos and music. **First production deploy** (T101) |
| US4 | Couples receive their passcode page |
| US5 | Saved RSVPs and wishes |
| US6 | 002 data moved online (T103 timing: export from the old deployment before switching) |
| US7 | Full backups |

Each step keeps every earlier story's e2e specs green.

---

## Implementation notes (where the build differs from the tasks above)

- **T005 — one fallback rule, any host.** Instead of a host-based rewrite (which would break Vercel preview URLs for the admin), the admin build also writes `index.html` (a copy of `admin.html`, `vite.config.ts` `adminIndexCopy`), so the single `/(.*) → /index.html` rule serves both sites.
- **T015 — bundled API.** `npm run build:*` also runs `scripts/build-api.mjs` (esbuild), bundling `server/` and the shared `src/` modules into `api/_server.mjs`; `api/index.ts` re-exports it. This avoids Node ES-module import-extension problems at runtime on Vercel.
- **T030/T045 — e2e data setup** happens in the Playwright `webServer` command (`scripts/e2e-reset.mjs`, migrate, seed), because Playwright starts the web server before `globalSetup`. The server-wide login lockout spec runs alone in an `admin-lockout` project after all others.
- **T035 — route files.** Couple routes live in `server/routes/adminCouples.ts`; `server/routes/admin.ts` holds the session routes and mounts the protected groups behind `requireAdmin`.
- **T019 — audio types.** The server accepts any `audio/*` (like the dashboard's picker), not a fixed list.
- **T033 — list covers.** `CoupleSummary.coverSrc` is resolved to the delivery URL on the server, because the list doesn't load each couple's media.
- **T050 — re-login.** `useLoad` (admin page loads) also waits for the re-login dialog and retries once; pages without the dialog (full-screen previews) fail fast instead of waiting.
- **T087/T089 — restore resumes.** Preflight also returns `pendingIds` (restores that didn't finish); those default to "Lanjutkan" (mode `replace` on the same id) instead of "Lewati".
- **T094 — export retry.** If a file was deleted by an edit made during the export, the export fetches a fresh listing and tries once more before failing.
- **T054** (Cloudinary provider) was written during Phase 2, because the media provider loader references it.
- **Extra fixes found by the e2e runs:** `sampleWishes[].createdAt` arrives as a string over JSON (normalised in the memory wish service); two duplicates at the same moment could pick the same `-salinan` address (the server now retries on the unique constraint); logging out now always lands on `/login` (the route guard knows an explicit logout from an expired session).

## Notes

- **[P]** means different files and no dependency on unfinished tasks.
- **[USn]** traces each task to a spec user story.
- **Development and tests never touch production.** They use `pglite:` + `MEDIA_DRIVER=local` (research R10).
- **Contract changes go in the spec folder.** If an implementation changes a contract (for example, `MediaProvider.upload` added in T022), update the matching file in `specs/003-backend-data-persistence/contracts/` in the same commit.
- **Commit** after each task or logical group, and stop at any checkpoint to validate.
