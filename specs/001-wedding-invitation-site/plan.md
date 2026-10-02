# Implementation Plan: Wedding Invitation Website (Frontend)

**Branch**: `001-wedding-invitation-site` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-wedding-invitation-site/spec.md`

## Summary

Build a responsive, single-page digital wedding invitation in Indonesian. It opens on a personalized cover ("Kepada Yth. …", "Buka Undangan"). Behind the cover are the couple, the events with a countdown and Save the Date, the love story, a gallery with a swipe lightbox, gift accounts with copy buttons, an RSVP form and wishes, background music, and one-tap navigation.

The technical approach is a static React + TypeScript site built with Vite and styled with Tailwind v4 over CSS design tokens. Three things are kept apart:
- **Content**: one typed file.
- **Themes**: pluggable token and ornament modules, chosen by one setting. Romantic Floral is built first.
- **Submissions**: service interfaces with in-memory implementations now, ready to swap for HTTP in the backend phase.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19

**Primary Dependencies**: Vite 7, Tailwind CSS v4, `yet-another-react-lightbox`, `@fontsource/great-vibes`, `@fontsource/cormorant-garamond`, `@fontsource/lato`

**Storage**: N/A. Content is a static TypeScript module, and RSVP and wishes live in memory for the current visit only.

**Testing**: Vitest + React Testing Library (unit/component), Playwright (end-to-end across viewports)

**Target Platform**: Modern mobile and desktop browsers (last 2 versions of Chrome, Safari iOS 16+, Firefox and Edge), including WhatsApp and Instagram in-app webviews

**Project Type**: Frontend-only static web application (single page)

**Performance Goals**: Cover visible in under 3 s on mobile Slow 4G, Lighthouse mobile Performance ≥ 85, animations at 60 fps

**Constraints**: No backend or network calls for data. Works from 320px width. Respects `prefers-reduced-motion`. All guest-facing text in Indonesian. Initial JS kept under about 150 KB gzipped, with the gallery and lightbox lazy-loaded.

**Scale/Scope**: 1 couple, 1 page, 10 sections (cover, beranda, mempelai, acara, cerita, galeri, hadiah, rsvp, ucapan, penutup), 1 theme now and 2–3 eventually, and a few hundred guests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the **unfilled template**, so no project principles have been ratified. The only gates are therefore the spec's own constraints:

| Gate | Status |
|---|---|
| Frontend only: no backend or database (user instruction) | ✅ In-memory services, static hosting |
| All spec clarifications resolved | ✅ 0 markers remain |
| Multi-theme support without content edits (FR-018a) | ✅ Theme contract + single `activeTheme` setting |
| Content editable without layout changes (FR-019) | ✅ Single content module |

**Post-design re-check**: ✅ All gates still pass, and the design adds no unjustified complexity. Consider running `/speckit-constitution` to record principles such as mobile-first, Indonesian-only copy and frontend-only for the current phase.

## Project Structure

### Documentation (this feature)

```text
specs/001-wedding-invitation-site/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── url-parameters.md
│   ├── content-schema.md
│   ├── theme-contract.md
│   └── submission-services.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.ts
tsconfig.json
playwright.config.ts
public/
└── music/                       # background track (mp3)
src/
├── main.tsx
├── App.tsx                      # cover gate → invitation sections
├── index.css                    # Tailwind entry + token→utility mapping
├── config/
│   └── site.ts                  # activeTheme, locale, siteTitle
├── content/
│   ├── types.ts                 # WeddingContent & related types
│   ├── wedding.ts               # ← the only file the couple edits
│   └── images/                  # couple, gallery, story photos
├── themes/
│   ├── index.ts                 # registry + Theme/ThemeOrnaments types
│   └── romantic-floral/
│       ├── index.ts             # ornaments
│       ├── tokens.css
│       ├── ornaments/           # FloralCorner, FloralDivider, PetalFall, …
│       └── assets/              # watercolor WebP/SVG
├── sections/
│   ├── Cover.tsx
│   ├── Hero.tsx                 # beranda + countdown
│   ├── Couple.tsx
│   ├── Events.tsx               # + SaveTheDate
│   ├── Story.tsx
│   ├── Gallery.tsx              # lazy lightbox
│   ├── Gift.tsx
│   ├── Rsvp.tsx
│   ├── Wishes.tsx
│   └── Closing.tsx
├── components/
│   ├── Navigation.tsx           # bottom bar (mobile) / top bar (desktop)
│   ├── MusicToggle.tsx
│   ├── Countdown.tsx
│   ├── CopyButton.tsx
│   ├── Toast.tsx
│   ├── SectionShell.tsx         # heading + reveal + theme ornaments
│   └── SafeImage.tsx            # placeholder on error
├── hooks/
│   ├── useReveal.ts
│   ├── useActiveSection.ts
│   ├── useCountdown.ts
│   └── useGuestName.ts
├── lib/
│   ├── guestName.ts             # parse/sanitize ?inv=
│   ├── dateFormat.ts            # Indonesian dates, WIB/WITA/WIT
│   ├── calendar.ts              # Google Calendar URL + .ics
│   ├── clipboard.ts             # with webview fallback
│   └── validation.ts            # RSVP & wish validators
└── services/
    ├── types.ts                 # RsvpService, WishService, ValidationError
    ├── memory.ts                # in-memory implementations
    └── index.ts                 # wiring (swap point for backend)
tests/
├── unit/                        # lib/, services/, content, theme conformance
├── component/                   # sections & components (RTL)
└── e2e/                         # Playwright: flow + viewport overflow
```

**Structure Decision**: A single frontend project at the repository root with no `frontend/` or `backend/` split. When the backend phase starts, the app can move to `frontend/` with a `backend/` beside it. The only code that has to change is `src/services/index.ts`.

## Phase 0: Research

Complete. See [research.md](./research.md), which covers decisions R1–R13 (stack, theming, Romantic Floral tokens, animation, lightbox, music autoplay, calendar, guest name safety, in-memory services, clipboard in webviews, navigation, testing, hosting and performance).

## Phase 1: Design & Contracts

Complete.
- [data-model.md](./data-model.md): the content entities and the runtime RSVP and wish state.
- [contracts/url-parameters.md](./contracts/url-parameters.md): the `?inv=` parameter and section anchors.
- [contracts/content-schema.md](./contracts/content-schema.md): the single editable content file.
- [contracts/theme-contract.md](./contracts/theme-contract.md): required tokens and ornament slots, and how the theme is selected.
- [contracts/submission-services.md](./contracts/submission-services.md): the RSVP and wishes service interfaces for the backend phase.
- [quickstart.md](./quickstart.md): run commands and 19 validation scenarios mapped to the spec.

## Complexity Tracking

No violations to justify.
