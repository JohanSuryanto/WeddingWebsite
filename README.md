# Undangan Pernikahan Digital · Wedding Invitation Service

Layanan undangan pernikahan digital: satu kode, **dua website**. Berbahasa Indonesia, responsif untuk HP dan PC.

A digital wedding invitation service in Indonesian: one codebase that builds **two websites**.

| Website | Address (production) | Local | For |
|---|---|---|---|
| **Publik** | `https://wedding.johansuryanto.dev` | `http://localhost:5177` | Guests and couples: landing page, `/<pasangan>` invitations, `/<pasangan>/send-invitation` |
| **Admin** | `https://admin.wedding.johansuryanto.dev` | `http://admin.localhost:5177` | You: login and the dashboard to set up couples |

Couples never log in to the admin. They send you their details and photos; you set them up in the dashboard and give them their send-invitation link plus a **4-digit passcode** for it.

Both sites share one server and one database: a couple saved in the admin is live on the public site straight away, on any device.

| Piece | Service (free plan) | Notes |
|---|---|---|
| Database | **PostgreSQL on Neon** (Singapore) | Couples, media records, RSVPs, wishes, sessions |
| Photos & music | **Cloudinary** | The browser uploads directly; files never pass through the API |
| API | **Hono** in one **Vercel Function** (region `sin1`) | Deployed with both Vercel projects; each site calls its own `/api` |
| Local dev & tests | **PGlite** (Postgres in-process) + files on disk | No cloud account or Docker needed |

Why these: [`specs/003-backend-data-persistence/research.md`](specs/003-backend-data-persistence/research.md).

Specs: [`001`](specs/001-wedding-invitation-site/) (invitation, themes), [`002`](specs/002-admin-couple-dashboard/) (admin, two sites), [`003`](specs/003-backend-data-persistence/) (server storage, passcode, responses).

---

## Menjalankan · Running

```bash
npm install
cp .env.example .env.local
npm run hash-password -- "kata-sandi-anda"     # prints a scrypt hash
# edit .env.local: ADMIN_EMAIL, ADMIN_PASSWORD_HASH (the printed hash) and
# SESSION_SECRET (32+ random characters). The defaults use PGlite and local media.
npm run db:migrate                              # creates .data/dev-db
npm run db:seed                                 # adds Anisa & Raka; prints its passcode
npm run dev
```

One dev server serves both sites and the API, picked by the address. Open `http://localhost:5177` (public) and `http://admin.localhost:5177` (admin). Current Chrome, Edge, Firefox and Safari 17+ resolve `*.localhost` automatically. Delete `.data/` to start over.

| Script | Purpose |
|---|---|
| `npm run dev` | Both sites + API with hot reload |
| `npm run build` | `dist/public`, `dist/admin` and the bundled API (`api/_server.mjs`) |
| `npm run preview` | Serves both builds + API at `localhost:4817` / `admin.localhost:4817`, like production |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / add the sample couple to `DATABASE_URL` |
| `npm run db:generate` | New SQL migration after changing `server/db/schema.ts` |
| `npm run check:public-build` | Fails if admin code or server secrets ended up in a build |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript (browser + server) / Prettier |
| `npm test` | Unit tests and API tests (real routes on an in-memory Postgres) |
| `npm run test:pg` | The API tests on real PostgreSQL (uses the server in `DATABASE_URL`, or `TEST_DATABASE_URL`; each test file makes and drops its own `wedding_test_*` database) |
| `npm run test:e2e` | Playwright on a fresh database: public site at 320/375/768/1366/1920 px + iPhone WebKit, admin at 375/1366. Run `npx playwright install chromium webkit` once first. |

GitHub Actions (`.github/workflows/ci.yml`) runs typecheck, lint, all tests, the build check, the API tests on PostgreSQL 18 and the Playwright suite on every push.

## Menambah pasangan · Adding a couple (admin)

