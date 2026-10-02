---

description: "Task list for Admin Login & Couple Dashboard (Frontend)"
---

# Tasks: Admin Login & Couple Dashboard (Frontend)

**Input**: Design documents from `/specs/002-admin-couple-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included, because research.md R18 commits to them: unit tests for the data layer, schema, auth and backup, Playwright for the admin flows, and the existing public suites re-pointed to `/anisa-raka`.

**Organization**: Grouped by user story in priority order: US1–US4 (P1), US5–US6 (P2), US7 (P3).

**Rules for every task**:
- All UI text is Indonesian (FR-020).
- Admin code lives only under `src/admin/`.
- Screens import data only from `src/data` (the swap point).
- Sections get content only through `useWedding()` and the theme only through `useTheme()`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The user story the task belongs to (US1–US7)

## Path Conventions

One repository, two entries. Public: `index.html` → `src/public-site/`. Admin: `admin.html` → `src/admin/`. Shared code: `src/invitation`, `src/themes`, `src/data`, `src/content`, `src/send-invitation`, `src/lib`, `src/components`. Tests: `tests/unit`, `tests/e2e` (public) and `tests/e2e-admin`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, two-site build, local host routing, environment

- [X] T001 Install runtime dependencies `react-router`, `react-hook-form`, `zod`, `@hookform/resolvers`, `idb`, `@dnd-kit/core`, `@dnd-kit/sortable` and the dev dependency `fake-indexeddb`, and update `package.json`.
- [X] T002 Create `admin.html` at the repository root (copy of `index.html` with `<title>Admin · Undangan</title>`, `<meta name="robots" content="noindex, nofollow">` and the script `/src/admin/main.tsx`). Point `index.html` at `/src/public-site/main.tsx`.
- [X] T003 Rewrite `vite.config.ts` so that `SITE=public|admin` (default `public`) selects `build.rollupOptions.input` (`index.html` or `admin.html`) and `build.outDir` (`dist/public` or `dist/admin`, with `emptyOutDir`). Keep the existing React, Tailwind and Vitest config. Add `tests/unit/**/*.test.ts` setup for `fake-indexeddb/auto` in `tests/setup.ts`.
- [X] T004 Add a `devHostRouting()` plugin in `vite/devHostRouting.ts`, registered in both `configureServer` and `configurePreviewServer`. For GET requests whose `Accept` includes `text/html` and whose path has no file extension, rewrite `req.url` to `/admin.html` when the `Host` header starts with `admin.`, otherwise to `/index.html`. For preview, serve from `dist/admin` or `dist/public` by host: `npm run preview` builds both, then serves with a small static handler per host.
- [X] T005 [P] Update `package.json` scripts:
  - `dev`: `vite`
  - `build`: `npm run build:public && npm run build:admin`
  - `build:public`: `tsc --noEmit && cross-env SITE=public vite build`
  - `build:admin`: `cross-env SITE=admin vite build`
  - `preview`: `vite preview --port 4817`, using host routing
  - `hash-password`: `node scripts/hash-password.mjs`
  - `check:public-build`: `node scripts/check-public-build.mjs`

  Install `cross-env` as a dev dependency.
- [X] T006 [P] Create `.env.example` with `VITE_ADMIN_EMAIL=`, `VITE_ADMIN_PASSWORD_SHA256=` and `VITE_PUBLIC_SITE_URL=http://localhost:5173`, and add `.env.local` to `.gitignore`. Declare the env types in `src/vite-env.d.ts` (`ImportMetaEnv`).
- [X] T007 [P] Create `scripts/hash-password.mjs`, which prints the lowercase hex SHA-256 of `process.argv[2]` and exits with code 1 and a usage message if it's missing.
- [X] T008 [P] Create `scripts/check-public-build.mjs`. It fails (exit 1) if `dist/public/admin.html` exists, or if any file in `dist/public/assets/*.js` contains the marker string `__ADMIN_BUNDLE__`. The admin entry exports that string in `src/admin/main.tsx`.
- [X] T009 [P] Update `playwright.config.ts`:
  - Public projects: unchanged viewports, `baseURL http://localhost:4817`, `testDir tests/e2e`.
  - Admin projects `admin-375` and `admin-1366`: Chromium, `baseURL http://admin.localhost:4817`, `testDir tests/e2e-admin`.
  - webServer: `npm run build && npm run preview`, with test credentials passed through `env` (`VITE_ADMIN_EMAIL=admin@test.local`, and the hash of `rahasia123` for `VITE_ADMIN_PASSWORD_SHA256`).
- [X] T010 [P] Add hosting rewrites for both outputs. `public/_redirects` and `vercel.json` stay for the public site. Add `admin-static/_redirects` (`/* /admin.html 200`) and `admin-static/vercel.json`, copied into `dist/admin` by the admin build through Vite `publicDir: 'admin-static'` when `SITE=admin`.

**Checkpoint**: `npm run dev` serves `localhost:5173` (still the old app) and `admin.localhost:5173` (blank admin entry).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Move the invitation onto context and routing, define the shared data layer, and keep feature 001 behaviour at `/anisa-raka`.

**⚠️ CRITICAL**: No user story work starts until this phase is done and the existing suites pass.

### 2a. Invitation renders any couple (no behaviour change)

- [X] T011 Move the sample couple: `src/content/wedding.ts` → `src/content/samples/anisa-raka/content.ts` (export `anisaRaka: WeddingContent`), and `src/content/images/*` → `src/content/samples/anisa-raka/images/`. Update the image import paths and `scripts/generate-placeholders.mjs` output paths.
- [X] T012 Create `src/invitation/WeddingProvider.tsx` with `WeddingProvider({ content, children })` and `useWedding(): WeddingContent`, which throws if used outside the provider. Move `src/content/selectors.ts` helpers to accept the content argument (unchanged signatures).
- [X] T013 Convert themes to context in `src/themes/index.ts` + `src/themes/ThemeProvider.tsx`:
  - `ThemeProvider({ themeId, children })` sets `document.documentElement.dataset.theme` and the meta theme-color in an effect, and restores the previous values on unmount.
  - `useTheme()` reads the context.
  - `resolveThemeId(search, fallback)` keeps its current signature.
  - Remove the module-level `current` singleton and `applyTheme()`.

  Update `tests/unit/themeResolve.test.ts` and `tests/unit/themes.test.ts` accordingly.
