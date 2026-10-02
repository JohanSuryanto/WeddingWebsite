# Quickstart & Validation: Admin Login & Couple Dashboard

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js 20 or later, npm 10 or later
- `npx playwright install chromium webkit` (run once)
- A browser that resolves `*.localhost`: current Chrome, Edge, Firefox or Safari 17+

## Set up the admin login (local)

```bash
npm install
cp .env.example .env.local
npm run hash-password -- "your-password"     # prints the SHA-256 hash
# edit .env.local:
#   VITE_ADMIN_EMAIL=you@example.com
#   VITE_ADMIN_PASSWORD_SHA256=<printed hash>
#   VITE_PUBLIC_SITE_URL=http://localhost:5173
```

## Run both sites

```bash
npm run dev
# public: http://localhost:5173          (landing, /anisa-raka, /anisa-raka/send-invitation)
# admin:  http://admin.localhost:5173    (login, dashboard)
```

## Build and serve as in production

```bash
npm run build                 # = build:public + build:admin → dist/public, dist/admin
npm run preview               # serves both builds with the same host routing
```

## Automated checks

```bash
npm run lint && npm run typecheck
npm test                      # schema, slug, dates, resolveMedia, repository (fake-indexeddb), backup, auth
npm run test:e2e              # public (6 viewports) + admin (Chromium 375/1366)
npm run check:public-build    # fails if dist/public contains admin.html or admin code
```

## Manual validation scenarios

| # | Scenario | Steps | Expected | Covers |
|---|---|---|---|---|
| 1 | Guard | Open `admin.localhost:5173/couples/new` logged out | Redirect to `/login?next=…`; after login, lands on `/couples/new` | US1-AS1, FR-002 |
| 2 | Wrong password ×5 | Enter a wrong password 5 times | Error each time; then "Terlalu banyak percobaan…" for 60 s | US1-AS3, FR-004 |
| 3 | Logout | Press "Keluar" | Back to login; dashboard URLs redirect again | US1-AS4 |
| 4 | Create couple | "Tambah Pasangan" → Budi + Sari | Slug `budi-sari` suggested; `login` or an existing slug is rejected | US2-AS1/2 |
| 5 | Fill details | Fill each tab, add 2 events, mark one main, set end before start once | Main-event and end-time errors block saving; a valid save shows "Tersimpan" | US3 |
| 6 | Photos | Upload a ~5 MB photo as cover, 2 portraits, 6 gallery photos; reorder; delete one; leave one alt empty | Thumbnails; stored size < 500 KB; empty alt blocks saving | US4, SC-005 |
| 7 | Music | Upload an mp3, press play | Plays in the dashboard | US4-AS6 |
| 8 | Live preview | Type a nickname; switch preview themes 1/2/3 | Preview updates < 1 s; saved default theme unchanged | US5, SC-004 |
| 9 | Full preview & links | From the list: "Pratinjau", "Kirim Undangan" | Full invitation for Budi & Sari; generated links start with `http://localhost:5173/budi-sari?` | US2-AS4/5, FR-018a |
| 10 | Draf/Aktif | Toggle status; open the couple's preview | Both work in the admin; list badge updates | US6 |
| 11 | Duplicate / delete | Duplicate, then delete the copy by typing its slug | Copy appears as Draf `budi-sari-salinan`; delete removes it and its photos (storage usage drops) | US6-AS3/4 |
| 12 | Unsaved changes | Edit a field, click another tab or close the tab | Warning dialog | FR-013 |
| 13 | Backup / restore | Download backup → clear site data for `admin.localhost` → log in → restore "Ganti semua" | All couples and photos back, identical | FR-018b, SC-008 |
| 14 | Public site | Open `localhost:5173/`, `/anisa-raka`, `/anisa-raka?t=3`, `/tidak-ada`, `/send-invitation` | Landing; sample invitation exactly as before; theme 3; "Undangan tidak ditemukan" (both) | US7, FR-009, SC-007 |
| 15 | Separation | Check `dist/public` after build | No `admin.html`; no admin code | FR-001 |
| 16 | Responsive | Admin pages at 320/375/768/1366/1920 | No horizontal scroll | SC-006 |
| 17 | Time to set up | Time scenario 4 → 6 → copy both addresses, first attempt | < 10 minutes | SC-001 |

## Validation results (2026-10-02)

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck`, Prettier | ✅ clean |
| `npm test` (Vitest) | ✅ 127/127 across 17 files: schema, slugs, dates, repository, seed, backup round trip, auth/lockout, compression sizing |
| `npm run test:e2e` (Playwright) | ✅ 196/196. Public: 6 viewports, including the new landing spec. Admin: 375 + 1366, plus 320/768/1920 resize. |
| `npm run check:public-build` | ✅ no `admin.html` or admin code in `dist/public` (FR-001) |
| Scenarios 1–14, 16 | ✅ automated in `tests/e2e-admin/*` and `tests/e2e/*` |
| Scenario 15 (separation) | ✅ `check:public-build`. The public bundle also contains no form/zod, IndexedDB or admin strings. |
| SC-005 (compression) | ✅ a 6.9 MB fixture photo is stored at about 63 KB (test threshold < 500 KB) |
| SC-004 (live preview < 1 s) | ✅ asserted with a 1000 ms timeout in `preview.spec.ts` |
| SC-008 (backup round trip) | ✅ unit test (byte-identical media, identical records) and e2e restore into a fresh browser context |
| Bundle sizes | Public initial JS 142.9 KB gzipped (budget 150 KB; growth from 107 KB is the router). Admin main 135.8 KB gzipped, editor/tabs/preview lazy-loaded (budget 350 KB). |
| Scenario 17 / SC-001 (set up a couple in < 10 min) | ⚠️ Not timed by a person yet. The automated create → fill → 3 photos → save flow takes about 5 s. |
| Real devices | ⚠️ Not yet checked on a real phone, or on Safari for WebP→JPEG fallback encoding. |
