# Contract: Sites and Routes

Two sites built from one codebase ([research R1](../research.md#r1-one-codebase-two-sites)).

| Site | Production | Local development | Entry | Build output |
|---|---|---|---|---|
| Public | `https://wedding.johansuryanto.dev` | `http://localhost:5173` | `index.html` → `src/public-site/main.tsx` | `dist/public/` |
| Admin | `https://admin.wedding.johansuryanto.dev` | `http://admin.localhost:5173` | `admin.html` → `src/admin/main.tsx` | `dist/admin/` |

Both hosts need a fallback that serves their own entry HTML for unknown paths:
- **Development and preview**: the `devHostRouting` plugin.
- **Netlify**: `_redirects`.
- **Vercel**: `vercel.json`, one per output folder.

The public build MUST NOT contain `admin.html` or any module under `src/admin/` (checked in CI by inspecting `dist/public`).

## Public routes

| Path | Shows | Notes |
|---|---|---|
| `/` | Landing page | No link to the admin. Theme examples link to `/<sampleSlug>?t=1|2|3`. |
| `/:slug` | Invitation for the **active** couple with that slug | `?inv=` and `?t=` behave as in feature 001. No `?t=` → the couple's `defaultTheme`. |
| `/:slug/send-invitation` | Guest-link page for that couple | Links use `VITE_PUBLIC_SITE_URL/<slug>`. |
| `/:slug` (draft couple) | "Undangan belum tersedia" | Response is still the app shell (static hosting). |
| anything else | "Undangan tidak ditemukan" | Includes reserved names and old `/send-invitation`. |

**Reserved slugs** (`RESERVED_SLUGS`): `send-invitation`, `api`, `assets`, `music`, `admin`, `login`, `dashboard`, `u`, `inv`, `tema`, `favicon.svg`, `robots.txt`.

## Admin routes

All routes except `/login` require a session. Without one, the admin is sent to `/login?next=<original path+query>`, and after login to `next`, provided `next` is a path on this site.

| Path | Screen |
|---|---|
| `/login` | Login form. With a valid session → redirect to `/`. |
| `/` | Couple list: search, status, addresses with "Salin", actions; storage usage; preview-phase banner |
| `/couples/new` | Create: nicknames + slug suggestion, then go to the editor |
| `/couples/:id` | Editor; redirects to `/couples/:id/mempelai` |
| `/couples/:id/:tab` | Editor tab: `mempelai`, `acara`, `foto`, `cerita`, `hadiah`, `musik`, `penutup`, `pesan`, `pengaturan` (slug, status, default theme) |
| `/couples/:id/preview` | Full-page invitation preview (any status), with `?inv=`/`?t=` supported |
| `/couples/:id/send-invitation` | The couple's guest-link page inside the admin; generated links point to the **public** address |
| `/preview-frame` | Bare invitation renderer for iframes: draft content via `postMessage`, or a saved couple via `?couple=<id>` (see [preview-messaging.md](./preview-messaging.md)) |
| `/backup` | Download and restore backup |
| anything else | "Halaman tidak ditemukan" with a link to `/` |

## Addresses shown for each couple (copied from the dashboard)

```text
Undangan:          {VITE_PUBLIC_SITE_URL}/{slug}
Kirim undangan:    {VITE_PUBLIC_SITE_URL}/{slug}/send-invitation
```
