# Data Model: Wedding Invitation Website (Frontend)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-01

There is no database in this phase. All wedding content is a single typed object in `src/content/wedding.ts` (see [contracts/content-schema.md](./contracts/content-schema.md)). RSVP responses and wishes exist only in memory while the page is open.

## WeddingContent (root)

| Field | Type | Required | Notes |
|---|---|---|---|
| couple | Couple | yes | |
| events | Event[] | yes | Must have at least 1 item. The item with `isMain: true` drives the countdown and cover date. |
| story | StoryMilestone[] | no | Shown in chronological order. The section is hidden if empty. |
| gallery | GalleryPhoto[] | no | The section is hidden if empty. |
| gifts | GiftInfo | no | The section is hidden if absent. |
| sampleWishes | Wish[] | no | Seeds the wishes list. |
| music | MusicTrack | no | The music control is hidden if absent. |
| cover | CoverContent | yes | |
| closing | ClosingContent | yes | |

**Validation**: exactly one event has `isMain: true`. Content is checked by a unit test at build/test time, so bad content fails CI rather than breaking the page.

## Couple

| Field | Type | Notes |
|---|---|---|
| bride | Person | |
| groom | Person | |
| order | `"bride-first" \| "groom-first"` | Which name appears first. Default `"bride-first"`. |
| hashtag | string? | e.g. `#AnisaRaka2027` |

### Person

| Field | Type | Notes |
|---|---|---|
| fullName | string | e.g. "Anisa Putri, S.Ds." |
| nickname | string | Used in script font on the cover, e.g. "Anisa" |
| photo | ImageRef | |
| childOrder | string? | e.g. "Putri pertama dari" |
| father | string | e.g. "Bapak Hendra Wijaya" |
| mother | string | e.g. "Ibu Sari Lestari" |
| instagram | string? | Handle without the @ |

## Event

| Field | Type | Notes |
|---|---|---|
| id | string | Slug, e.g. `akad`, `resepsi` |
| name | string | e.g. "Akad Nikah", "Resepsi" |
| start | string (ISO 8601 with offset) | e.g. `2027-02-14T08:00:00+07:00` |
| end | string (ISO 8601 with offset) \| null | `null` → shown as "Selesai" (until finished) |
| venueName | string | |
| address | string | |
| mapUrl | string? | If absent, the "Lihat Lokasi" button is hidden (edge case) |
| isMain | boolean | |

**Rules**: `end` > `start` when present. Dates are shown with Indonesian formatting (e.g. "Minggu, 14 Februari 2027", "08.00 – 10.00 WIB"). The time zone label (WIB/WITA/WIT) is derived from the offset.

## StoryMilestone

| Field | Type | Notes |
|---|---|---|
| title | string | e.g. "Pertama Bertemu" |
| date | string | Free text, e.g. "Agustus 2019" |
| description | string | 1–3 sentences |
| photo | ImageRef? | |

## GalleryPhoto

| Field | Type | Notes |
|---|---|---|
| src | ImageRef | |
| alt | string | Required for accessibility |
| caption | string? | |

## ImageRef

A path to an imported asset (resolved by the bundler), with `width` and `height` so the page can reserve space and avoid layout shift. If an image fails to load, a themed placeholder is shown (edge case).

## GiftInfo

| Field | Type | Notes |
|---|---|---|
| intro | string | Short Indonesian text shown above the accounts |
| accounts | GiftAccount[] | |
| address | { recipient: string; address: string; phone?: string }? | Physical gift delivery |

### GiftAccount

| Field | Type | Notes |
|---|---|---|
| provider | string | e.g. "BCA", "Mandiri", "DANA", "GoPay" |
| accountNumber | string | Displayed as provided; copied **without spaces** |
| accountHolder | string | |
| logo | ImageRef? | |

## MusicTrack

| Field | Type | Notes |
|---|---|---|
| src | string | Audio file path (mp3 or wav; placeholder is `/music/backsound.wav`) |
| title | string? | For accessible label |

## CoverContent / ClosingContent

- **CoverContent**: `heading` (e.g. "The Wedding of"), `defaultGuestLabel` ("Bapak/Ibu/Saudara/i"), `background` ImageRef.
- **ClosingContent**: `message` (thank-you text), optional `quote` with `text` and `source` (e.g. QS. Ar-Rum: 21).

## Guest (runtime only)

| Field | Type | Source |
|---|---|---|
| name | string \| null | `?inv=` URL parameter, sanitized per [contracts/url-parameters.md](./contracts/url-parameters.md) |

## RsvpResponse (runtime only, not saved)

| Field | Type | Validation |
|---|---|---|
| name | string | Required, 2–60 characters after trimming. Pre-filled from Guest.name if present. |
| attendance | `"hadir" \| "tidak_hadir"` | Required |
| guestCount | number | Required if `hadir`: integer from 1 to 5. Forced to 0 if `tidak_hadir`. |
| submittedAt | Date | Set on submit |

**States**: `idle → submitting → success` or `idle → invalid` (errors shown per field). After success the form shows a thank-you message and an "Ubah jawaban" (change answer) action that returns to `idle` with the previous values kept.

## Wish (runtime only for new entries)

| Field | Type | Validation |
|---|---|---|
| id | string | Generated on the device |
| name | string | Required, 2–60 characters |
| message | string | Required, 3–500 characters |
| attendance | `"hadir" \| "tidak_hadir"`? | Optional badge |
| createdAt | Date | |

**Behavior**: new wishes are added to the **top** of the list, which contains the sample wishes plus this visit's submissions. The list is lost on refresh (FR-016).

## SiteConfig (`src/config/site.ts`)

| Field | Type | Notes |
|---|---|---|
| activeTheme | ThemeId | The **single setting** that switches the theme (FR-018a) |
| locale | `"id-ID"` | Used for date formatting |
| siteTitle | string | Browser tab title |

## Theme (see [contracts/theme-contract.md](./contracts/theme-contract.md))

| Field | Type | Notes |
|---|---|---|
| id | ThemeId | e.g. `romantic-floral` |
| name | string | |
| ornaments | ThemeOrnaments | Decorative components |
| stylesheet | CSS side-effect import | Token definitions under `[data-theme=id]` |