- [X] T014 Move `src/App.tsx` → `src/invitation/Invitation.tsx` (component `Invitation`) and `src/sections/*` → `src/invitation/sections/*`. Replace every `import { wedding } from '../content/wedding'` with `const wedding = useWedding()` in Closing, Couple, Cover, Events, Gallery, Gift, Hero, Story and Invitation. Compute `NAV_ITEMS` inside the component from `useWedding()`. Keep `src/components/*` where they are. Fix all imports. No visual or behaviour change.
- [X] T015 Make the wishes service per couple. Change `src/services/index.ts` to export `createServicesFor(content)`, returning `{ rsvpService, wishService }` seeded with `content.sampleWishes`. Add `ServicesProvider` and `useServices()` in `src/services/ServicesProvider.tsx`, and use `useServices()` in `src/invitation/sections/Rsvp.tsx` and `Wishes.tsx`. Update `tests/unit/memoryServices.test.ts` imports.
- [X] T016 Make `src/send-invitation/SendInvitationPage.tsx` couple-aware. Props: `{ content: WeddingContent; coupleUrl: string; defaultThemeId: ThemeId; previewUrl: (guestName: string, themeCode: string) => string }`.
  - Links are built with `buildInviteUrl(coupleUrl, …)`.
  - The phone preview iframe uses `previewUrl(...)`.
  - Remove the "Alamat website" setting and the localhost warning, because the address now comes from `VITE_PUBLIC_SITE_URL`.
  - The theme selector starts at `defaultThemeId`.
  - The localStorage key for the edited WhatsApp message becomes `sendInvitation.template.<slug>`, with the slug taken from `coupleUrl`'s last path segment.
- [X] T017 [P] Create `src/config/site.ts` `publicSiteUrl()`, which returns `import.meta.env.VITE_PUBLIC_SITE_URL ?? window.location.origin`, without a trailing slash. Add `coupleUrl(slug)` and `coupleSendUrl(slug)` helpers. Remove `activeTheme` and `publicUrl` from `site.ts`, since themes are now per couple.

### 2b. Shared data layer (contracts/data-layer.md)

