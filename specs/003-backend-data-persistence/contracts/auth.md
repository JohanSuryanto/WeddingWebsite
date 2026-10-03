# Contract: Admin Authentication and Couple Access

## Admin (replaces 002 `LocalAuthService`)

The 002 interface is kept, plus one addition:

```ts
// src/admin/auth/types.ts
export interface AuthService {
  login(email: string, password: string): Promise<AdminSession>  // InvalidCredentialsError | LockedOutError
  logout(): Promise<void>
  current(): AdminSession | null
  subscribe(listener: (s: AdminSession | null) => void): () => void
  init(): Promise<void>                                            // NEW: GET /api/admin/session once at startup
}
```

### `HttpAuthService`
- **Startup.** `AdminApp` awaits `init()` before rendering routes, so `current()` stays synchronous for `RequireAuth`.
- **Login and logout.** `login` calls `POST /api/admin/login` and `logout` calls `POST /api/admin/logout`. A `BroadcastChannel('admin-auth')` tells other tabs, replacing 002's `storage` event.
- **Session expiry.** When any `apiFetch` gets 401 on an admin route, the auth service sets `current()` to null and emits `'expired'`. `AdminLayout` responds by opening a **re-login dialog** over the current page instead of redirecting, so editor state survives. After a successful login, the editor retries the save that failed (US2-4).
- **Lockout.** `LockedOutError.retryAt` comes from the server, so the countdown is the same on every device (FR-009).

### Server rules (`server/auth/admin.ts`)

| Rule | Detail |
|---|---|
| Credentials | `ADMIN_EMAIL` (compared case-insensitively) and `ADMIN_PASSWORD_HASH`, in the `scrypt$N$r$p$salt$hash` format (research R6). `npm run hash-password -- "<pw>"` prints the hash |
| Timing | A dummy scrypt runs even when the email is wrong, so response time doesn't reveal valid emails |
| Session | A random cookie `ws_admin`. The database stores only the SHA-256. The expiry is absolute, 7 days after login (FR-008) |
| Lockout | `throttles` key `login:admin`. 5 failures → 60 s. While locked, the password isn't checked at all |
| Logout | Deletes the session row, so the cookie stops working everywhere (US2-5) |
| CSRF | `Origin` allow-list on every non-GET request, plus `SameSite=Lax` |

Removed from 002: the `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD_SHA256` build variables (they leaked the hash into the bundle), and the preview-phase warning banner.

## Couple access (send-invitation passcode, US4)

### Admin side
- **Pengaturan tab.** The passcode field (4 digits) has these controls:
  - **"Acak"**: generates a random passcode with `crypto.getRandomValues`.
  - **"Salin pesan"**: copies a ready-to-send message, editable in `src/config/service.ts`:
    ```
    Halo {names}! Halaman kirim undangan Anda:
    https://wedding.johansuryanto.dev/{slug}/send-invitation
    Kode akses: {passcode}
    ```
- **Saving.** Changing the passcode increases `passcode_version`, which ends every unlock of that couple (FR-010c).
- **Dashboard list.** A couple whose passcode entry has been paused 3 or more times in 24 h shows the badge "⚠ Banyak percobaan kode" (FR-010d).

### Public side (`/:slug/send-invitation`)

```text
GET gate ──► unlocked? ──yes──► load() + responses() ──► link generator + "Respons Tamu"
               │no
               ▼
      passcode screen ──POST unlock──► 204 ──► (cookie wc_<id> set) ──► reload gate
               │401 "Kode akses salah" (clear inputs, focus first box)
               │423 "Terlalu banyak percobaan. Coba lagi dalam {n} menit." (inputs disabled, countdown)
```

### Server rules (`server/auth/coupleAccess.ts`)

| Rule | Detail |
|---|---|
| Comparison | Constant time (`timingSafeEqual`) against `couples.passcode` |
| Throttle | `throttles` key `passcode:<coupleId>`. 5 failures → 15 min. Each lockout writes `security_events(kind='passcode_lockout')` |
| Cookie | `wc_<coupleId>` = `b64url(coupleId).b64url(passcodeVersion).b64url(exp)` + `.` + HMAC-SHA256 with `SESSION_SECRET`, lasting 30 days |
| Check | Verifies the signature, that `exp` is in the future, and that the version equals the current `passcode_version` |
| What it unlocks | `/api/couple/:slug/*` for **that couple only**. It never grants admin access |
| Guest links | Never include the passcode or the cookie (FR-010e); the guest link format is unchanged from 001 |

## Secrets (server environment, never `VITE_`)

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | Admin credentials |
| `SESSION_SECRET` | ≥ 32 random bytes (base64). Used for HMAC of couple cookies and visitor ids. Rotating it signs out every couple and resets RSVP "same browser" matching |
| `CRON_SECRET` | Vercel Cron bearer token |
