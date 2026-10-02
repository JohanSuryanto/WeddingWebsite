# Implementation Plan: Admin Login & Couple Dashboard (Frontend)

**Branch**: `002-admin-couple-dashboard` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-admin-couple-dashboard/spec.md`

## Summary

Turn the single-couple invitation into **two sites from one codebase**:

- **Public site** (`wedding.johansuryanto.dev`): a landing page, couple invitations at `/<slug>`, and per-couple send-invitation pages.
- **Admin site** (`admin.wedding.johansuryanto.dev`): login and a dashboard where the admin creates couples, fills in every part of the invitation, uploads compressed photos and music, previews live in all three themes, and copies the couple's addresses.

Approach:
- **Separate builds.** Vite multi-page, built per site, so the public build contains no admin code.
- **Routing.** React Router on both sites.
- **Content by context.** Invitation content and theme come through React context, so any couple can render.
- **One data layer.** A single replaceable interface, `CoupleRepository` + `MediaStore`. In this phase it's backed by IndexedDB on the admin site and by bundled samples on the public site. The shared backend replaces it later without screen changes.
- **Forms.** react-hook-form with one zod schema that holds all content rules.
- **Live preview.** A phone-sized iframe fed by `postMessage`.

## Technical Context

**Language/Version**: TypeScript 6, React 19 (unchanged from 001)

**Primary Dependencies**: Existing (Vite 8, Tailwind 4, yet-another-react-lightbox, @fontsource/*), plus:
- `react-router` 7
- `react-hook-form`, `zod`, `@hookform/resolvers`
- `idb`
- `@dnd-kit/core`, `@dnd-kit/sortable`
- Dev only: `fake-indexeddb`

**Storage**:
- **Admin, this phase**: IndexedDB (couples + media Blobs) in the admin's browser.
- **Public, this phase**: bundled sample couple.
- **Next phase**: one shared backend and database for both sites.

**Testing**: Vitest (+ fake-indexeddb), Playwright (public: 6 viewports; admin: Chromium at 375 and 1366 on `admin.localhost`)

**Target Platform**: Modern browsers. Admin use is mainly desktop and phone Chrome.

**Project Type**: Frontend-only web application, two static sites from one repository

**Performance Goals**:
- Live preview updates < 1 s (SC-004)
- Photos ≥ 5 MB stored at < 500 KB (SC-005)
- Public initial JS stays ≤ 150 KB gzipped
- Admin JS budget ≤ 350 KB gzipped (forms and drag-and-drop libraries)

**Constraints**:
- No backend in this phase
- Public build excludes admin code (FR-001)
- Indonesian UI (FR-020)
- No horizontal scroll from 320 to 1920 px (SC-006)
- Data survives refresh (FR-018) and can be backed up and restored (FR-018b)

**Scale/Scope**:
- 1 admin; tens of couples
- ≤ 30 gallery photos per couple
- Public: 4 routes. Admin: 10 routes, 9 editor tabs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the **unfilled template**, so there are no ratified principles. The gates come from the spec and from feature 001's established constraints:

| Gate | Status |
|---|---|
| Spec has no open clarifications | ✅ All 3 resolved (storage, address format and landing page, two domains) |
| Public site never exposes admin (FR-001) | ✅ Separate builds plus a build check (`check:public-build`) |
| Single replaceable data layer for the backend phase (FR-018) | ✅ `CoupleRepository` / `MediaStore` interfaces, wired per site |
| Feature 001 behaviour preserved (SC-007) | ✅ Sections unchanged except reading from context. The existing e2e suite runs against `/anisa-raka`. |
| Themes stay content-independent (001 FR-018a) | ✅ `defaultTheme` per couple; `?t=` still wins |

**Post-design re-check**: ✅ All gates pass. The new dependencies are justified in research R3, R5, R8 and R9. Consider `/speckit-constitution` to record standing rules: Indonesian UI, public/admin separation, a shared schema as the single source of validation, and mobile-first.

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-couple-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── routes.md
│   ├── data-layer.md
│   ├── auth.md
│   ├── preview-messaging.md
│   └── backup-format.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
index.html                         # public entry → src/public-site/main.tsx
admin.html                         # admin entry  → src/admin/main.tsx
vite.config.ts                     # SITE=public|admin builds + devHostRouting plugin
.env.example                       # VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD_SHA256, VITE_PUBLIC_SITE_URL
scripts/
├── hash-password.mjs
├── check-public-build.mjs
└── generate-placeholders.mjs      # (existing)
public/                            # public-site static files (_redirects, music placeholder)
src/
├── invitation/                    # SHARED renderer (moved from today's App + sections)
│   ├── Invitation.tsx             # former App.tsx: cover gate, nav, sections, music
│   ├── WeddingProvider.tsx        # useWedding()
│   ├── sections/                  # Cover, Hero, Couple, Events, Story, Gallery, Gift, Rsvp, Wishes, Closing
│   └── components/                # existing components (Navigation, Countdown, …)
├── themes/                        # existing; + ThemeProvider/useTheme via context
├── content/
│   ├── types.ts                   # WeddingContent (existing)
│   └── samples/anisa-raka/        # former wedding.ts + images
├── data/                          # SHARED data layer
│   ├── types.ts  schema.ts  slug.ts  dates.ts  resolveMedia.ts  backup.ts
│   ├── static/StaticCoupleRepository.ts
│   ├── indexeddb/{db.ts, IndexedDbCoupleRepository.ts, IndexedDbMediaStore.ts, seed.ts}
│   ├── index.public.ts
│   └── index.admin.ts
├── send-invitation/               # existing page, now takes couple + base URL + preview URL builder
├── lib/                           # existing helpers (+ image compression)
├── services/                      # existing RSVP/wishes interfaces
├── config/
│   ├── site.ts                    # publicSiteUrl from env
│   └── service.ts                 # landing page texts + WhatsApp contact
├── public-site/                   # PUBLIC SITE app
│   ├── main.tsx  PublicApp.tsx (router)
│   └── pages/ Landing.tsx  CouplePage.tsx  CoupleSendInvitation.tsx  NotFound.tsx  Unavailable.tsx
└── admin/                         # ADMIN SITE app
    ├── main.tsx  AdminApp.tsx (router)  AdminLayout.tsx (header, logout, preview-phase banner)
    ├── auth/      types.ts  LocalAuthService.ts  RequireAuth.tsx  LoginPage.tsx
    ├── couples/   CoupleListPage.tsx  NewCouplePage.tsx  StorageMeter.tsx  DeleteDialog.tsx
    ├── editor/    EditorPage.tsx  useCoupleForm.ts  PhonePreview.tsx  tabs/{Mempelai,Acara,Foto,Cerita,Hadiah,Musik,Penutup,Pesan,Pengaturan}Tab.tsx
    ├── media/     compressImage.ts  ImageField.tsx  GalleryField.tsx  AudioField.tsx
    ├── preview/   PreviewFrame.tsx  FullPreviewPage.tsx  AdminSendInvitationPage.tsx
    └── backup/    BackupPage.tsx
tests/
├── unit/          # + schema, slug, dates, resolveMedia, repository, backup, auth, compress-sizing
├── e2e/           # existing public specs → /anisa-raka; + landing.spec.ts
└── e2e-admin/     # login, couple-crud, editor, media, preview, backup, responsive
    └── fixtures/  # sample JPEGs (one ~5 MB), mp3
```

