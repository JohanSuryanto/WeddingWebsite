# Quickstart: Server Storage (003)

How to run the system locally, set up the free cloud services, deploy, and check that the feature works. For implementation details, see [contracts/](./contracts) and [data-model.md](./data-model.md).

## 1. Local development (no cloud accounts needed)

**Prerequisites**: Node 22+, and `npm install` already run.

```powershell
Copy-Item .env.example .env.local      # then fill in the values below
npm run hash-password -- "rahasia123" # paste output into ADMIN_PASSWORD_HASH
npm run db:migrate                     # creates .data/dev-db (PGlite)
npm run db:seed                        # Anisa & Raka; prints its passcode
npm run dev
```

`.env.local` for local development:

```dotenv
DATABASE_URL=pglite:./.data/dev-db
MEDIA_DRIVER=local
ADMIN_EMAIL=admin@test.local
ADMIN_PASSWORD_HASH=scrypt$32768$8$1$...
SESSION_SECRET=<openssl rand -base64 32 or any 32+ random chars>
CRON_SECRET=dev-cron
PUBLIC_ORIGIN=http://localhost:5177
ADMIN_ORIGIN=http://admin.localhost:5177
VITE_PUBLIC_SITE_URL=http://localhost:5177
```

| Address | What |
|---|---|
| http://localhost:5177/anisa-raka | Public invitation (from the database) |
| http://localhost:5177/anisa-raka/send-invitation | Passcode screen |
| http://admin.localhost:5177 | Admin login |

`npm run dev` mounts the API inside Vite (`vite/apiDevServer.ts`), and the host decides public or admin (research R10). To reset local data, delete `.data/`.

## 2. Tests

```powershell
npm run typecheck; npm run lint
npm test              # unit + API integration (Hono app.request + in-memory PGlite)
npm run test:e2e      # builds both sites, serves them + API (PGlite temp DB, local media)
```

## 3. Free cloud setup (one time)

| Service | Steps | Values to keep |
|---|---|---|
| **Neon** (neon.com, Free, no card) | Create project `wedding`, region **AWS Asia Pacific (Singapore)**. Copy the **pooled** connection string | `DATABASE_URL=postgres://…-pooler…/neondb?sslmode=require` |
| **Cloudinary** (cloudinary.com, Free, no card) | Sign up. Dashboard → API Keys | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Vercel** (Hobby) | The two existing projects (public, admin) point at this repo root | see below |

Run migrations and the seed against production once, from your machine:

```powershell
$env:DATABASE_URL="<neon pooled url>"; $env:MEDIA_DRIVER="cloudinary"; $env:MEDIA_ROOT="wedding/prod"
# + CLOUDINARY_* vars
npm run db:migrate; npm run db:seed
```

## 4. Vercel projects and environment variables

Both projects deploy from the **repository root**, so both include the `api/` function. One root `vercel.json` serves both: `/api/*` goes to the function, and every other unknown path to `/index.html` (the admin build writes `index.html` as a copy of `admin.html`, so this works on any host, including preview URLs).

| Project | Root directory | Build command | Output directory | Domain |
|---|---|---|---|---|
| Public | repository root | `npm run build:public` | `dist/public` | `wedding.johansuryanto.dev` |
| Admin | repository root | `npm run build:admin` | `dist/admin` | `admin.wedding.johansuryanto.dev` |

If the admin project is currently a static deploy of `dist/admin`, switch it to these settings. A static deploy has no `/api`.

| Variable | Public project | Admin project |
|---|---|---|
| `API_SURFACE` | `public` | `admin` |
| `DATABASE_URL`, `SESSION_SECRET` | same value | same value |
| `MEDIA_DRIVER=cloudinary`, `MEDIA_ROOT=wedding/prod`, `CLOUDINARY_*` | same | same |
| `PUBLIC_ORIGIN` | `https://wedding.johansuryanto.dev` | same |
| `ADMIN_ORIGIN` | `https://admin.wedding.johansuryanto.dev` | same |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | not set | set |
| `CRON_SECRET` | not set | set (Vercel Cron sends it) |
| `VITE_PUBLIC_SITE_URL` | `https://wedding.johansuryanto.dev` | same |

- **Function region.** `vercel.json` sets the region to `sin1`, next to Neon Singapore.
- **Cron.** The daily cleanup cron is in `vercel.json`. On the public project it returns 404, which is harmless.
- **Remove old variables.** Delete the old `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD_SHA256`.

## 5. Moving 002 browser data online (one time)

1. On the **old** deployment (before deploying 003), open the admin, go to "Cadangan", and press "Unduh Cadangan".
2. Deploy 003. In the admin, go to "Cadangan" → "Pulihkan" and choose the file.
3. Anisa & Raka already exists from the seed, so choose **Lewati** for it.

