# Undangan Pernikahan Digital · Wedding Invitation Service

Layanan undangan pernikahan digital: satu kode, **dua website**. Berbahasa Indonesia, responsif untuk HP dan PC.

A digital wedding invitation service in Indonesian: one codebase that builds **two websites**.

| Website | Address (production) | Local | For |
|---|---|---|---|
| **Publik** | `https://wedding.johansuryanto.dev` | `http://localhost:5173` | Guests and couples: landing page, `/<pasangan>` invitations, `/<pasangan>/send-invitation` |
| **Admin** | `https://admin.wedding.johansuryanto.dev` | `http://admin.localhost:5173` | You: login and the dashboard to set up couples |

Couples never log in. They send you their details and photos; you set them up in the dashboard and give them their send-invitation link.

> **Mode pratinjau (frontend only).** There is no backend yet. Couples created in the dashboard are saved **in your browser only** (IndexedDB), and you check them with the dashboard's preview. The public site serves the landing page and the sample couple `/anisa-raka`. Download a backup regularly from **Cadangan**. Once the shared backend is connected, dashboard couples appear on the public site with no screen changes (see the end of this file).

Specs: [`specs/001-wedding-invitation-site/`](specs/001-wedding-invitation-site/) (invitation, themes) and [`specs/002-admin-couple-dashboard/`](specs/002-admin-couple-dashboard/) (admin, two sites).

---

## Menjalankan · Running

```bash
npm install
cp .env.example .env.local
npm run hash-password -- "kata-sandi-anda"     # prints a SHA-256 hash
# then edit .env.local:
#   VITE_ADMIN_EMAIL=you@example.com
#   VITE_ADMIN_PASSWORD_SHA256=<the printed hash>
#   VITE_PUBLIC_SITE_URL=http://localhost:5173
npm run dev
```

One dev server serves both sites, picked by the address. Open `http://localhost:5173` (public) and `http://admin.localhost:5173` (admin). Current Chrome, Edge, Firefox and Safari 17+ resolve `*.localhost` automatically.

| Script | Purpose |
|---|---|
| `npm run dev` | Both sites with hot reload |
| `npm run build` | `dist/public` and `dist/admin` (two separate builds) |
| `npm run preview` | Serves both builds at `localhost:4817` / `admin.localhost:4817`, like production |
| `npm run check:public-build` | Fails if any admin page or code ended up in `dist/public` |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript / Prettier |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright: public site at 320/375/768/1366/1920 px + iPhone WebKit, admin at 375/1366. Run `npx playwright install chromium webkit` once first. |

## Menambah pasangan · Adding a couple (admin)

1. Log in at `admin.…/login`.
2. **+ Tambah Pasangan**: enter both nicknames. The address name (e.g. `sari-budi`) is suggested; pick a default theme.
3. Fill in each tab: **Mempelai, Acara, Foto, Cerita, Hadiah, Musik, Penutup, Pesan, Pengaturan**. Photos are compressed in the browser automatically (a 7 MB phone photo becomes ~100–400 KB). The phone preview on the right updates as you type, in any theme.
4. **Simpan**. Saving is blocked, with the field marked, until the required data is complete: names, parents, one main event with a date, cover and couple photos, and a description for every gallery photo.
5. **Pengaturan → Terbitkan** (publish), then copy the two addresses from the list:
   - Undangan: `https://wedding.johansuryanto.dev/<nama-alamat>`
   - Kirim undangan: `https://wedding.johansuryanto.dev/<nama-alamat>/send-invitation`, which goes to the couple

**Pratinjau** shows the full invitation (any status). **Kirim Undangan** opens the couple's guest-link page inside the admin.

**Cadangan** downloads every couple and photo as one `.json` file and restores it ("Tambahkan" or "Ganti semua"). Keep a recent backup: browser data can be cleared.

## Link tamu · Guest links

The couple opens `/<nama-alamat>/send-invitation`, picks theme 1/2/3, types guest names (one per line) and copies each link, or sends it straight to WhatsApp. Links look like:

```
https://wedding.johansuryanto.dev/anisa-raka?inv=Johan+%26+Partner&t=2
```

- `inv`: guest name on the cover. Typed links may contain spaces and a raw `&` ("Johan & Partner").
- `t`: theme number. Without it, the couple's default theme is used.
- Unknown addresses show "Undangan tidak ditemukan". Draft couples show "Undangan belum tersedia".

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
3. `npm test` checks every theme defines all required tokens; `npm run test:e2e` checks every theme at all screen sizes.

## Landing page

Texts and the WhatsApp contact number are in **`src/config/service.ts`**. Replace the placeholder number `6281234567890` with yours. The theme examples open `/<sampleSlug>?t=1|2|3`.

## Deploy

| Output | Host | Domain |
|---|---|---|
| `dist/public` | static hosting | `wedding.johansuryanto.dev` |
| `dist/admin` | static hosting | `admin.wedding.johansuryanto.dev` |

Both need "serve the app for unknown paths". This is included for Netlify (`_redirects` in each output) and Vercel (`vercel.json`; `admin-static/vercel.json` for the admin). Build with `VITE_PUBLIC_SITE_URL=https://wedding.johansuryanto.dev` and your admin credentials set. **The admin login is not real security in this phase**: the check runs in the browser. Real protection comes with the backend.

## Backend nanti · Later backend phase (shared by both sites)

Only these files change; screens stay the same:

| File | Now | With the backend |
|---|---|---|
| `src/data/index.admin.ts` | IndexedDB couples and photos | `HttpCoupleRepository` / `HttpMediaStore` |
| `src/data/index.public.ts` | Built-in sample couple | `HttpCoupleRepository` (read active couples) |
| `src/admin/auth/AuthProvider.tsx` | `LocalAuthService` | `HttpAuthService` (real sessions) |
| `src/services/index.ts` | RSVP and wishes in memory | HTTP RSVP and wishes |

The backend must accept requests from both domains, let the public site read **Aktif** couples and post RSVPs and wishes, keep every change behind the admin login, and serve photos from URLs that work on both domains. Content rules for the API are already in `src/data/schema.ts`.

## Struktur · Structure

```
index.html · admin.html          # two entries (public · admin)
vite.config.ts · vite/           # SITE=public|admin builds, dev host routing
src/
├── public-site/                 # landing, /:slug, /:slug/send-invitation
├── admin/                       # login, dashboard, editor, media, preview, backup
├── invitation/                  # shared invitation renderer + sections
├── send-invitation/             # shared guest-link page
├── data/                        # data layer (repository, schema, slugs, backup)
├── content/                     # content types + samples/anisa-raka
├── themes/  components/  hooks/  lib/  services/  config/
tests/unit · tests/e2e (public) · tests/e2e-admin
```