1. Log in at `admin.…/login`.
2. **+ Tambah Pasangan**: enter both nicknames. The address name (e.g. `sari-budi`) is suggested; pick a default theme. A random passcode is filled in.
3. Fill in each tab: **Mempelai, Acara, Foto, Cerita, Hadiah, Musik, Penutup, Pesan, Pengaturan**. Every photo and music field opens a picker: choose one of the **sample** photos (6) or songs (3, with a play button), or **Unggah dari perangkat**. Samples live in `src/admin/media/samples/`; replace a file with your own under the same name, or regenerate them with `node scripts/generate-media-samples.mjs`. Photos are compressed in the browser automatically (a 7 MB phone photo becomes ~100–400 KB) and uploaded with a progress bar; a failed file can be retried on its own. The phone preview on the right updates as you type, in any theme.
4. **Simpan**. Saving is blocked, with the field marked, until the required data is complete: names, parents, one main event with a date, cover and couple photos, and a description for every gallery photo.
5. **Pengaturan → Terbitkan** (publish). Publishing needs complete content; if something is missing, the message says what.
6. **Pengaturan → Kode akses**: change the passcode or press **Acak**, save, then **Salin pesan** copies a ready-to-send message with the couple's page link and code. Changing the code signs the couple out everywhere.

The list's **Salin pesan** does the same. **Pratinjau** shows the full invitation (any status). **Kirim Undangan** opens the couple's guest-link page inside the admin. **⚠ Banyak percobaan kode** on a couple means its passcode was guessed wrong many times today; consider changing it.

**Respons** (editor tab): guests' RSVPs with totals, **Unduh CSV** (opens in Excel), and wishes you can **Sembunyikan** or **Hapus**.

**Cadangan** downloads everything (couples, passcodes, photos, music, RSVPs, wishes) as one `.json` file and restores it, also files from the old browser-only dashboard. For each couple that already exists you choose **Lewati**, **Ganti** or **Simpan keduanya**. A restore that stopped halfway can be run again; it continues. Keep a recent backup: free services can change.

**Penyimpanan** on the couple list shows how much of the free media quota and database is used, with a warning at 80%.

## Link tamu · Guest links

The couple opens `/<nama-alamat>/send-invitation` and enters their **4-digit passcode** (5 wrong tries pause entry for 15 minutes). The page then stays unlocked on that browser for 30 days. They pick theme 1/2/3, type guest names (one per line) and copy each link, or send it straight to WhatsApp. Below that, **Respons Tamu** shows RSVPs, totals and wishes. Links look like:

```
https://wedding.johansuryanto.dev/anisa-raka?inv=Johan+%26+Partner&t=2
```

- `inv`: guest name on the cover. Typed links may contain spaces and a raw `&` ("Johan & Partner").
- `t`: theme number. Without it, the couple's default theme is used.
- Guests never need the passcode.
- Unknown addresses show "Undangan tidak ditemukan". Draft couples show "Undangan belum tersedia".

RSVPs and wishes are saved. A guest who answers again from the same browser replaces their earlier answer. One browser can send at most 5 of each per couple every 10 minutes.

## Tema · Themes

| Theme | Id | Number |
|---|---|---|
| Romantic Floral: blush pink, watercolor flowers | `romantic-floral` | `1` |
| Elegant Classic: ivory, gold and navy, monogram | `elegant-classic` | `2` |
| Rustic Garden: sage, cream and brown, eucalyptus | `rustic-garden` | `3` |

Each couple has a default theme (dashboard → Pengaturan). `?t=<number>` overrides it for one link.

**Adding a theme** (e.g. `modern-minimal`):
1. Copy `src/themes/rustic-garden/` and adjust `tokens.css` (every required token, see [theme contract](specs/001-wedding-invitation-site/contracts/theme-contract.md)), `ornaments/`, and `index.ts` (with the next free number as `code`, e.g. `'4'`).
2. Add the id to `ThemeId` in `src/themes/types.ts`, register it in `src/themes/index.ts`, and add it to `themeIdSchema` in `src/data/schema.ts`.
3. Add it to the `default_theme` check in `server/db/schema.ts` and run `npm run db:generate` for a migration.
4. `npm test` checks every theme defines all required tokens; `npm run test:e2e` checks every theme at all screen sizes.

## Landing page

Texts and the WhatsApp contact number are in **`src/config/service.ts`**. Replace the placeholder number `6281234567890` with yours. The theme examples open `/<sampleSlug>?t=1|2|3`. The passcode message the admin copies is there too (`passcodeMessageTemplate`).

## Deploy

