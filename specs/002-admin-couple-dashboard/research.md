# Research: Admin Login & Couple Dashboard (Frontend)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-02

Builds on feature 001: React 19, TypeScript, Vite, Tailwind v4, Vitest and Playwright, plus the existing theme system and invitation sections.

## R1. One codebase, two sites

- **Decision**: Use a Vite **multi-page** project with two HTML entries: `index.html` (public) and `admin.html` (admin). Each site is **built separately**, chosen by `SITE=public|admin` in `vite.config.ts`, which sets `build.rollupOptions.input` and `build.outDir`:
  - `npm run build:public` → `dist/public/` (for `wedding.johansuryanto.dev`)
  - `npm run build:admin` → `dist/admin/` (for `admin.wedding.johansuryanto.dev`)

  Shared code (themes, invitation sections, content types, schema, data-layer interfaces) is imported by both. Each build contains only what its entry imports.
- **Rationale**: FR-001 requires that the public address never exposes admin pages. With separate builds, the public output has no `admin.html` and no admin code at all, so guests download nothing extra. One repo keeps the dashboard preview and the real invitation identical, so they can't drift.
- **Alternatives considered**:
  - *One build with hostname switching*: admin code would ship to guests, and `/admin.html` would exist on the public domain.
  - *Two repositories or a monorepo with packages*: duplication, or extra tooling for no MVP benefit.

## R2. Two local addresses during development

- **Decision**: Run **one dev server** with a small Vite plugin, `devHostRouting`, in both `configureServer` and `configurePreviewServer`. For page navigations (requests that accept `text/html`), the `Host` header decides which entry is served:
  - `admin.localhost:5173` → `admin.html`
  - `localhost:5173` → `index.html`

  Modern browsers (Chromium, Firefox, Safari 17+) resolve any `*.localhost` to the loopback address without editing the hosts file.
- **Rationale**: This mirrors production's two domains locally, including the separate per-domain browser storage (see the spec's "Consequence for this phase").
- **Alternatives considered**: Two dev servers on different ports, which works but means two terminals and also differs per port. Editing the `hosts` file, which is fiddly on Windows.

## R3. Routing

- **Decision**: Add **React Router v7** (library mode, `createBrowserRouter`) to both sites.
  - **Public**: `/` landing, `/:slug` invitation, `/:slug/send-invitation`, `*` not found.
  - **Admin**: `/login`, `/` couple list, `/couples/new`, `/couples/:id` editor (tabs as nested routes), `/couples/:id/preview`, `/couples/:id/send-invitation`, `/preview-frame`, `/backup`.

  The router's `useBlocker` provides the unsaved-changes warning (FR-013).
- **Rationale**: There are now more than ten routes, with redirects after login (FR-002) and nested editor tabs. The hand-written path check in `main.tsx` doesn't scale to that.
- **Alternatives considered**: TanStack Router, which is excellent but heavier to learn. Keeping manual routing would mean reimplementing redirects and blockers.

## R4. Rendering any couple: content via context

- **Decision**: Replace the static `import { wedding }` used by sections with a `WeddingProvider` and `useWedding()` hook. Replace the module-level theme singleton with a `ThemeProvider` and `useTheme()` hook. The active theme is resolved per couple with `resolveThemeId(search, couple.defaultTheme)`, so `?t=` still wins (FR-008, FR-010). `applyTheme()` becomes an effect inside `ThemeProvider`.
- **Rationale**: Each page render now shows a different couple. Sections stay unchanged apart from where they read data from, which keeps feature 001's tests meaningful.
- **Alternatives considered**: Passing content through props to every section, which is noisy and touches every component signature.

## R5. Data layer (the "single replaceable" piece, FR-018)

- **Decision**: Define two interfaces ([contracts/data-layer.md](./contracts/data-layer.md)):
  - `CoupleRepository`: list, get, find by slug, create, update with version check, delete, duplicate, set status
  - `MediaStore`: put, get, delete, usage

  Implementations for this phase:

  | Site | Implementation | Contents |
  |---|---|---|
  | Admin | `IndexedDbCoupleRepository` + `IndexedDbMediaStore` | Database `wedding-admin` with stores `couples` and `media` (Blobs), using the tiny `idb` wrapper. Seeded with the Anisa & Raka sample on first run. |
  | Public | `StaticCoupleRepository` | Read-only, serving the built-in sample couple(s) bundled with the site |

  The backend phase adds `Http*` implementations of the same interfaces. Wiring lives in `src/data/index.<site>.ts`.
