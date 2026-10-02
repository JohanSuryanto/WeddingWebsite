# Contract: Admin Authentication

```ts
// src/admin/auth/types.ts
export interface AdminSession { email: string; expiresAt: string }

export class InvalidCredentialsError extends Error {}           // "Email atau kata sandi salah"
export class LockedOutError extends Error { retryAt: Date }     // "Terlalu banyak percobaan. Coba lagi dalam {n} detik."

export interface AuthService {
  login(email: string, password: string): Promise<AdminSession>  // InvalidCredentialsError | LockedOutError
  logout(): Promise<void>
  current(): AdminSession | null                                  // null when absent or expired
  subscribe(listener: (s: AdminSession | null) => void): () => void
}
```

## This phase: `LocalAuthService`

| Aspect | Behaviour |
|---|---|
| Credentials | `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD_SHA256` (lowercase hex) from `.env.local`, which is never committed. `.env.example` documents them. `npm run hash-password -- "<password>"` prints the hash. |
| Check | Email compared case-insensitively. `sha256(password)` compared to the configured hash. |
| Session | `{ email, expiresAt: now + 12 h }` in localStorage key `admin.session`. Expired sessions are cleared on read. |
| Lockout (FR-004) | localStorage key `admin.lockout` holds `{ failures, lockedUntil }`. Each failure adds 1. At 5, `lockedUntil = now + 60 s` and the counter resets. During lockout, `login` throws `LockedOutError` without checking the password. A success clears it. |
| Multiple tabs | A `storage` event updates `subscribe` listeners, so logging out in one tab logs out the others. |

**Not secure, and stated so in the UI (FR-019).** The hash and the check run in the browser and anyone can bypass them. The login only gates the screens in this phase. Real protection, enforced by a server, arrives with `HttpAuthService`.

## Route guard

`RequireAuth` wraps every admin route except `/login`:
- No session → redirect to `/login?next=<encodeURIComponent(path + search)>`.
- After login → `navigate(next)` if `next` starts with `/` and not `//`; otherwise go to `/`.
- `/login` with a session → redirect to `/`.
- "Keluar" → `logout()`, then `/login`.