## 6. Validation scenarios

Run these on local development first, then on production. Each one maps to a spec item.

| # | Scenario | Expected | Spec |
|---|---|---|---|
| V1 | In the admin, create "Budi & Sari" with one event and publish. On another browser profile (never logged in), open `/budi-sari` | The invitation shows within 10 s of publishing | US1-1, SC-001 |
| V2 | Edit the bride's nickname and save. Refresh `/budi-sari` | New nickname shown | US1-2 |
| V3 | Set Budi & Sari to Draf. Open `/budi-sari`; in dev tools, check the response of `GET /api/public/couples/budi-sari` | "Undangan belum tersedia"; the response body has no `content` | US1-3, FR-003 |
| V4 | Logged out: `curl -X PATCH http://admin.localhost:5177/api/admin/couples/<id> -H "Origin: http://admin.localhost:5177" -d '{}'` | 401, nothing changed | US2-2, SC-002 |
| V5 | `curl` the same on `http://localhost:5177/api/admin/couples` (public host) | 404 (admin API not mounted) | FR-001/R4 |
| V6 | Enter the wrong admin password 5×, then try from a second browser | Locked for 60 s on both | US2-3, FR-009 |
| V7 | Log in on two browsers. Edit the same couple, save in A, then save in B | B shows the "sudah diubah" conflict warning | FR-005 |
| V8 | Delete the `ws_admin` session row (or wait for expiry), change a field, press Simpan | Re-login dialog appears; after login the change is saved | US2-4 |
| V9 | Upload a cover, 5 gallery photos and music; save. Open `/budi-sari` on a phone | All load; music plays | US3-1 |
| V10 | Turn on dev-tools "Offline" during a gallery upload; turn it off and press "Coba lagi" on the failed file | Only that file retries; save succeeds afterwards. Saving before retrying is refused | US3-3, FR-015 |
| V11 | Remove a gallery photo and save; delete a couple | Files gone from `.data/media` (or the Cloudinary Media Library) | US3-4, SC-008 |
| V12 | Admin → Pengaturan: passcode `4821`, "Salin pesan" | Message with link + code copied | US4-1 |
| V13 | New browser: `/budi-sari/send-invitation` | Only the passcode screen with names; the network tab shows no content or responses | US4-2, SC-010 |
| V14 | Enter `1111` 5× | "Kode akses salah", then paused 15 min (also on another browser) | US4-4 |
| V15 | Enter `4821`; type "Pak Andi"; open the generated link in a third browser | Link greets "Pak Andi"; no passcode asked; URL has no code. Done in < 1 min | US4-3/5/7, SC-009 |
| V16 | Admin changes the passcode to `5555`. Reopen the unlocked page | The passcode screen again | US4-6, FR-010c |
| V17 | Two browsers submit an RSVP and a wish each on `/budi-sari`; one submits its RSVP again | Both wishes visible to both; the admin "Respons" tab shows 2 RSVPs (the repeat replaced), correct totals | US5-1/2/3/5 |
| V18 | Submit 6 wishes within 10 min from one browser | 6th: "Terlalu banyak pesan, coba lagi nanti" | US5-6 |
| V19 | Admin hides a wish | It disappears from the invitation; the couple's send-invitation page doesn't list it | US5-4 |
| V20 | Unlocked send-invitation page → "Respons Tamu" → "Unduh CSV"; open in Excel | Totals and list match the admin; Indonesian characters correct | US5-8, FR-019 |
| V21 | Restore a 002 v1 backup with 2 couples + photos; run it again | All restored with passcodes set; the second run reports both as existing and creates nothing new | US6, FR-021 |
| V22 | Download a v2 backup; reset the local DB (`rm -r .data`, migrate); restore | Every couple, photo, RSVP and wish comes back | US7, SC-005 |
| V23 | Stop the dev server mid-load of `/budi-sari` (or block `/api` in dev tools) | Loading state, then "Undangan sedang tidak dapat dimuat, coba lagi" with a working retry | FR-024 |
| V24 | Production, after more than 10 min of no traffic: open `/anisa-raka` on 4G | First screen in under 10 s; under 3 s on a second load | SC-003 |
| V25 | Run the 002 admin end-to-end suite (create, edit, upload, preview, publish, duplicate, delete) | Passes with the same steps | SC-007 |

## 7. Free-tier watch

Check these monthly. The dashboard usage meter covers the first two.

| Service | Where | Free limit (checked 2026-10-02) |
|---|---|---|
| Cloudinary | Dashboard → Usage | 25 credits per month |
| Neon | Project → Usage | 1 GB storage, 100 compute-hours per month |
| Vercel | Team → Usage | 1M invocations, 4 h active CPU, 100 GB transfer. **Non-commercial use only** |
