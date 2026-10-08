# Contract: Invitation URL Parameters

The couple shares a link like `https://wedding.johansuryanto.dev/<couple>?inv=Budi%20Santoso`.

*Since feature 002, each couple has its own path (`/<address-name>`, e.g. `/anisa-raka`) and its send-invitation page is `/<address-name>/send-invitation`; the root `/` is the landing page. The parameters below work the same on every couple's path. See [002 routes](../../002-admin-couple-dashboard/contracts/routes.md).*

| Param | Required | Meaning | Processing |
|---|---|---|---|
| `inv` | no | Guest name shown on the cover (between "Kepada Yth." and "Mohon maaf apabila ada kesalahan penulisan nama dan gelar") and pre-filled in the RSVP and wishes forms | URL-decode (`+` → space). An **unencoded `&` stays part of the name**: segments after `inv=` are rejoined with `&` until the next segment that looks like another parameter (`key=value`, e.g. `t=2`, `fbclid=…`). Then remove control characters, collapse repeated whitespace, trim, strip one pair of surrounding `{ }` (from the `?inv={Nama}` template), and keep at most 60 characters. Empty result → treated as absent. Malformed `%` encoding is kept as-is instead of failing. |
| `t` | no | Theme preview number (see [theme-contract.md](./theme-contract.md)) | `1`–`4`; anything else is ignored. |

The old `to` parameter was renamed to `inv` and is no longer read.

**Generating links**: `/send-invitation` builds links with `buildInviteUrl()` (`src/lib/inviteLink.ts`) as `<base>?inv=<name>&t=<n>`, using standard form encoding (spaces become `+`, `&` becomes `%26`). A unit test round-trips tricky names (`&`, `%`, `+`, `=`, quotes, HTML, emoji) through `parseGuestName()` to guarantee the invitation shows exactly the typed name.

**Display rules**
- Present: `Kepada Yth.` / `<name>` / apology line
- Absent: `Kepada Yth.` / `Bapak/Ibu/Saudara/i` / apology line
- Always rendered as plain text; HTML in the value appears literally (e.g. `<b>x</b>` shows the angle brackets).
- Long names wrap across lines and never overflow at 320px width.

**Examples**

| URL | Displayed name |
|---|---|
| `/` | Bapak/Ibu/Saudara/i |
| `/?inv=` | Bapak/Ibu/Saudara/i |
| `/?inv=Budi+Santoso` | Budi Santoso |
| `/?inv=Johan & Partner` (typed as-is; the browser sends `Johan%20&%20Partner`) | Johan & Partner |
| `/?inv=Johan%20%26%20Partner` (fully encoded) | Johan & Partner |
| `/?inv=Johan & Partner&t=2` | Johan & Partner (theme 2) |
| `/?inv={Johan & Partner}` | Johan & Partner |
| `/?inv=Budi&fbclid=abc` (tracking parameter added by social apps) | Budi |
| `/?inv=%20%20Pak%20%20Andi%20` | Pak Andi |
| `/?inv=Keluarga%20Besar%20Bapak%20H.%20Muhammad%20Abdullah%20Syarifuddin%20dan%20Ibu` | first 60 characters |
| `/?inv=%3Cscript%3Ealert(1)%3C%2Fscript%3E` | `<script>alert(1)</script>` as text only |

**Section anchors** (used by the navigation and shareable directly): `#beranda`, `#mempelai`, `#acara`, `#cerita`, `#galeri`, `#hadiah`, `#rsvp`, `#ucapan`. When a link with an anchor is opened, the cover still shows first. After "Buka Undangan" is pressed, the page scrolls to that anchor.