- [X] T018 [P] Create `src/data/types.ts` exactly as in contracts/data-layer.md: `CoupleStatus = 'draft' | 'active'`, `Couple`, `NewCouple`, `CoupleSummary`, `StoredMedia`, `CoupleRepository`, `MediaStore`, and the `ConflictError`, `SlugTakenError` and `NotFoundError` classes.
- [X] T019 [P] Create `src/data/slug.ts`:
  - `SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, length **3–40 characters**.
  - `RESERVED_SLUGS`: `send-invitation, api, assets, music, admin, login, dashboard, u, inv, tema, favicon.svg, robots.txt`.
  - `slugify(a, b)`: NFKD, strip accents, lowercase, non-alphanumeric → `-`, collapse hyphens, trim, join with `-`, cut to 40 characters.
  - `validateSlug(s)`: returns an Indonesian message or null. Messages: "Hanya huruf kecil, angka dan tanda hubung", "Minimal 3 dan maksimal 40 karakter", "Nama alamat ini dipakai oleh sistem".
  - `uniqueSlug(base, exists)`: appends `-salinan`, then `-salinan-2`, and so on.
- [X] T020 [P] Create `src/data/dates.ts`:
  - `TIMEZONES = [{ label: 'WIB', offset: '+07:00' }, { label: 'WITA', offset: '+08:00' }, { label: 'WIT', offset: '+09:00' }]`.
  - `toIsoWithOffset(localDateTime 'YYYY-MM-DDTHH:mm', offset)` returns `'YYYY-MM-DDTHH:mm:00+07:00'`.
  - `fromIsoWithOffset(iso)` returns `{ local, offset }`.
- [X] T021 Create `src/data/schema.ts` with zod `weddingContentSchema` and `coupleSchema`, implementing every rule in data-model.md "WeddingContent: validation added for the dashboard", with the verbatim messages:
  - nickname: required, 1–30 characters, "Nama panggilan wajib diisi"
  - full name and parents: 2–80 characters
  - person photo: required, "Foto wajib diunggah"
  - `cover.background`: required
  - `events`: at least 1, "Minimal satu acara"; exactly one `isMain`, "Pilih tepat satu acara utama"
  - `start`: ISO 8601 with offset +07:00, +08:00 or +09:00
  - `end`: null or later than start, "Jam selesai harus setelah jam mulai"
  - `mapUrl`: optional, https only
  - `gallery`: at most **30** items
  - `gallery[].alt`: trimmed, 1–150 characters, "Deskripsi foto wajib diisi"
  - account number: digits only after removing spaces and dashes, "Nomor rekening hanya boleh angka"
  - `shareMessage`: up to 2000 characters
  - `coupleSchema`: adds `slug` (via T019), `status`, `defaultTheme` enum, `version` ≥ 1 and ISO timestamps

  Depends on T018, T019, T020.
- [X] T022 [P] Create `src/data/resolveMedia.ts`:
  - `MEDIA_PREFIX = 'media:'` and `isMediaRef()`.
  - `collectMediaRefs(content)` returns a `Set<string>` of every `media:` id across cover, persons, story, gallery, gift logos and `music.src`.
  - `rewriteMediaRefs(content, map)` returns a deep copy with ids remapped.
  - `resolveMedia(content, store)` returns `{ content, dispose }`, with `blob:` URLs from `store.getBlob`. Missing media become `''`. `dispose` revokes the URLs.
- [X] T023 Replace `tests/unit/content.test.ts` so it validates `anisaRaka` with `weddingContentSchema.parse`, keeping the old assertions as schema cases. Add `tests/unit/schema.test.ts`, which covers every rule and message in T021, including boundaries (nickname 30/31, gallery 30/31, alt 150/151, end = start rejected). Also add `tests/unit/slug.test.ts` and `tests/unit/dates.test.ts`. Depends on T019–T021.
- [X] T024 [P] Create `src/data/static/StaticCoupleRepository.ts`: a read-only repository over `SAMPLE_COUPLES` (`src/content/samples/index.ts` exports the Anisa & Raka `Couple` with id `sample-anisa-raka`, slug `anisa-raka`, status `active`, defaultTheme `romantic-floral`, version 1). `findBySlug` hides drafts unless `includeDrafts`. Write methods throw `Error('read-only')`.
- [X] T025 Create `src/data/index.public.ts`, which exports `coupleRepository = new StaticCoupleRepository(SAMPLE_COUPLES)` and `mediaStore = null`.

### 2c. Public site on the new routes

- [X] T026 Create `src/public-site/main.tsx` and `src/public-site/PublicApp.tsx` using `createBrowserRouter`:
  - `/`: a placeholder `Landing` showing a "Segera hadir" heading. The full page comes in US7.
  - `/:slug`: `CouplePage`
  - `/:slug/send-invitation`: `CoupleSendInvitation`
  - `*`: `NotFound`

  Delete the old `src/main.tsx`.
- [X] T027 [P] Create `src/public-site/pages/NotFound.tsx` ("Undangan tidak ditemukan", themed with the default theme, link to `/`) and `src/public-site/pages/Unavailable.tsx` ("Undangan belum tersedia").
- [X] T028 Create `src/public-site/pages/CouplePage.tsx`:
  - Load `coupleRepository.findBySlug(slug)` (reserved slugs → NotFound).
  - While loading, render nothing.
  - null → `NotFound`; draft → `Unavailable`.
  - Otherwise render `<ThemeProvider themeId={resolveThemeId(location.search, couple.defaultTheme)}><WeddingProvider content={resolved}><ServicesProvider><MusicProvider><ToastProvider><Invitation/>`.
  - `resolved` comes from `resolveMedia`; there's no media store on public, so it passes through.

  Depends on T012–T015, T024–T027.
- [X] T029 Create `src/public-site/pages/CoupleSendInvitation.tsx`. Load the active couple by slug (otherwise NotFound) and render `SendInvitationPage` with `coupleUrl = coupleUrl(slug)` and `previewUrl = (n, t) => buildInviteUrl(window.location.origin + '/' + slug, n, t)`.
- [X] T030 Re-point the public e2e suites (`tests/e2e/*.spec.ts`, `helpers.ts`) from `/` to `/anisa-raka`, and from `/send-invitation` to `/anisa-raka/send-invitation`. In `send-invitation.spec.ts`:
  - drop the "Alamat website" and localhost-warning assertions
  - assert that links start with `http://localhost:5173/anisa-raka?`
  - change the old-route test to expect "Undangan tidak ditemukan" at `/send-invitation` and `/register`

  Run `npm test` and `npm run test:e2e`. **All existing behaviour must pass before Phase 3.**

### 2d. Admin shell

- [X] T031 Create `src/data/indexeddb/db.ts` with `openAdminDb()` using `idb`: database `wedding-admin` version 1, store `couples` (keyPath `id`, unique index `slug`) and store `media` (keyPath `id`, index `coupleId`).
- [X] T032 Create `src/data/indexeddb/IndexedDbMediaStore.ts`, implementing `MediaStore`:
  - `put` generates the id with `crypto.randomUUID()`, stores `{ …meta, blob, size: blob.size, mime: blob.type, createdAt }` and returns `StoredMedia` without the blob.
  - `getBlob` and `remove` are straightforward.
  - `removeUnreferenced(coupleId, referenced)` deletes every media item of that couple whose id isn't in `referenced` and returns the count.
  - `usage()` uses `navigator.storage.estimate()`, returning null quota if unavailable.
- [X] T033 Create `src/data/indexeddb/IndexedDbCoupleRepository.ts`, implementing all guarantees in contracts/data-layer.md:
  - `create`: status `'draft'`, version 1, timestamps; `SlugTakenError` on a duplicate or reserved slug.
  - `update`: `ConflictError` if `expectedVersion !== stored.version`; increments the version; calls `media.removeUnreferenced` after save.
  - `setStatus`: changes the status.
  - `duplicate`: copies media to new ids and runs `rewriteMediaRefs`; the slug comes from `uniqueSlug`; status `'draft'`.
  - `remove`: deletes the couple and its media in one transaction.
  - `list`: returns `CoupleSummary[]` sorted by `updatedAt` descending, with `names = "<first> & <second>"` using `orderedCouple`, `mainDate` and `coverSrc` (resolved lazily by the UI).

  Depends on T031, T032, T022.
- [X] T034 Create `src/data/indexeddb/seed.ts` with `seedIfEmpty(repo, media)`. If there are no couples, fetch each bundled sample image URL of Anisa & Raka, put it into the media store, rewrite the refs to `media:<id>`, and create the couple with status `'active'`. Running it again is a no-op.
- [X] T035 Create `src/data/index.admin.ts`, which exports singletons `mediaStore` and `coupleRepository` and `ready = seedIfEmpty(...)`.
- [X] T036 Write `tests/unit/repository.test.ts` (fake-indexeddb, fresh database per test) covering contract guarantees 1–5: create defaults and slug errors, a stale version giving ConflictError with nothing changed, remove deleting media, duplicate rewriting refs and the unique slug, and seed idempotence. Depends on T033, T034.
- [X] T037 Create `src/admin/main.tsx` (renders `AdminApp`; `export const ADMIN_MARKER = '__ADMIN_BUNDLE__'`, referenced once so it isn't removed from the bundle) and `src/admin/AdminApp.tsx`. `AdminApp` is a router with every admin route from contracts/routes.md pointing at placeholder components, wrapped in `ThemeProvider themeId="elegant-classic"` for the admin chrome.
- [X] T038 Create `src/admin/AdminLayout.tsx`:
  - Header with the brand, "Pasangan" and "Cadangan" links, and a "Keluar" button (wired in US1).
  - A persistent preview-phase banner (FR-019): "Mode pratinjau: data hanya tersimpan di browser ini dan belum tampil di website publik. Rutin unduh cadangan."
  - The page `<Outlet/>`.
  - Responsive: on mobile the nav collapses into a menu button.

**Checkpoint**: The public site serves `/anisa-raka` exactly as before (all 001 e2e tests pass), `/` shows the placeholder landing, and `admin.localhost` shows the admin shell. Unit tests pass for the schema, slugs, dates and repository.

---

## Phase 3: User Story 1 - Admin logs in (Priority: P1) 🎯 MVP

**Goal**: Login page, protected admin routes, logout and lockout.

**Independent Test**: Opening `/couples/new` while logged out redirects to `/login?next=…`. Correct credentials land on the requested page. Wrong credentials show "Email atau kata sandi salah". 5 failures lock login for 60 s. "Keluar" logs out.

- [X] T039 [P] [US1] Create `src/admin/auth/types.ts` exactly as in contracts/auth.md: `AdminSession`, `AuthService`, `InvalidCredentialsError` (message "Email atau kata sandi salah") and `LockedOutError` with `retryAt`.
- [X] T040 [US1] Create `src/admin/auth/LocalAuthService.ts`:
  - **Credentials**: compare `email` case-insensitively with `VITE_ADMIN_EMAIL`, and the hex SHA-256 of the password (`crypto.subtle.digest`) with `VITE_ADMIN_PASSWORD_SHA256`.
  - **Session**: `{ email, expiresAt: now + 12 h }` at localStorage key `admin.session`. Expired sessions are cleared in `current()`.
  - **Lockout**: localStorage key `admin.lockout` holds `{ failures, lockedUntil }`. Each failure adds 1. **At 5**, set `lockedUntil = now + 60 s` and reset the counter. While locked, throw `LockedOutError` without checking the password. A success clears it.
  - **Tabs**: `subscribe` also listens to `storage` events.
  - **Misconfigured**: if the env vars are missing, `login` throws an Error "Login belum dikonfigurasi (lihat .env.example)".

  Wrap all localStorage access in try/catch.
- [X] T041 [P] [US1] Write `tests/unit/auth.test.ts` (fake timers): correct login, wrong password, email case, 5th failure → `LockedOutError` with `retryAt` 60 s later, login refused during the lock even with the correct password, accepted after 60 s, session expiry after 12 h, logout, and missing env.
- [X] T042 [US1] Create `src/admin/auth/AuthProvider.tsx` (`useAuth()` → `{ session, login, logout }`) and `src/admin/auth/RequireAuth.tsx`. No session → `<Navigate to={'/login?next=' + encodeURIComponent(path + search)} replace/>`. `safeNext(next)` accepts only values starting with `/` and not `//`.
- [X] T043 [US1] Create `src/admin/auth/LoginPage.tsx`:
  - email and password fields, using `FormField`
  - the "Masuk" button shows "Memproses…" while working
  - on `InvalidCredentialsError`, show the message and clear the password
  - on `LockedOutError`, show "Terlalu banyak percobaan. Coba lagi dalam {n} detik." with a live countdown and the button disabled
  - on success, `navigate(safeNext(next) ?? '/')`
  - an existing session redirects to `/`
  - a note: "Halaman ini hanya untuk admin."
- [X] T044 [US1] Wire it up in `src/admin/AdminApp.tsx`: `/login` is public, and every other route is wrapped in `RequireAuth` + `AdminLayout`. Connect "Keluar" in `AdminLayout` to `logout()` → `/login`.
- [X] T045 [P] [US1] Write `tests/e2e-admin/login.spec.ts`: the guard and redirect back to `/couples/new`, wrong credentials, a 5-failure lockout message, logout then guard again, and `/login` while logged in → `/`. Add the helper `tests/e2e-admin/helpers.ts` with `login(page)`.

**Checkpoint**: The admin is protected; the MVP shell is usable.

---

## Phase 4: User Story 2 - Create a couple and get its addresses (Priority: P1)

**Goal**: "Tambah Pasangan", slug suggestion and validation, the couple list with copyable addresses, a full-page preview and the send-invitation page inside the admin.

**Independent Test**: Create "Budi & Sari" and confirm the slug `budi-sari` is suggested. `login` and duplicate slugs are rejected. The list shows both addresses with "Salin". The preview shows Budi & Sari, and its send-invitation links start with `VITE_PUBLIC_SITE_URL/budi-sari?`.

- [X] T046 [P] [US2] Create `src/data/emptyContent.ts` with `emptyContent(brideNick, groomNick): WeddingContent`:
  - nicknames filled in, everything else blank
  - one event "Akad Nikah", `isMain: true`, no date yet
  - default cover heading "The Wedding of"
  - `defaultGuestLabel` "Bapak/Ibu/Saudara/i"
  - closing message and `shareMessage` copied from the sample
- [X] T047 [US2] Create `src/admin/couples/NewCouplePage.tsx`:
  - fields "Nama panggilan mempelai wanita", "Nama panggilan mempelai pria", "Alamat undangan"
  - the slug updates live from `slugify` until the admin edits it manually
  - a preview line `{publicSiteUrl}/{slug}`
  - `validateSlug` plus an async uniqueness check through `findBySlug(slug, { includeDrafts: true })`, with the message "Nama alamat sudah dipakai pasangan lain"
  - default theme picker (the same 3 cards style as send-invitation)
  - submit → `coupleRepository.create({ slug, defaultTheme, content: emptyContent(...) })` → navigate to `/couples/:id/mempelai`
- [X] T048 [P] [US2] Create `src/admin/components/CopyField.tsx`: label, monospace value (wrapping), and a "Salin" button using `copyText` with the toast "Tersalin!".
- [X] T049 [US2] Create `src/admin/couples/CoupleListPage.tsx` showing `coupleRepository.list()` (await `ready`) as cards. Each card has a thumbnail (cover via `mediaStore.getBlob`, revoked on unmount), names, `formatDateId(mainDate)` or "Tanggal belum diisi", a Draf/Aktif badge, `CopyField` for "Undangan" `coupleUrl(slug)` and "Kirim undangan" `coupleSendUrl(slug)`, and buttons "Ubah", "Pratinjau" and "Kirim Undangan". There's an empty state with the "Tambah Pasangan" button, which is also in the header.
- [X] T050 [US2] Create `src/admin/preview/PreviewFrame.tsx` (route `/preview-frame`), per contracts/preview-messaging.md. In this story, implement only the **saved-couple mode**: `?couple=<id>` loads through `coupleRepository.get` (any status), runs `resolveMedia(content, mediaStore)` and renders the same provider stack as the public `CouplePage` (theme from `?t=` or `defaultTheme`, guest from `?inv=`). Unknown id → "Undangan tidak ditemukan".
- [X] T051 [US2] Create `src/admin/preview/FullPreviewPage.tsx` (route `/couples/:id/preview`): a top bar "← Kembali" with theme buttons 1/2/3 (sets `?t=`), and a full-height iframe of `/preview-frame?couple=:id` + the current `search`.
- [X] T052 [US2] Create `src/admin/preview/AdminSendInvitationPage.tsx` (route `/couples/:id/send-invitation`). Load the couple and render `SendInvitationPage` with `coupleUrl = coupleUrl(slug)`, which points to the **public** address, and `previewUrl = (n, t) => '/preview-frame?couple=' + id + '&' + new URLSearchParams({ inv: n, t })`. Add a back link.
- [X] T053 [P] [US2] Write `tests/e2e-admin/couple-create.spec.ts`:
  - log in, create Budi & Sari, assert the slug `budi-sari`
  - entering `login` shows "Nama alamat ini dipakai oleh sistem"; entering `anisa-raka` shows "Nama alamat sudah dipakai pasangan lain"
  - the list shows both addresses, and "Salin" copies `http://localhost:5173/budi-sari`
  - the full preview iframe shows "Budi" on the cover
  - the send-invitation links start with `http://localhost:5173/budi-sari?inv=`

**Checkpoint**: Couples can be created and their addresses copied. US1 and US2 together are a usable MVP.

---

## Phase 5: User Story 3 - Fill in all invitation details (Priority: P1)

**Goal**: An editor with tabs for every content group, validated by the shared schema, with save, conflict handling and an unsaved-changes guard.

**Independent Test**: Fill each tab and save. Two main events, or end before start, block saving with the exact messages. Reopen and everything is kept, and the preview reflects it. Leaving with unsaved edits warns.

- [X] T054 [US3] Create `src/admin/editor/useCoupleForm.ts` with `useForm<WeddingContent>` and `zodResolver(weddingContentSchema)`, plus separate state for `slug`, `defaultTheme` and `status`. It returns:
  - `save()`: `coupleRepository.update(id, { content, slug, defaultTheme }, version)`, followed by the toast "Tersimpan".
  - On `ConflictError`: show the dialog "Data pasangan ini sudah diubah di tab lain." with "Muat ulang" and "Timpa".
  - On `SlugTakenError`: a field error on the slug.
  - `isDirty`.
- [X] T055 [US3] Create `src/admin/editor/EditorPage.tsx` (routes `/couples/:id/:tab`):
  - header with the names, status badge and "Simpan" (disabled when not dirty, shows "Menyimpan…")
  - tab bar (horizontal scroll on mobile) for `mempelai, acara, foto, cerita, hadiah, musik, penutup, pesan, pengaturan`, with an error dot on tabs that have errors
  - lazy-loaded tab components
  - `useBlocker(isDirty)` plus `beforeunload`, with the dialog "Perubahan belum disimpan. Tinggalkan halaman?" (FR-013)
  - on a failed save, jump to the first tab with an error
- [X] T056 [P] [US3] Create `src/admin/editor/tabs/MempelaiTab.tsx`: for the bride and the groom, nickname (1–30), full name (2–80), child order, father and mother (2–80), Instagram (optional); plus the order select (bride-first/groom-first), the hashtag, and the cover heading and default guest label.
- [X] T057 [P] [US3] Create `src/admin/editor/tabs/AcaraTab.tsx` with `useFieldArray(events)`. Each event has a name, a start `datetime-local` and an optional end `datetime-local` (both through `toIsoWithOffset` and `fromIsoWithOffset`), a timezone select WIB/WITA/WIT shared by start and end, venue, address and map URL (https), a radio "Acara utama", ↑/↓ reorder buttons and "Hapus" (disabled when only one event is left). "Tambah Acara" adds an event. Show the schema messages "Pilih tepat satu acara utama" and "Jam selesai harus setelah jam mulai" inline.
- [X] T058 [P] [US3] Create `src/admin/editor/tabs/CeritaTab.tsx`: a field array of milestones (title, date text, description) with ↑/↓, add and remove. The photo field slot is filled in US4.
- [X] T059 [P] [US3] Create `src/admin/editor/tabs/HadiahTab.tsx`: a toggle "Tampilkan bagian hadiah" that sets `gifts` to undefined or an object, an intro textarea, and a field array of accounts (provider, account number with the message "Nomor rekening hanya boleh angka", holder). The logo slot is filled in US4. The optional address group has recipient, address and phone.
- [X] T060 [P] [US3] Create `src/admin/editor/tabs/PenutupTab.tsx` (closing message, optional quote text and source) and `src/admin/editor/tabs/PesanTab.tsx` (shareMessage textarea up to 2000 characters, with the placeholder legend `{nama} {link} {mempelai} {tanggal}` and "Kembalikan pesan awal").
- [X] T061 [P] [US3] Create `src/admin/editor/tabs/PengaturanTab.tsx`: an "Alamat undangan" slug field (validated as in T047; when the couple is active and the slug changed, show the warning "Link yang sudah dibagikan akan berhenti berfungsi"), default theme cards, a Draf/Aktif switch (`setStatus`, applied immediately with a toast) and a read-only list of the couple's two addresses using `CopyField`.
- [X] T062 [P] [US3] Write `tests/e2e-admin/editor.spec.ts`:
  - fill the names and parents
  - add a second event and mark both main → "Pilih tepat satu acara utama"
  - set end before start → "Jam selesai harus setelah jam mulai"
  - fix, save → "Tersimpan"
  - reload and the values persist
  - edit and click another nav link → the unsaved-changes dialog
  - the full preview shows the new event name and time "08.00 – 10.00 WIB"

**Checkpoint**: A couple can be fully described without photos.

---

## Phase 6: User Story 4 - Upload photos and music (Priority: P1)

**Goal**: Image and audio fields with validation, compression, preview, replace, remove and reorder.

**Independent Test**: Upload a ~5 MB JPEG as the cover, 2 portraits and 6 gallery photos. Stored sizes are under 500 KB. Reorder, remove one, and leave an alt empty, which blocks saving. Upload an mp3 and play it. The invitation shows the new photos in the new order.

- [X] T063 [P] [US4] Create `src/admin/media/compressImage.ts`:
  - `PRESETS = { cover: 1600, gallery: 1600, story: 1000, portrait: 800, logo: 400 }`
  - `fitWithin(w, h, max)`: pure sizing math
  - `validateUpload(file, kind)`: image must be `image/*` and audio `audio/*`, each at most **10 MB** (`10 * 1024 * 1024`). Messages: "File harus berupa gambar", "File harus berupa audio", "Ukuran maksimal 10 MB".
  - `compressImage(file, preset)`: decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`; draw on an `OffscreenCanvas`, or `document.createElement('canvas')` when unavailable; encode `image/webp` at 0.8; if the resulting `blob.type !== 'image/webp'`, re-encode `image/jpeg` at 0.82. Returns `{ blob, width, height }`.
- [X] T064 [P] [US4] Write `tests/unit/compressImage.test.ts` for `fitWithin` (landscape, portrait, already small, square) and every `validateUpload` branch, including exactly 10 MB accepted and 10 MB + 1 byte rejected.
- [X] T065 [US4] Create `src/admin/media/useMediaUpload.ts`. It runs validate → compress (images) → `mediaStore.put(coupleId, …)` → returns an `ImageRef { src: 'media:<id>', width, height }` or `{ src: 'media:<id>' }` for audio. It keeps a session map `id → blob: URL` for previews, revoked on unmount, and tracks uploads created this session. On unmount without a save, it deletes uploads that aren't referenced by the saved content.
- [X] T066 [US4] Create `src/admin/media/ImageField.tsx`: a drop zone and "Pilih Foto" button (`accept="image/*"`), the thumbnail via a resolved URL, "Ganti" and "Hapus", a progress state "Memproses…", inline errors, and the shown size after compression (e.g. "312 KB").
- [X] T067 [US4] Create `src/admin/media/GalleryField.tsx`: multi-select upload (at most **30** total, otherwise "Maksimal 30 foto"), a grid of thumbnails using `@dnd-kit/sortable` (`rectSortingStrategy`, pointer + touch + keyboard sensors), ↑/↓ buttons per item, an alt input per item ("Deskripsi foto wajib diisi"; the item gets a red ring when invalid), an optional caption, and "Hapus".
- [X] T068 [US4] Create `src/admin/media/AudioField.tsx`: "Pilih Musik" (`accept="audio/*"`), an `<audio controls>` preview, an optional title, and "Ganti" and "Hapus".
- [X] T069 [US4] Create `src/admin/editor/tabs/FotoTab.tsx` with the cover background (`ImageField`, preset `cover`, required), the bride and groom photos (preset `portrait`, required) and the gallery (`GalleryField`). Fill the slots: the story milestone photo in `CeritaTab` (preset `story`), the account logo in `HadiahTab` (preset `logo`), and create `src/admin/editor/tabs/MusikTab.tsx` with `AudioField`.
- [X] T070 [US4] Add a "Penyimpanan" meter to `src/admin/couples/StorageMeter.tsx` and show it on the couple list. It uses `mediaStore.usage()` and requests `navigator.storage.persist()` once. It warns ("Penyimpanan hampir penuh — unduh cadangan") when usage passes 80% of quota or quota is under 200 MB.
- [X] T071 [P] [US4] Add fixtures `tests/e2e-admin/fixtures/` (a ~5 MB JPEG generated by `scripts/generate-fixtures.mjs` with sharp at 4000×3000 quality 98, three small JPEGs, a short mp3 or wav, and a `notes.txt` that isn't an image). Write `tests/e2e-admin/media.spec.ts`:
  - upload the 5 MB cover and assert the shown size is < 500 KB
  - uploading `notes.txt` gives "File harus berupa gambar"
  - upload 3 gallery photos, reorder with ↑, remove one; leaving an alt empty blocks saving with "Deskripsi foto wajib diisi"
  - fill it in, save, reload; the gallery order persists and the preview iframe shows the photos in that order
  - upload audio; the player is visible

**Checkpoint**: The admin can set up a real couple end to end (SC-001 can be timed).

---

## Phase 7: User Story 5 - Live preview while editing (Priority: P2)

**Goal**: A phone preview beside the editor that follows unsaved edits and can switch themes.

**Independent Test**: Typing a nickname updates the preview within 1 s. Theme 2 in the preview doesn't change the saved default theme. On phone width, the preview opens from "Lihat Tampilan".

- [X] T072 [US5] Extend `src/admin/preview/PreviewFrame.tsx` with the **live mode** from contracts/preview-messaging.md:
  - with no `?couple=`, post `{ type: 'preview:ready' }` to the parent on mount
  - on `preview:update` (same origin only, known type), render the given `content`, `themeId` and `guestName`; `openInvitation: true` skips the cover
  - wrap rendering in an error boundary that keeps the last good render
  - make section rendering tolerate partial drafts: an event without a date is hidden, and an empty `src` shows the `SafeImage` placeholder
- [X] T073 [US5] Create `src/admin/editor/PhonePreview.tsx`:
  - a scaled iframe at 375×760 (the same frame style as send-invitation) of `/preview-frame`
  - it watches the form values (`watch()`), resolves `media:` refs with the session blob URL map from `useMediaUpload` plus `mediaStore` for saved ones, and posts `preview:update` debounced **250 ms**
  - it re-posts on `preview:ready`
  - controls: theme 1/2/3 (local state, starting at `defaultTheme`), a guest-name text input, and a "Sampul / Isi" toggle (`openInvitation`)
- [X] T074 [US5] Place `PhonePreview` in `EditorPage`: a sticky right column at `lg:`. Below `lg`, a floating "Lihat Tampilan" button opens it in a full-screen sheet with "Tutup".
- [X] T075 [P] [US5] Write `tests/e2e-admin/preview.spec.ts`:
  - type a new nickname and expect it inside the preview frame (frameLocator) within 1000 ms, without saving
  - switch the preview to theme 2; the frame's `html[data-theme]` is `elegant-classic`, and after reload the Pengaturan tab still shows the original default theme
  - on the 375 project, "Lihat Tampilan" opens the sheet

**Checkpoint**: Editing gives instant visual feedback.

---

## Phase 8: User Story 6 - Manage the couple list (Priority: P2)

**Goal**: Search, publish/unpublish, duplicate, delete with confirmation, plus backup and restore.

**Independent Test**: Search filters. Toggling Draf/Aktif works. Duplicating creates `…-salinan` as Draf. Deleting after typing the slug removes the couple and its photos (the storage meter drops). Back up, clear site data, then restore with "Ganti semua", and everything returns identical.

- [X] T076 [US6] Add search to `src/admin/couples/CoupleListPage.tsx`: a text input filtering by names or slug (case- and accent-insensitive) with a result count, plus a status filter (Semua/Draf/Aktif).
- [X] T077 [US6] Add actions to each card in `CoupleListPage`: a "Terbitkan"/"Jadikan Draf" toggle (`setStatus`), "Duplikat" (`duplicate` → toast "Salinan dibuat" → highlight the new card) and "Hapus".
- [X] T078 [US6] Create `src/admin/couples/DeleteDialog.tsx`, a modal saying "Hapus {names}? Semua data dan foto akan dihapus permanen." The confirm button is enabled only when the typed text equals the slug. It calls `remove(id)` with the toast "Pasangan dihapus" and refreshes the list and storage meter.
- [X] T079 [P] [US6] Create `src/data/backup.ts` per contracts/backup-format.md:
  - `createBackup(repo, media)` returns a Blob of the JSON envelope `{ format: 'wedding-admin-backup', formatVersion: 1, createdAt, app: { build }, couples, media[] with base64 data }`.
  - `parseBackup(file)` validates with zod, including `size === decoded length`, and returns a summary `{ couples, mediaCount, totalBytes, conflicts }` or throws "File cadangan tidak valid: <first problem>".
  - `restoreBackup(parsed, mode: 'replace' | 'add')`: "replace" clears both stores first; "add" skips couples whose id or slug exists and returns the skipped names. Each couple is written with its media in one transaction, keeping the media ids.
- [X] T080 [P] [US6] Write `tests/unit/backup.test.ts` (fake-indexeddb): the round trip back up → clear → restore replace gives deep-equal couples, including `version`, and byte-identical media blobs (SC-008). Also: add mode skips existing slugs, an invalid format or size mismatch is rejected with nothing written, and a newer `formatVersion` is rejected.
- [X] T081 [US6] Create `src/admin/backup/BackupPage.tsx` (route `/backup`):
  - "Unduh Cadangan" downloads `undangan-backup-YYYYMMDD-HHmm.json`, showing the size
  - "Pulihkan dari File" opens a file input → `parseBackup` → a summary card (counts, size, conflicting slugs) → mode radios "Tambahkan (lewati yang sudah ada)" and "Ganti semua" (the latter needs the confirmation "Semua data saat ini akan diganti") → "Pulihkan" → a result toast
  - the date of the last backup is stored in localStorage `admin.lastBackupAt` and shown, and also on the list page if older than 7 days
- [X] T082 [P] [US6] Write `tests/e2e-admin/couple-manage.spec.ts`:
  - create two couples, search filters to one
  - a status toggle changes the badge
  - duplicate creates `budi-sari-salinan` as Draf
  - the delete dialog keeps confirm disabled until the slug is typed; after deleting, the card is gone
  - download a backup (`page.waitForEvent('download')`), open a **new browser context** (empty storage), log in, restore with "Ganti semua", and the same couples appear with their photos

**Checkpoint**: The admin can work safely with many couples.

---

## Phase 9: User Story 7 - Landing page (Priority: P3)

**Goal**: `wedding.johansuryanto.dev/` presents the service with theme examples and a WhatsApp contact.

**Independent Test**: The root shows the description, steps, three theme examples (opening `/anisa-raka?t=1|2|3`) and a WhatsApp button pointing at `wa.me/<number>?text=…`. There is no admin link, and no horizontal overflow on any viewport.

- [X] T083 [P] [US7] Create `src/config/service.ts` with `brandName`, `tagline`, `whatsappNumber` (placeholder `6281234567890`, with the comment "GANTI dengan nomor asli"), `whatsappMessage` ("Halo, saya ingin memesan undangan digital."), `sampleSlug: 'anisa-raka'`, `features[]` (e.g. "3 pilihan tema", "Nama tamu di setiap link", "Hitung mundur & simpan tanggal", "Galeri foto", "Amplop digital", "Konfirmasi kehadiran & ucapan") and `steps[]` ("Hubungi kami", "Kirim data & foto", "Pilih tema & bagikan link ke tamu").
- [X] T084 [US7] Create `src/public-site/pages/Landing.tsx`:
  - a hero with the brand and tagline and a "Pesan Sekarang" button (`wa.me` link)
  - a features grid
  - a "Pilih Tema" section of 3 theme cards, each wrapped in `data-theme` (same swatch style as send-invitation) and linking to `/{sampleSlug}?t={code}`, opened in a new tab, labelled "Lihat Contoh"
  - a "Cara Pesan" 3-step section
  - a footer with WhatsApp
  - the page itself uses the `romantic-floral` theme via `ThemeProvider`
  - SEO: `document.title` and a meta description
  - no links to the admin

  Replace the placeholder route in `PublicApp.tsx`.
- [X] T085 [P] [US7] Write `tests/e2e/landing.spec.ts`:
  - the root shows the brand and the 3 theme cards
  - each "Lihat Contoh" href is `/anisa-raka?t=1`, `2` and `3`
  - the WhatsApp href starts with `https://wa.me/6281234567890?text=`
  - the page contains no `admin` link
  - no horizontal overflow, run on all 6 public viewport projects

**Checkpoint**: All seven user stories are functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T086 [P] Write `tests/e2e-admin/responsive.spec.ts`. For each admin page (login, list, new, editor tabs mempelai/acara/foto, backup), assert `scrollWidth <= innerWidth` at 375 and 1366. Run the manual quickstart check at 320, 768 and 1920 (SC-006).
- [X] T087 Run `npm run build` and `npm run check:public-build`. Confirm there's no `admin.html` and no `__ADMIN_BUNDLE__` in `dist/public` (FR-001). Record the bundle sizes: public initial JS must be ≤ 150 KB gzipped and admin ≤ 350 KB gzipped. If over budget, lazy-load the editor tabs and dnd-kit.
- [X] T088 [P] Do an accessibility pass on `src/admin/**`: labels for every input, `aria-invalid` and `aria-describedby` on errors, focus moved to the first error on a failed save, dialogs with `role="dialog"`, a focus trap and Esc to close, drag-and-drop announcements in Indonesian through dnd-kit `announcements`, and touch targets ≥ 44 px.
- [X] T089 [P] Update `README.md`:
  - two sites and their addresses
  - local URLs (`localhost:5173`, `admin.localhost:5173`)
  - `.env.local` setup and `npm run hash-password`
  - how to add a couple in the dashboard
  - backup advice and the preview-phase limitation
  - deploying `dist/public` → `wedding.johansuryanto.dev` and `dist/admin` → `admin.wedding.johansuryanto.dev`
  - what changes when the backend arrives: `src/data/index.*.ts` and `src/admin/auth`

  Remove outdated `/send-invitation` and `activeTheme` instructions.
- [X] T090 [P] Update feature 001 docs to point at the new locations: `specs/001-wedding-invitation-site/contracts/url-parameters.md` (couple addresses `/<slug>`) and `contracts/theme-contract.md` (default theme per couple instead of `activeTheme`).
- [X] T091 Run every scenario in `specs/002-admin-couple-dashboard/quickstart.md` (1–17), timing scenario 17 for SC-001. Record the results in a "Validation results" section of the quickstart. Confirm that `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` all pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. T030 (existing suites green at `/anisa-raka`) **gates** all story work.
- **US1 (Phase 3)**: Depends on Foundational. It's the MVP gate, because every admin page sits behind login.
- **US2 (Phase 4)**: Depends on US1, for the routes behind auth.
- **US3 (Phase 5)**: Depends on US2 (a couple must exist; `EditorPage` route).
- **US4 (Phase 6)**: Depends on US3 (tabs and form). Can start in parallel with late US3 tab tasks once T054/T055 exist.
- **US5 (Phase 7)**: Depends on US3 (form), and on US4's `useMediaUpload` for photo previews.
- **US6 (Phase 8)**: Depends on US2 (list). Backup tasks T079/T080 only need Foundational and can run early.
- **US7 (Phase 9)**: Depends only on Foundational (T026). Can run in parallel with US1–US6.
- **Polish (Phase 10)**: After all desired stories.

### Within Each Story

Types and pure logic → unit tests → services and hooks → screens → wiring → e2e.

### Parallel Opportunities

- **Setup**: T005–T010 in parallel after T001–T004.
- **Foundational**: T017–T020, T022 and T024 in parallel. T014 must follow T012/T013. T031–T034 run in sequence.
- **US3**: the tabs T056–T061 in parallel after T054/T055.
- **US4**: T063/T064 and T071 in parallel; the fields T066–T068 in parallel after T065.
- **US6**: T079/T080 in parallel with T076–T078.
- **US7**: entirely in parallel with the admin stories.

---

## Parallel Example: User Story 3

```text
Task: "T056 MempelaiTab in src/admin/editor/tabs/MempelaiTab.tsx"
Task: "T057 AcaraTab in src/admin/editor/tabs/AcaraTab.tsx"
Task: "T058 CeritaTab in src/admin/editor/tabs/CeritaTab.tsx"
Task: "T059 HadiahTab in src/admin/editor/tabs/HadiahTab.tsx"
Task: "T060 PenutupTab + PesanTab"
Task: "T061 PengaturanTab"
```

## Parallel Example: Foundational data layer

```text
Task: "T018 src/data/types.ts"
Task: "T019 src/data/slug.ts"
Task: "T020 src/data/dates.ts"
Task: "T022 src/data/resolveMedia.ts"
Task: "T024 src/data/static/StaticCoupleRepository.ts"
```

---

## Implementation Strategy

### MVP (what you can "see how it looks" soonest)

1. Phase 1 + Phase 2, with the existing invitation still perfect at `/anisa-raka`.
2. US1 (login) → US2 (create couple, addresses, full preview, send-invitation).
3. **Stop and look**: log in, create a couple, preview it, copy links.

### Incremental Delivery

1. Add US3 (all details) and US4 (photos and music). A real couple can now be set up.
2. Add US5 (live preview) and US6 (list management and backup).
3. Add US7 (landing page). It can be done any time after Phase 2.
4. Polish, then deploy both builds.

### Later (backend phase, not in this list)

Add `Http*` implementations of `CoupleRepository`, `MediaStore` and `AuthService`, swap them in `src/data/index.public.ts`, `src/data/index.admin.ts` and the auth provider, and remove the preview-phase banner. No screen changes.

---

## Notes

- **[P]** means different files with no dependency on incomplete tasks.
- **Deviation from plan.md**: `src/components/*` stays in place, shared by both sites, instead of moving under `src/invitation/components/`. Only `App.tsx` and `sections/` move (T014), to keep the refactor small.
- **Commit after each task** or logical group once git is initialized.

---

## Implementation Notes (2026-10-02)

Deviations from the task text above, and why:

- **T004 (preview)**: `npm run preview` runs `scripts/serve.mjs`, a small static server that serves `dist/admin` to `admin.*` hosts and `dist/public` to the rest, with byte-range support (Safari/WebKit needs ranges to play audio). This is simpler and closer to production than a Vite preview plugin. The `devHostRouting` plugin is used only by `npm run dev`.
- **T011 (music)**: the sample music is now an imported asset (`src/content/samples/anisa-raka/backsound.wav`) instead of `public/music/`, so both builds include it and the admin can seed it.
- **T013 (themes)**: `ThemeProvider` tracks nesting depth so the **innermost** provider owns `<html data-theme>`. With nested providers (admin chrome → a couple's page), React runs the outer effect last, which would otherwise win.
- **T014–T016 (invitation)**: added the shared helpers `CoupleInvitation` (provider stack used by both the public page and the admin preview), `GuestNameProvider` (guest-name override for the live preview), `MessagePage` and `PhoneFrame`. `Invitation` remounts via `key` when switching between cover and contents.
- **T050/T072 (preview frame)**: instead of keeping the last good render, `sanitizeForPreview` makes unfinished drafts safe to render, and an error boundary shows "Lengkapi data untuk melihat tampilan." as a fallback. contracts/preview-messaging.md is updated to match.
- **T049 + T076–T078**: the couple list was built with search, the status filter, publish, duplicate and delete in one go, rather than revisited in US6.
- **T074 (editor preview)**: only one preview is mounted at a time: the side panel at ≥1024 px, or the "Lihat Tampilan" sheet below that. Hiding the other with CSS left two live iframes running on phones.
- **T079 (backup)**: restore validates couples **structurally**, not against the full content rules, because drafts may be unfinished (they are created empty). Each couple is written with its media in one transaction (`putWithMedia`). contracts/backup-format.md is updated to match.
- **Tests**: the e2e build sets `VITE_PUBLIC_SITE_URL=http://localhost:4817`, so expected links use port 4817. Admin specs run on Chromium only (`admin.localhost`). `tests/e2e-admin/responsive.spec.ts` also resizes to 320/768/1920.
- **Extra**: `scripts/generate-fixtures.mjs` creates the upload fixtures (a 6.9 MB photo, a 19.7 MB over-limit photo, small JPEGs, audio, a text file).