- **Rationale**: IndexedDB stores Blobs natively and has much more room than localStorage, which is limited to about 5 MB of strings and would overflow with a single photo set. Versioned updates give the "changed since opened" warning in the spec's edge cases.
- **Alternatives considered**: localStorage with base64 images, which is far too small and slow. OPFS (the browser's private file system), which is good for files but adds a second storage API for no gain over IndexedDB Blobs. A heavier wrapper (Dexie), where `idb` (~1 KB) is enough.

## R6. Image references and media resolution

- **Decision**: Keep feature 001's `ImageRef { src, width, height }`. In stored couples, `src` may be:
  - `media:<id>`, pointing to a blob in `MediaStore` (this phase), or
  - an absolute or bundled URL (the sample couple now, the backend later).

  `resolveMedia(content, mediaStore)` returns a copy with `media:` refs replaced by `blob:` object URLs, plus a `dispose()` that revokes them. Invitation components only ever see ordinary URLs.
- **Rationale**: Sections need no changes, the stored format survives backup and restore, and the backend can simply store real URLs.

## R7. Photo compression in the browser (FR-015, SC-005)

- **Decision**: A custom `compressImage(file, preset)` function:
  1. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`, which applies the EXIF rotation.
  2. Scale on an `OffscreenCanvas`, or a `<canvas>` where that's unavailable.
  3. Encode WebP at quality 0.8. If the browser returns a different type (Safari can't encode WebP), fall back to JPEG at 0.82.

  | Preset | Longest side |
  |---|---|
  | `cover` | 1600 px |
  | `gallery` | 1600 px |
  | `portrait` | 800 px |
  | `story` | 1000 px |
  | `logo` | 400 px |

  Files are checked before decoding: images (`image/*`) up to 10 MB, audio (`audio/*`) up to 10 MB. The stored record keeps the final width and height.
- **Rationale**: A 5 MB phone photo becomes roughly 150–400 KB at 1600 px WebP, which meets SC-005. No library is needed.
- **Alternatives considered**: `browser-image-compression` (about 30 KB), which does the same with more options than needed.

## R8. Forms and validation

- **Decision**: Use **react-hook-form** with **zod** through `@hookform/resolvers`. One `weddingContentSchema` (zod) encodes all content rules in FR-012: exactly one main event, end after start, alt text required, digits-only account numbers, slug format. The same schema replaces the hand-written checks in `tests/unit/content.test.ts` and becomes the validation contract for the backend. Arrays (events, story, gallery, accounts) use `useFieldArray`. Error messages are in Indonesian.
- **Rationale**: The content is deeply nested with dynamic arrays, which is exactly what these libraries handle well. A shared schema means the dashboard, tests and backend enforce identical rules.
- **Alternatives considered**: Hand-rolled forms, which would be a lot of state code for about 60 fields.

## R9. Reordering (US4-AS4)

- **Decision**: Use **@dnd-kit/core** and **@dnd-kit/sortable** for dragging (mouse, touch and keyboard), plus explicit ↑/↓ buttons on each item.
- **Rationale**: Accessible and works on touch. The buttons satisfy "up/down buttons on touch devices".

## R10. Live preview (FR-017, SC-004)

- **Decision**: The preview is an `<iframe>` of the admin's own `/preview-frame` route, sized like a phone (375×760, scaled to fit), as `/send-invitation` already does. The editor posts the **unsaved** draft to the frame with `postMessage({ type: 'preview:update', content, themeId, guestName })`. Before posting, the content goes through `resolveMedia` (R6). New, not-yet-saved uploads appear as `blob:` URLs created in the editor, and these are valid inside the same-origin frame. Updates are debounced by 250 ms. See [contracts/preview-messaging.md](./contracts/preview-messaging.md).
- **Rationale**: An iframe gives the preview a real phone-width viewport, so the layout's responsive breakpoints behave as on a phone. This was learned from the first `/send-invitation` preview attempt, which rendered at desktop sizes. `postMessage` lets the frame show edits without saving.
- **Alternatives considered**: Rendering in a scaled `<div>`, which gets the breakpoints wrong. Saving on every keystroke, which pollutes the stored data and the version history.

## R11. Admin login in a frontend-only phase (FR-001–004)

- **Decision**: An `AuthService` interface ([contracts/auth.md](./contracts/auth.md)) with a `LocalAuthService` implementation for this phase:
  - **Credentials**: `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD_SHA256` (a SHA-256 hash, so the plain password isn't in the bundle) from `.env.local`, which is git-ignored. The comparison uses `crypto.subtle.digest`.
  - **Session**: `{ email, expiresAt }` in localStorage, valid for 12 hours.
  - **Lockout**: a failed-attempt counter in localStorage. 5 failures pause login for 60 s (FR-004).

  A `RequireAuth` route wrapper sends to `/login?next=<path>` and back (FR-002).
- **Rationale**: This demonstrates the real flow. The spec states plainly that it is not real security until the backend (Assumptions, FR-019), and the dashboard banner says so. The backend phase swaps in `HttpAuthService` with a real session.

## R12. Dates and time zones (Assumption "Date entry")

- **Decision**: Each event has a date and time input (`<input type="datetime-local">`) plus a WIB/WITA/WIT select. `toIsoWithOffset(local, tz)` produces the existing `2027-02-14T08:00:00+07:00` format, and `fromIsoWithOffset` reverses it for editing. The zod schema checks that end is after start.
- **Rationale**: This keeps feature 001's content format and formatting functions unchanged.

## R13. Address names (FR-006)

- **Decision**: `slugify(a, b)` turns two nicknames into a slug: lowercase, accents removed (NFKD), non-alphanumeric characters converted to `-`, repeated hyphens collapsed, trimmed, and limited to 3–40 characters. `RESERVED_SLUGS` lives in `src/data/slug.ts`. Uniqueness is checked with `CoupleRepository.findBySlug`. Renaming a couple that is Aktif shows the "shared links will stop working" warning.

## R14. Backup and restore (FR-018b, SC-008)

- **Decision**: A single `.json` file in the [contracts/backup-format.md](./contracts/backup-format.md) format: a versioned envelope, the couple records, and media as base64 with type and size. Restore validates the file with zod, previews what it contains (how many couples, which slugs clash) and offers "replace all" or "add (skip existing)". Media are written back under their original ids, so `media:` refs stay valid.
- **Rationale**: One file is easy to keep on Google Drive, and JSON can be inspected. Size is about 1.33× the media size (for example ~12 MB for a couple with 30 photos), which is acceptable.
- **Alternatives considered**: A ZIP file via `fflate`, which is smaller but harder to inspect. It could be adopted later without changing the envelope.

## R15. Storage capacity (Assumption)

- **Decision**: On dashboard load, call `navigator.storage.persist()` so the browser won't evict the data when space is low, and `navigator.storage.estimate()` for the usage bar. Show a warning when usage passes 80% of quota or quota is under 200 MB, along with "Cadangkan sekarang" (back up now).

## R16. Public site in this phase

- **Decision**:
  - `StaticCoupleRepository` serves the sample couple at `/anisa-raka`, built from today's `wedding.ts`, which moves to `src/content/samples/anisa-raka/`.
  - Unknown slugs show "Undangan tidak ditemukan". Draft couples show "Undangan belum tersedia" (FR-009), which the static repository can return only if a sample is marked draft.
  - The landing page reads `src/config/service.ts`: WhatsApp number, texts, and the sample slug used for theme examples (`/anisa-raka?t=1|2|3`).
  - The old root invitation (`/`) moves to `/anisa-raka`, and existing e2e tests are updated to match.

## R17. Which address guest links use

- **Decision**: `VITE_PUBLIC_SITE_URL` sets the public origin. In production it's `https://wedding.johansuryanto.dev`; it defaults to `http://localhost:5173` in development. Both sites use it to build couple addresses (`<origin>/<slug>`), so links copied from the admin always point to the public site. The admin's send-invitation preview frame loads `/preview-frame?couple=<id>&inv=…&t=…` inside the admin, so drafts and not-yet-public couples preview correctly.

## R18. Testing

- **Decision**:
  - **Unit tests (Vitest)**: zod schema, slugify and reserved names, date conversion, `resolveMedia`, `IndexedDbCoupleRepository` against `fake-indexeddb` (CRUD, versioning, duplicate, delete removes media), backup round-trip, the auth service (hash check, lockout, expiry), and the sizing math of `compressImage`.
  - **Browser tests (Playwright)**: public projects keep the existing 6 viewports, pointing at `/anisa-raka`. Admin specs run on Chromium at 375 and 1366 against `admin.localhost`, covering login and redirects, creating a couple, uploading fixture photos, reordering, the live preview, Draf/Aktif, backup and restore into a fresh context, and no horizontal overflow (SC-006).
- **Rationale**: Every functional requirement and success criterion maps to at least one automated check, except SC-001 (time to set up a couple), which is a manual timing.