**Structure Decision**: One repository, two Vite entries and two build outputs.
- **Shared code**: `src/invitation`, `src/themes`, `src/data`, `src/content`, `src/send-invitation`, `src/lib`.
- **Admin-only code**: `src/admin`. It is imported only from `admin.html`, which keeps it out of the public bundle. A script verifies this after every build.
- **Moved code**: today's `src/App.tsx` and `src/sections/*` move under `src/invitation/` with no behaviour change.

## Phase 0: Research

Complete; see [research.md](./research.md). It covers decisions R1–R18:
- the two-site build and local `*.localhost` routing
- the router, content and theme context, the data layer, and media references
- compression, forms and schema, drag-and-drop, the iframe preview
- local auth, dates, slugs, backup, storage quota
- the public site, link addresses, and tests

## Phase 1: Design & Contracts

Complete:
- [data-model.md](./data-model.md): Couple, Media, AdminSession, ServiceConfig, Backup, plus content validation for the dashboard with verbatim messages
- [contracts/routes.md](./contracts/routes.md): both sites, every route, reserved slugs, the addresses copied for each couple
- [contracts/data-layer.md](./contracts/data-layer.md): `CoupleRepository` and `MediaStore` (the backend swap point), helpers and guarantees
- [contracts/auth.md](./contracts/auth.md): the `AuthService` interface, the local implementation, lockout and the route guard
- [contracts/preview-messaging.md](./contracts/preview-messaging.md): the editor ↔ iframe protocol
- [contracts/backup-format.md](./contracts/backup-format.md): the file format and restore rules
- [quickstart.md](./quickstart.md): setup, running both sites, and 17 validation scenarios

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Admin data lives only in one browser (MVP) | Persistent-storage request, usage meter, backup and restore, and a clear banner (FR-019) |
| Moving sections and App breaks feature 001 | Move first without behaviour changes, then run the full existing unit and e2e suites before adding admin code |
| Client-side login is bypassable | Stated in the UI and the spec. No sensitive data in this phase. Real auth comes with the backend. |
| Admin bundle size | Lazy-load editor tabs and drag-and-drop; budget ≤ 350 KB gzipped |
| WebP encoding unavailable (Safari) | Detect the actual output type; fall back to JPEG |

## Complexity Tracking

No constitution violations. The additions beyond feature 001 (router, forms and schema, `idb`, dnd-kit, a second entry) are each required by specific functional requirements; see research R3, R5, R8 and R9.