Full steps: [`specs/003-backend-data-persistence/quickstart.md`](specs/003-backend-data-persistence/quickstart.md) §3–4.

1. **Neon**: create a project in **AWS Asia Pacific (Singapore)**; copy the **pooled** connection string.
2. **Cloudinary**: sign up; copy cloud name, API key and secret.
3. **Vercel**: two projects on this repository, both with the **repository root** as root directory (so both get the `api/` function):

   | Project | Build command | Output directory | Domain |
   |---|---|---|---|
   | Public | `npm run build:public` | `dist/public` | `wedding.johansuryanto.dev` |
   | Admin | `npm run build:admin` | `dist/admin` | `admin.wedding.johansuryanto.dev` |

   Environment variables, on both unless noted:
   - `DATABASE_URL`, `SESSION_SECRET`, `MEDIA_DRIVER=cloudinary`, `MEDIA_ROOT=wedding/prod`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `PUBLIC_ORIGIN=https://wedding.johansuryanto.dev`, `ADMIN_ORIGIN=https://admin.wedding.johansuryanto.dev`, `VITE_PUBLIC_SITE_URL=https://wedding.johansuryanto.dev`
   - `API_SURFACE=public` (public project) or `admin` (admin project)
   - Admin project only: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `CRON_SECRET`
   - Limit the secrets (`DATABASE_URL`, `SESSION_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_*`, `CRON_SECRET`) to the **Production** environment, so PR preview builds can't reach the live database.
4. From your computer, once, with the production values in your environment: `npm run db:migrate` then `npm run db:seed` (prints the sample couple's passcode).
5. DNS: a CNAME per domain, with the value each Vercel project's **Settings → Domains** shows.

**After going live:**
- `main` is production: every merge redeploys both sites. `main` is protected, so changes arrive through a pull request with all CI checks green.
- **A PR that adds a migration** (a new file in `server/db/migrations`): after merging, run `npm run db:migrate` once with the Neon `DATABASE_URL` in your environment, like step 4. Migrations only add things, so the old code keeps working until the new deploy is live.
- Download a backup (**Cadangan → Unduh Cadangan**) regularly; Neon Free keeps only a short restore history.

`vercel.json` sends `/api/*` to the function and every other unknown path to the app; a daily cron (`/api/cron/cleanup`) retries file deletions and removes unfinished uploads. The admin build also writes `index.html` (a copy of `admin.html`) so the same rule serves both sites. It also sets the security headers, including a **Content-Security-Policy** (scripts from the site only; images, audio and uploads also from Cloudinary). The e2e server (`scripts/serve.ts`) sends the same headers, and every e2e test fails on a CSP violation (`tests/fixtures.ts`), so a change that needs a new source has to update `vercel.json`.

**Free-tier watch** (check monthly; the dashboard's Penyimpanan meter shows the first two):

| Service | Free limit |
|---|---|
| Cloudinary | 25 credits/month (1 credit = 1 GB stored or delivered) |
| Neon | 1 GB storage, 100 compute-hours/month |
| Vercel Hobby | 1M invocations, 4 h CPU, 100 GB transfer/month |

**Vercel Hobby is for non-commercial use only.** Before charging couples, upgrade to Pro or move the API: Hono also runs on Cloudflare Workers and other hosts with small changes.

## Struktur · Structure

```
index.html · admin.html          # two entries (public · admin)
api/index.ts                     # Vercel Function; re-exports api/_server.mjs (bundled at build time)
server/                          # Hono API: routes/, auth/, db/ (schema, migrations, repos), media/
vite.config.ts · vite/           # SITE=public|admin builds, dev host routing, API inside `vite dev`
src/
├── public-site/                 # landing, /:slug, /:slug/send-invitation (passcode)
├── admin/                       # login, dashboard, editor, uploads, preview, backup
├── invitation/                  # shared invitation renderer + sections
├── send-invitation/             # guest-link page, passcode screen, guest responses
├── data/                        # data layer: HTTP repositories, schema, slugs, backup format
├── content/                     # content types + samples/anisa-raka
├── themes/  components/  hooks/  lib/  services/  config/
scripts/                         # migrate, seed, hash-password, serve, build-api
tests/unit · tests/api · tests/e2e (public) · tests/e2e-admin
```
