# Implementation Plan: Server Storage for Couples, Media and Guest Responses

**Branch**: `003-backend-data-persistence` | **Date**: 2026-10-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-backend-data-persistence/spec.md`

## Summary

Replace the browser-only data layer from 002 with a real backend that both sites share. The free stack:

| Piece | Choice |
|---|---|
| Database | **PostgreSQL on Neon** (Singapore). Invitation content in `jsonb`, everything else in relational tables |
| Media | **Cloudinary**. The browser uploads directly with a server signature |
| Server | A **Hono** API in TypeScript, running as one **Vercel Function** (region `sin1`) |

Approach:
- **Same API on both sites.** The function is deployed with both existing Vercel projects, so each site calls its own `/api` on the same origin. An `API_SURFACE` setting mounts the admin routes only on the admin site.
- **Real admin login.** A scrypt password hash in a server environment variable, a revocable session cookie stored in Postgres, and a lockout enforced by the database.
- **Couple passcode.** Each couple's send-invitation page gets a 4-digit passcode. A correct code sets a signed per-couple cookie, which is revoked by increasing a version number when the passcode changes. Wrong guesses are throttled per couple.
- **Saved guest responses.** RSVPs and wishes are stored with an HttpOnly visitor cookie for "same browser" replacement, plus rate limits kept in the database.
- **Screens unchanged.** Screens keep the 002 interfaces. Only HTTP implementations and wiring files change.
- **No cloud needed locally.** Development and tests run fully offline with **PGlite** (in-process Postgres) and a local-disk media driver.

## Technical Context

**Language/Version**:
- TypeScript 6, React 19 (frontend, unchanged)
- Node.js 22 (server functions and scripts)

**Primary Dependencies**:
- Existing: Vite 8, react-router 7, react-hook-form, zod 4, dnd-kit
- New, server:
  - `hono`, `@hono/node-server` (dev and end-to-end only)
  - `drizzle-orm`, `drizzle-kit` (dev)
  - `postgres` (postgres.js), `@electric-sql/pglite`
  - `cloudinary` (server SDK, signing and admin calls)
- New, dev: `tsx` (scripts)
- Removed: `idb`, `fake-indexeddb`

**Storage**:
- Neon PostgreSQL Free (1 GB): couples, media metadata, RSVPs, wishes, sessions, throttles
- Cloudinary Free (25 credits per month): image and audio files
- Local and tests: PGlite + `.data/media`

**Testing**:
- **Vitest.** Unit tests, plus API integration through Hono `app.request()` against in-memory PGlite and `LocalProvider`.
- **Playwright.** Existing public and admin suites, now against built sites plus the real API on PGlite. New specs for the passcode, responses and restore.

**Target Platform**:
- Vercel Hobby. Static sites plus one Node.js function per project, region `sin1`.
- Modern browsers, mainly mobile Chrome and Safari for guests.

**Project Type**: Web application. Two static frontends plus one shared serverless API and database, in one repository.

**Performance Goals**:
- Invitation first screen < 3 s on 4G when warm, < 10 s after idle (SC-003)
- Publish visible < 10 s (SC-001)
- Response visible to the admin < 10 s (SC-004)
- API p95 < 300 ms warm (Singapore function to Singapore database)

**Constraints**:
- **Free plans only (FR-025).** The Vercel Hobby non-commercial clause is recorded.
- **4.5 MB function request and response limit.** File bytes never pass through the API.
- **Admin API never exposed on the public host.**
- **Secrets only in the server environment.** No `VITE_` secrets.
- **Same 002 screens and steps (SC-007).**
- **Indonesian UI.**

**Scale/Scope**:
- 1 admin; about 30 couples (10 live); about 300 guests per couple; a few thousand visits per month
- About 35 API endpoints, 9 tables
- 2 new UI surfaces (the passcode screen and "Respons Tamu" on the send-invitation page), 1 new admin tab ("Respons"), and a passcode field

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles. The gates carry over from 001 and 002 plus this spec:

| Gate | Status |
|---|---|
| Spec has no open clarifications | ✅ The passcode clarification is resolved (spec § Clarifications) |
| Public site never exposes admin (002 FR-001) | ✅ Separate builds (existing `check:public-build`), **plus** admin routes not mounted when `API_SURFACE=public` |
| Single replaceable data layer; screens unchanged (FR-004, SC-007) | ✅ HTTP implementations of the existing interfaces. Only the wiring files change. Additive interface fields only (contracts/data-layer.md) |
| One source of validation | ✅ Server imports `src/data/schema.ts`, `src/data/slug.ts` and `src/lib/validation.ts`. No duplicated rules |
| Security enforced server-side (FR-006–010e) | ✅ Sessions, throttles, origin checks, signed couple cookies, no secrets in bundles |
| Free hosting (FR-025) | ✅ Neon Free, Cloudinary Free, Vercel Hobby; budget in contracts/media-upload.md |
| Indonesian UI, mobile-first | ✅ All new messages are in Indonesian in the contracts |

**Post-design re-check**: ✅ All gates pass.
- **New dependencies.** Each new dependency is justified in research R4, R5 and R3.
- **Development stays local.** Development and tests need no cloud accounts (R10).
- **Recommended next step.** Run `/speckit-constitution` to record the standing rules that now span three features:
  - Indonesian UI
  - public/admin separation
  - shared schema as the single validation source
  - free-tier-only hosting
  - mobile-first

## Project Structure

### Documentation (this feature)

```text
specs/003-backend-data-persistence/
├── plan.md
├── research.md            # R1–R16 decisions (DB, hosting, media, auth, passcode, uploads, backup…)
├── data-model.md          # 9 tables, state transitions, shared TS types
├── quickstart.md          # local run, cloud setup, env vars, 25 validation scenarios
├── contracts/
│   ├── api.md             # every endpoint, cookies, error envelope, route changes
│   ├── data-layer.md      # frontend interfaces + HTTP implementations
│   ├── auth.md            # admin auth + couple passcode access
│   ├── media-upload.md    # MediaProvider, 3-step upload, budget
│   └── backup-format.md   # v2 file, browser-driven export/restore
├── checklists/requirements.md
└── tasks.md               # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
api/
└── index.ts                       # Vercel entry: re-exports api/_server.mjs (server/vercel.ts bundled by scripts/build-api.mjs)
server/                            # NEW — backend (Node-only; never imported by src/)
├── app.ts                         # createApp(env): Hono app, mounts groups by API_SURFACE
├── env.ts                         # zod-validated env (DATABASE_URL, MEDIA_DRIVER, secrets, origins)
├── http/                          # errors envelope, origin check, body limit, no-store, cookies
├── routes/
│   ├── public.ts                  # couples/:slug, wishes, rsvp, gate, unlock
│   ├── couple.ts                  # send-invitation, responses, rsvps.csv, lock
│   ├── admin.ts                   # login/logout/session, couples CRUD, status, duplicate
│   ├── adminMedia.ts              # tickets, complete, delete, prune, usage
│   ├── adminResponses.ts          # responses, csv, hide/delete
│   ├── adminImport.ts             # export, preflight, import couple/responses/finish
│   ├── cron.ts                    # cleanup
│   └── devMedia.ts                # LocalProvider upload/serve (MEDIA_DRIVER=local only)
├── auth/   admin.ts  coupleAccess.ts  password.ts (scrypt)  visitor.ts
├── db/
│   ├── schema.ts                  # Drizzle tables (data-model.md)
│   ├── client.ts                  # postgres.js | PGlite by DATABASE_URL scheme
│   ├── migrations/                # drizzle-kit SQL (committed)
│   └── repos/  couples.ts  media.ts  responses.ts  throttles.ts  rateLimits.ts
├── media/  provider.ts  cloudinary.ts  local.ts
└── lib/    csv.ts  publicContent.ts (mapSources → absolute URLs)
scripts/
├── db-migrate.ts  db-seed.ts      # NEW (tsx)
├── asset-loader.mjs               # NEW — Node hook so the seed can import the sample images (R13)
├── hash-password.ts               # REPLACES hash-password.mjs → scrypt format
└── serve.ts                       # REPLACES serve.mjs → also mounts the API for e2e
vite/
└── apiDevServer.ts                # NEW — mounts Hono in `vite dev`, surface by host
vercel.json                        # CHANGED — shared by both projects: /api rewrite, SPA fallback to index.html (admin build copies admin.html → index.html), regions sin1, crons
admin-static/vercel.json           # REMOVED — admin now deploys from the repo root
src/
├── data/
│   ├── http/  client.ts  HttpCoupleRepository.ts  HttpMediaStore.ts  HttpPublicCoupleSource.ts   # NEW
│   ├── types.ts                   # CHANGED (additive: passcode, urlOf, errors, PublicCouple…)
│   ├── passcode.ts  mediaLimits.ts   # NEW shared helpers
│   ├── resolveMedia.ts            # CHANGED — prefer store.urlOf
│   ├── index.admin.ts  index.public.ts   # CHANGED wiring
│   └── indexeddb/  static/        # REMOVED
├── services/  http.ts  coupleAccess.ts   # NEW; index.ts wiring CHANGED; memory.ts kept for admin preview
├── admin/
│   ├── auth/  HttpAuthService.ts  ReloginDialog.tsx   # NEW; LocalAuthService.ts REMOVED
│   ├── editor/tabs/  ResponsTab.tsx (NEW)  PengaturanTab.tsx (CHANGED: passcode)
│   ├── responses/  http.ts        # NEW
│   ├── media/  ImageField / GalleryField / AudioField   # CHANGED: per-file progress + retry
│   ├── couples/  CoupleListPage (access warning, restore-pending badge), StorageMeter (usage API)
│   ├── backup/  BackupPage.tsx    # CHANGED: browser-driven v2 export / v1+v2 restore with conflict choices
│   └── AdminLayout.tsx            # CHANGED: banner removed, relogin dialog
├── public-site/pages/
│   ├── CouplePage.tsx             # CHANGED: HTTP source, loading/error/retry
│   └── CoupleSendInvitation.tsx   # CHANGED: gate → PasscodeScreen → generator + GuestResponses
├── send-invitation/  PasscodeScreen.tsx  GuestResponses.tsx   # NEW
└── invitation/sections/  Rsvp.tsx (mine()), Wishes.tsx (paging)   # CHANGED (small)
tests/
├── unit/                          # existing + passcode, csv, cookie signing, scrypt, mapSources
├── api/                           # NEW — Hono app.request + PGlite: auth, couples, media, responses, import, surfaces
├── e2e/                           # public: + passcode.spec, responses.spec, error-state.spec
└── e2e-admin/                     # existing (now on real API) + responses-tab.spec, restore.spec, relogin.spec
```

**Structure Decision**:
- **One repository, three parts:** `src/` (both frontends, unchanged layout), `server/` (backend) and `api/` (the Vercel adapter).
- **Code sharing is one-way.** `server/` may import pure, browser-agnostic modules from `src/`: `src/data/schema.ts`, `slug.ts`, `passcode.ts`, `mediaLimits.ts`, `resolveMedia.ts` (`mapSources`), `src/lib/validation.ts` and the type files. `src/` never imports `server/`.
- **Enforced by tooling:**
  - An ESLint `no-restricted-imports` rule blocks `src/` from importing `server/`.
  - A `tsconfig.server.json` (Node types, `server/`, `api/`, `scripts/`) typechecks the server separately.
  - `npm run typecheck` runs both.

## Phase 0: Research

Complete; see [research.md](./research.md):

| Group | Decisions |
|---|---|
| Choices you asked about | R1 PostgreSQL vs MongoDB, R2 Neon, R3 Cloudinary (and why not GCP), R4 Vercel + Hono |
| Database access | R5 Drizzle + postgres.js / PGlite |
| Security | R6 admin auth, R7 passcode, R8 guest identity and rate limits |
| Media | R9 upload flow and cleanup |
| Development | R10 offline development and tests |
| Frontend | R11 data layer swap |
| Data movement | R12 backup and restore under the 4.5 MB limit, R13 seeding |
| Behaviour | R14 caching, R15 error states, R16 CSV |

## Phase 1: Design & Contracts

Complete:
- [data-model.md](./data-model.md): 9 tables, couple and media state transitions, throttle rules, shared types
- [contracts/api.md](./contracts/api.md): surfaces per deployment, error envelope, cookies, every endpoint, public route changes
- [contracts/data-layer.md](./contracts/data-layer.md): additive interface changes, HTTP implementations, wiring, guarantees
- [contracts/auth.md](./contracts/auth.md): `HttpAuthService`, re-login dialog, passcode flow, server rules, secrets
- [contracts/media-upload.md](./contracts/media-upload.md): `MediaProvider` (Cloudinary/local), 3-step upload, limits, budget
- [contracts/backup-format.md](./contracts/backup-format.md): v2 file, browser-driven export and restore, re-run guarantees
- [quickstart.md](./quickstart.md): offline local development, free cloud setup, Vercel environment variables, the 002 data move, 25 validation scenarios, free-tier watch

## Suggested build order (input for `/speckit-tasks`)

1. **Server foundation:** env, Drizzle schema and migrations, PGlite test harness, error and cookie middleware, `API_SURFACE` mounting, Vercel entry and `vercel.json`, dev and serve integration.
2. **Admin auth (US2).** Then couples CRUD over HTTP (US1) and the switch of `index.admin.ts`/`index.public.ts`. Run the 002 end-to-end suites against the API.
3. **Media (US3):** `LocalProvider` first, then `CloudinaryProvider`. Per-file progress and retry.
4. **Passcode and the send-invitation gate (US4).**
5. **Responses (US5):** public submit and list, admin tab, couple panel, CSV.
6. **Restore from v1 (US6), then v2 export and restore (US7).** Seed script.
7. **Production setup** (quickstart §3–4), then validation scenarios V1–V25.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free plans change or pause | Providers chosen to wake up on their own (Neon) with no card needed (Neon, Cloudinary). Full v2 backups (US7). `MediaProvider` and the Hono app make moving to R2 or Cloudflare a small change |
| Vercel Hobby is non-commercial | Recorded in research R4 and the quickstart. Upgrade, or move the Hono app to Cloudflare Workers or a similar host, before charging couples |
| Cloudinary delivery credits grow with traffic | Photos are compressed before upload, no transformations are used, and the usage meter warns at 80%. R2 swap documented |
| Cold start after idle (function + Neon wake) | Loading skeleton. SC-003 allows 10 s after idle. Singapore regions keep warm requests fast |
| Someone repeatedly locks a couple out by guessing passcodes | 15-min pause only. The admin warning at ≥ 3 lockouts per day lets the admin change the passcode |
| Moving 002 data fails partway | Restore is browser-driven, per couple, and safe to re-run, with a `restore_pending` flag that blocks publishing a half-restored couple |
| Existing 002 end-to-end tests assumed IndexedDB and client-side login | Tests run against a real API on a temporary PGlite database. Helpers log in via the API. Credentials come from test environment variables |

## Complexity Tracking

No constitution violations. The new pieces are each required by a functional requirement:
- a backend and database (FR-001, FR-006)
- a media provider (FR-011)
- PGlite (offline, free development and tests; research R10)

A separate `server/` tree and tsconfig keep Node code out of the browser bundles.
