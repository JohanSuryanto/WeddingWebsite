---

description: "Task list for the Wedding Invitation Website (Frontend)"
---

# Tasks: Wedding Invitation Website (Frontend)

**Input**: Design documents from `/specs/001-wedding-invitation-site/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: The spec does not request TDD. Only the tests that plan.md and the contracts explicitly commit to are included: content validation, theme conformance, pure-logic unit tests and the Playwright viewport/flow checks that back SC-003 and SC-004.

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own. Stories are ordered by priority: US1 and US2 (P1), then US3, US4 and US6 (P2), then US5 (P3).

**Language rule for every task**: all guest-facing text is Indonesian (FR-022). Sections use only theme tokens and ornament slots and never raw colors (contracts/theme-contract.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The user story the task belongs to (US1–US6)

## Path Conventions

Single frontend project at the repository root: `src/`, `tests/` and `public/`, as defined in plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Scaffold a Vite + React 19 + TypeScript project at the repository root (`index.html`, `src/main.tsx`, `src/App.tsx`, `tsconfig.json`, `vite.config.ts`, `package.json` with name `wedding-website`). Set `<html lang="id">` and add a mobile viewport meta tag in `index.html`.
- [X] T002 Install and configure Tailwind CSS v4 through `@tailwindcss/vite` in `vite.config.ts`, with the entry stylesheet in `src/index.css`.
- [X] T003 [P] Install runtime dependencies: `yet-another-react-lightbox`, `@fontsource/great-vibes`, `@fontsource/cormorant-garamond`, `@fontsource/lato`. Update `package.json`.
- [X] T004 [P] Configure ESLint (typescript-eslint, react-hooks) and Prettier in `eslint.config.js` and `.prettierrc`. Add npm scripts `lint`, `typecheck` (`tsc --noEmit`), `test`, `test:e2e`, `build` and `preview` to `package.json`.
- [X] T005 [P] Configure Vitest with the jsdom environment and React Testing Library setup in `vite.config.ts` (test block) and `tests/setup.ts`.
- [X] T006 [P] Configure Playwright in `playwright.config.ts`. Use projects for viewports 320×640, 375×812, 768×1024, 1366×768 and 1920×1080 on Chromium, plus an iPhone WebKit project. The webServer is `npm run preview`.
- [X] T007 [P] Create the empty directory structure from plan.md: `src/config`, `src/content/images`, `src/themes/romantic-floral/{ornaments,assets}`, `src/sections`, `src/components`, `src/hooks`, `src/lib`, `src/services`, `tests/{unit,component,e2e}` and `public/music`. Add a `.gitignore` that covers `node_modules`, `dist`, `test-results` and `playwright-report`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Content schema, theme system, services contract and page shell. Every story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T008 [P] Define all content types in `src/content/types.ts` exactly as described in contracts/content-schema.md and data-model.md: `WeddingContent`, `Person` (fullName, nickname, photo, childOrder?, father, mother, instagram?), `WeddingEvent` (id, name, start ISO 8601 **with offset**, end ISO string or `null`, venueName, address, mapUrl?, isMain), `StoryMilestone`, `GalleryPhoto` (alt required), `ImageRef` (src, width, height), `GiftInfo`, `GiftAccount`, `Wish`, `MusicTrack`, `CoverContent`, `ClosingContent`, and `Couple.order: 'bride-first' | 'groom-first'`.
- [X] T009 Create placeholder content in `src/content/wedding.ts` exporting `wedding: WeddingContent`. It must include:
  - couple Anisa & Raka with parents
  - events: Akad Nikah `2027-02-14T08:00:00+07:00`–`10:00` (**isMain: true**) and Resepsi `2027-02-14T11:00:00+07:00`–`14:00`, both with a Google Maps `mapUrl`
  - 4 story milestones, 8 gallery photos with Indonesian `alt` text
  - gifts: BCA and DANA accounts plus a delivery address
  - 3 sample wishes
  - music `/music/backsound.mp3`
  - cover heading "The Wedding of" with `defaultGuestLabel` "Bapak/Ibu/Saudara/i"
  - a closing quote (QS. Ar-Rum: 21)

  Add placeholder WebP images to `src/content/images/`. Depends on T008.
- [X] T010 [P] Create the site config in `src/config/site.ts`: `activeTheme: 'romantic-floral'`, `locale: 'id-ID'`, `siteTitle: 'The Wedding of Anisa & Raka'`.
- [X] T011 [P] Define `Theme`, `ThemeOrnaments` (CoverBackdrop, CornerTopLeft?, CornerBottomRight?, SectionDivider, NameFlourish?, AmbientEffect?) and `ThemeId` in `src/themes/types.ts`, per contracts/theme-contract.md.
- [X] T012 [P] Write the Romantic Floral tokens in `src/themes/romantic-floral/tokens.css`, scoped to `[data-theme="romantic-floral"]`, with every required token from contracts/theme-contract.md:
  - colors: `--color-bg #FFF8F6`, `--color-surface #FFFFFF`, `--color-surface-alt #F8E1E4`, `--color-primary #D8A7B1`, `--color-primary-contrast #4A3440`, `--color-accent #C9A66B`, `--color-text #4A3440`, `--color-text-muted #9E7A8C`
  - fonts: script Great Vibes, heading Cormorant Garamond, body Lato
  - shape: `--radius-card 1.25rem`, a rose-tinted `--shadow-card`
  - motion: a `float-up` keyframe used for reveals, defined only under `prefers-reduced-motion: no-preference`
- [X] T013 [P] Create Romantic Floral ornament components in `src/themes/romantic-floral/ornaments/`: `CoverBackdrop.tsx`, `FloralCorner.tsx` (top-left and bottom-right variants), `FloralDivider.tsx` (inline SVG), `NameFlourish.tsx` and `PetalFall.tsx`. PetalFall renders nothing when `prefers-reduced-motion: reduce` is set. All ornaments are `aria-hidden`. Watercolor assets go in `src/themes/romantic-floral/assets/` (WebP/SVG).
- [X] T014 Register the theme in `src/themes/romantic-floral/index.ts`: import `tokens.css` and the fontsource weights, and export a `Theme`. Create the registry and `useTheme()` in `src/themes/index.ts`. The registry exports `themes: Record<ThemeId, Theme>` and an `applyTheme()` that sets `document.documentElement.dataset.theme` from `site.activeTheme`. Depends on T010–T013.
- [X] T015 Map the tokens to Tailwind utilities in `src/index.css` with `@theme inline`: `bg-bg`, `bg-surface`, `bg-surface-alt`, `bg-primary`, `text-primary-contrast`, `text-accent`, `text-text`, `text-muted`, `font-script`, `font-heading`, `font-body`, `rounded-card`, `shadow-card`. Also set base body styles (font-body, color-text, bg-bg, `overflow-x: hidden` on the root). Depends on T012.
- [X] T016 [P] Implement the Indonesian date helpers in `src/lib/dateFormat.ts`:
  - `formatDateId(iso)` → "Minggu, 14 Februari 2027"
  - `formatTimeRangeId(start, end)` → "08.00 – 10.00 WIB", or "08.00 WIB – Selesai" when `end` is `null`
  - `tzLabel(offset)`: +07:00 → WIB, +08:00 → WITA, +09:00 → WIT
- [X] T017 [P] Define the service contracts in `src/services/types.ts` exactly as in contracts/submission-services.md: `RsvpService`, `WishService`, `RsvpInput`, `WishInput`, `RsvpResponse` and a `ValidationError` class with `fieldErrors`.
- [X] T018 [P] Create the `SectionShell` component in `src/components/SectionShell.tsx`. Props: `id`, `title`, optional `subtitle`, `variant: 'default' | 'alt'` (bg-bg or bg-surface-alt). It renders the theme `SectionDivider` and corner ornaments, has responsive padding (px-4 on mobile, max-w-5xl centered) and applies the reveal class.
- [X] T019 [P] Implement the `useReveal` hook in `src/hooks/useReveal.ts`. An IntersectionObserver with threshold 0.15 adds `is-visible` once. Content stays visible when IntersectionObserver is unavailable or reduced motion is set (FR-020).
- [X] T020 [P] Create the `SafeImage` component in `src/components/SafeImage.tsx`. It wraps `<img>` with `width`/`height` from ImageRef and `loading="lazy"` by default, and shows a themed placeholder (bg-surface-alt with a floral icon) on `onError`.
- [X] T021 [P] Write the content validation test in `tests/unit/content.test.ts`. It asserts, for `wedding`:
  - `events.length >= 1`
  - exactly one `isMain: true`
  - every `end` (when not null) > `start`
  - every `start` matches ISO 8601 with an offset
  - every gallery photo has a non-empty `alt`
  - every gift `accountNumber` is digits only after removing spaces and dashes
- [X] T022 [P] Write the theme conformance test in `tests/unit/themes.test.ts`. For every registered theme it asserts that the `SectionDivider` and `CoverBackdrop` ornaments exist and that `tokens.css` defines every required token from contracts/theme-contract.md (read the file and regex-match each `--token`).
- [X] T023 Build the app shell in `src/App.tsx`. Call `applyTheme()` on load, set `document.title` from `site.siteTitle`, and hold an `opened` state (initially false) that gates rendering: cover while closed, `<main>` with sections while opened. Section slots start empty. Depends on T014, T015.

**Checkpoint**: `npm run dev` shows a themed empty page; `npm test` passes content and theme tests.

---

## Phase 3: User Story 1 - Open the invitation from the welcome screen (Priority: P1) 🎯 MVP

**Goal**: The personalized cover ("Kepada Yth. …") reveals the invitation when "Buka Undangan" is pressed.

**Independent Test**: Open `/?inv=Budi+Santoso` and `/` on a phone and a desktop. The cover shows the names, the date and the correct greeting. Pressing the button reveals the main content with a transition.

- [X] T024 [P] [US1] Implement `parseGuestName(search: string): string | null` in `src/lib/guestName.ts`, per contracts/url-parameters.md. It reads `inv` (renamed from `to`; an unencoded `&` stays in the name), URL-decodes it (`+` → space), trims it, collapses repeated whitespace, strips control characters, keeps **at most 60 characters**, and returns `null` when the result is empty.
- [X] T025 [P] [US1] Write a unit test in `tests/unit/guestName.test.ts` covering every example row in contracts/url-parameters.md: empty, `?inv=`, `Budi+Santoso`, extra spaces, over-60 truncation, and `<script>` kept as text.
- [X] T026 [US1] Implement the `useGuestName()` hook in `src/hooks/useGuestName.ts`. It returns `parseGuestName(window.location.search)`, memoized. Depends on T024.
- [X] T027 [US1] Build the `Cover` section in `src/sections/Cover.tsx`. It is a full-viewport (`min-h-dvh`) screen with the theme `CoverBackdrop`, `AmbientEffect` and `NameFlourish`, and shows:
  - `cover.heading`
  - the couple's nicknames in `font-script`, ordered by `couple.order`
  - the main event date via `formatDateId`
  - "Kepada Yth." followed by the guest name, or `cover.defaultGuestLabel` when there is none, rendered as text with `break-words` and `max-w-full`
  - a primary button "Buka Undangan" that calls `onOpen`

  Depends on T026.
- [X] T028 [US1] Wire the cover into `src/App.tsx`. On open: fade and slide the cover out over about 800ms (instantly when reduced motion is set), render the invitation, move focus to `<main>`, and scroll to `location.hash` if it is one of the section anchors from contracts/url-parameters.md, otherwise to the top. While the cover is shown, lock body scrolling. A reload always shows the cover again (edge case).
- [X] T029 [US1] Build the `Hero` ("beranda") section in `src/sections/Hero.tsx` with `id="beranda"`: couple names in script font, "Kami akan menikah" tagline, main event date and the hashtag if present. Add it as the first section in `src/App.tsx`.
- [X] T030 [US1] Build the `Closing` section in `src/sections/Closing.tsx`: the quote with its source, `closing.message` ("Merupakan suatu kehormatan…") and the couple's names in script font. Add it as the last section in `src/App.tsx` (FR-012).
- [X] T031 [P] [US1] Write an end-to-end test in `tests/e2e/cover.spec.ts`. It checks that `/?inv=Budi+Santoso` shows "Budi Santoso", that `/` shows "Bapak/Ibu/Saudara/i", that `?inv=%3Cb%3EHi%3C%2Fb%3E` renders the literal `<b>Hi</b>`, that `#beranda` is not visible before the click, and that it becomes visible after clicking "Buka Undangan".

**Checkpoint**: The cover-to-invitation flow works on every viewport. This is the MVP.

---

## Phase 4: User Story 2 - Read the couple and event details (Priority: P1)

**Goal**: The guest sees the couple, the event schedule and venues, a live countdown and Save the Date.

**Independent Test**: After opening, the Mempelai and Acara sections show correct data. The countdown ticks. "Lihat Lokasi" opens maps. "Simpan Tanggal" offers Google Calendar and .ics.

- [X] T032 [P] [US2] Implement `getCountdown(targetIso, now)` in `src/lib/countdown.ts`. It returns `{days, hours, minutes, seconds, isPast}` and never returns negative numbers.
- [X] T033 [P] [US2] Implement the calendar helpers in `src/lib/calendar.ts`:
  - `googleCalendarUrl(event, couple)`: action=TEMPLATE, text "Pernikahan Anisa & Raka – Akad Nikah", dates in UTC `YYYYMMDDTHHmmssZ`, location = venue name + address
  - `buildIcs(events, couple)`: a VCALENDAR with one VEVENT per event, with CRLF line endings and escaped commas and semicolons
  - `downloadIcs()`: creates a Blob and a temporary `<a download="undangan-pernikahan.ics">`
- [X] T034 [P] [US2] Write unit tests in `tests/unit/countdown.test.ts`, `tests/unit/calendar.test.ts` and `tests/unit/dateFormat.test.ts`:
  - countdown math, with the past date giving `isPast` and zeros
  - the Google URL date encoding, and an .ics containing DTSTART/DTEND in UTC with CRLF line endings
  - "Minggu, 14 Februari 2027", "08.00 – 10.00 WIB" and "Selesai" when `end` is null
- [X] T035 [US2] Implement the `useCountdown(targetIso)` hook in `src/hooks/useCountdown.ts`, which updates every 1s and clears the interval on unmount. Build the `Countdown` component in `src/components/Countdown.tsx`: four themed boxes labelled "Hari", "Jam", "Menit" and "Detik", with an `aria-live="off"` wrapper. When `isPast`, it shows "Hari bahagia telah tiba" instead. Depends on T032.
- [X] T036 [US2] Build the `Couple` section in `src/sections/Couple.tsx` with `id="mempelai"`, rendered in `couple.order`. Each person card has a round photo via SafeImage, the nickname in script font, the full name, `childOrder` + "Bapak {father} & Ibu {mother}", and an optional Instagram link (`target="_blank" rel="noopener"`). An "&" in script font sits between the cards. The cards are stacked on mobile and side by side at `md:` and up.
- [X] T037 [US2] Build the `Events` section in `src/sections/Events.tsx` with `id="acara"`. It shows the `Countdown` for the main event at the top and one card per event with the name, `formatDateId`, `formatTimeRangeId`, venue name and address. The "Lihat Lokasi" button (`target="_blank" rel="noopener"`) renders **only when `mapUrl` is present**. Cards are stacked on mobile and in 2 columns at `md:`. Depends on T035.
- [X] T038 [US2] Build the `SaveTheDate` component in `src/components/SaveTheDate.tsx` with a "Simpan Tanggal" button that opens a small menu with "Google Calendar" (link) and "Kalender Apple / Outlook (.ics)" (download). Place it in `Events.tsx` under the countdown. Depends on T033.
- [X] T039 [US2] Add the Couple and Events sections to `src/App.tsx` after Hero.

**Checkpoint**: US1 and US2 together give a complete, usable invitation.

---

## Phase 5: User Story 3 - Browse the love story and photo gallery (Priority: P2)

**Goal**: A chronological love-story timeline, and a gallery with a full-screen, swipeable lightbox.

**Independent Test**: Cerita shows the milestones in order. Tapping a gallery photo opens it full screen. Swipe, arrow keys and Esc work.

- [X] T040 [P] [US3] Build the `Story` section in `src/sections/Story.tsx` with `id="cerita"`. It renders only if `wedding.story` is non-empty. The timeline is a single column with a left line on mobile and alternates left and right at `md:`. Each milestone shows its date badge, title, description and optional photo via SafeImage.
- [X] T041 [P] [US3] Build the `Gallery` section in `src/sections/Gallery.tsx` with `id="galeri"`. It renders only if `wedding.gallery` is non-empty. The grid has 2 columns on mobile, 3 at `md:` and 4 at `lg:`, with square thumbnails (`object-cover`) as buttons with `aria-label` = alt. Clicking one opens the lightbox at that index.
- [X] T042 [US3] Create the lazy lightbox wrapper in `src/components/GalleryLightbox.tsx`, loaded with `React.lazy` so the library stays out of the initial bundle. Use `yet-another-react-lightbox` and its CSS, with slides built from the gallery `src`/`alt` and captions shown when present. It needs swipe, arrows, Esc to close and a close button labelled "Tutup". Depends on T041.
- [X] T043 [US3] Add the Story and Gallery sections to `src/App.tsx` after Events.

**Checkpoint**: The story and gallery work on their own; hiding them by emptying the content removes the sections cleanly.

---

## Phase 6: User Story 4 - Background music (Priority: P2)

**Goal**: Music starts on "Buka Undangan", and a floating toggle pauses and resumes it.

**Independent Test**: Press "Buka Undangan" and the music plays. The toggle pauses and resumes it. With the mp3 removed, everything else still works and no error is shown.

- [X] T044 [US4] Create `MusicProvider` and the `useMusic()` context in `src/components/MusicProvider.tsx`. It holds a single `<audio loop preload="none">` from `wedding.music.src` and exposes `play()`, `toggle()` and `isPlaying`. `play()` catches rejection or error and stays paused silently (US4-AS3). When `wedding.music` is absent it renders nothing and does nothing.
- [X] T045 [US4] Build the floating `MusicToggle` in `src/components/MusicToggle.tsx`. It is a round primary button fixed at bottom-right, placed above the mobile bottom nav (e.g. `bottom-20 md:bottom-6`). It shows a spinning disc icon while playing and a paused icon otherwise, with `aria-label` "Putar musik" or "Jeda musik" and a tap target of at least 44px. It renders only after the invitation is opened.
- [X] T046 [US4] Wire the music into `src/App.tsx`: wrap the app in `MusicProvider` and call `play()` **synchronously inside** the "Buka Undangan" click handler, before any state or animation await, so browser autoplay rules allow it (research R6). Add a placeholder `public/music/backsound.mp3`.

**Checkpoint**: Music works without affecting the other stories.

---

## Phase 7: User Story 6 - Navigate between sections (Priority: P2)

**Goal**: One-tap navigation to every section, with a bottom bar on mobile and a top bar on desktop.

**Independent Test**: Tapping each nav item scrolls to its section, and the active item is highlighted.

- [X] T047 [P] [US6] Implement the `useActiveSection(ids)` hook in `src/hooks/useActiveSection.ts`. An IntersectionObserver with a `rootMargin` of `-45% 0px -50% 0px` returns the id of the section currently in view.
- [X] T048 [US6] Build `Navigation` in `src/components/Navigation.tsx`. Items (label, anchor): Beranda `#beranda`, Mempelai `#mempelai`, Acara `#acara`, Cerita `#cerita`, Galeri `#galeri`, Hadiah `#hadiah`, RSVP `#rsvp`, Ucapan `#ucapan`. **Hide an item when its section is not rendered.** Below `md:` it is a fixed bottom bar with icon plus a short label, horizontally scrollable if needed, with each target at least 44px tall and `pb-[env(safe-area-inset-bottom)]`. At `md:` and up it is a fixed top bar with text links. The active item gets `text-primary` and `aria-current="true"`. Use smooth scrolling (`scroll-behavior: smooth` in `src/index.css`, disabled under reduced motion) and set `scroll-margin-top` on sections for the desktop bar. Depends on T047.
- [X] T049 [US6] Render `Navigation` in `src/App.tsx` only after the invitation is opened. Add bottom padding to `<main>` on mobile so the last section isn't hidden behind the bar.
- [X] T050 [P] [US6] Write an end-to-end test in `tests/e2e/navigation.spec.ts`: after opening, click each visible nav item and assert that its section is in the viewport and the item has `aria-current` (SC-004). Run it on both the mobile and desktop projects.

**Checkpoint**: All sections are reachable in one action on every viewport.

---

## Phase 8: User Story 5 - Gift, attendance and wishes (Priority: P3)

**Goal**: A gift section with copy buttons, an RSVP form and wishes. All are interactive, none are saved (FR-016).

**Independent Test**: "Salin" copies the number without spaces and shows "Tersalin!". An empty RSVP shows field errors, and a valid one shows thanks. A new wish appears at the top of the list. After a refresh only the sample wishes remain.

- [X] T051 [P] [US5] Implement `copyText(text)` in `src/lib/clipboard.ts`. It uses `navigator.clipboard.writeText`, falls back to a hidden textarea with `document.execCommand('copy')`, and returns a boolean (research R10).
- [X] T052 [P] [US5] Build `Toast` and `useToast()` in `src/components/Toast.tsx`. It is one live region (`role="status"`) that shows a message for 2 seconds. Mount the provider in `src/App.tsx`.
- [X] T053 [P] [US5] Implement the validators in `src/lib/validation.ts`, with Indonesian messages from contracts/submission-services.md.
  - `validateRsvp(input)`:
    - name "Required, 2–60 characters after trimming" → "Nama wajib diisi" / "Nama 2–60 karakter"
    - attendance must be `"hadir" | "tidak_hadir"` → "Silakan pilih konfirmasi kehadiran"
    - guestCount "Required if `hadir`: integer from 1 to 5. Forced to 0 if `tidak_hadir`." → "Jumlah tamu 1–5 orang"
  - `validateWish(input)`:
    - name "Required, 2–60 characters"
    - message "Required, 3–500 characters" → "Ucapan minimal 3 karakter" / "Ucapan maksimal 500 karakter"
  - Both return `fieldErrors`.
- [X] T054 [US5] Implement the in-memory services in `src/services/memory.ts`:
  - `createMemoryRsvpService()`: validates, waits about 400ms, returns an RsvpResponse with `submittedAt`, and throws `ValidationError` on invalid input
  - `createMemoryWishService(seed)`: `list()` returns newest first starting with `wedding.sampleWishes`; `submit()` validates, waits about 400ms, generates the id with `crypto.randomUUID()` (with a fallback) and prepends the wish

  Use **no** localStorage, cookies or network. Wire both in `src/services/index.ts` as the exported `rsvpService` and `wishService`. Depends on T017 and T053.
- [X] T055 [P] [US5] Write unit tests in `tests/unit/validation.test.ts` and `tests/unit/memoryServices.test.ts`: each validation rule and message boundary (1, 2, 60, 61 characters; guestCount 0, 1, 5, 6; message 2, 3, 500, 501), the wish being prepended, the seed being present, and `ValidationError` carrying `fieldErrors`.
- [X] T056 [US5] Build the `Gift` section in `src/sections/Gift.tsx` with `id="hadiah"`, rendered only if `wedding.gifts` is present. It shows the intro text, and one card per account with the logo (SafeImage), provider, number as provided and holder. The "Salin" button copies `accountNumber` **with spaces and dashes removed** and shows the toast "Tersalin!", or "Gagal menyalin" on failure. When present, show the address card with a "Salin Alamat" button. Depends on T051 and T052.
- [X] T057 [US5] Build the `Rsvp` section in `src/sections/Rsvp.tsx` with `id="rsvp"`:
  - fields: "Nama" (pre-filled from `useGuestName()`), a radio group "Hadir" / "Tidak Hadir", and a "Jumlah Tamu" select from 1 to 5 shown only for Hadir
  - validation errors appear inline under each field (`aria-invalid` and `aria-describedby`)
  - states: `idle → submitting` (button "Mengirim…", disabled) `→ success` (message "Terima kasih atas konfirmasinya, {nama}!" plus an "Ubah jawaban" button that returns to idle with the values kept)
  - it submits through `rsvpService`

  Depends on T054.
- [X] T058 [US5] Build the `Wishes` section in `src/sections/Wishes.tsx` with `id="ucapan"`:
  - form: "Nama" (pre-filled from `useGuestName()`), "Ucapan & Doa" textarea with a counter out of 500, optional attendance
  - on submit via `wishService`: toast "Terima kasih atas ucapannya!", clear the message and prepend the wish
  - list: cards with the name, an optional Hadir / Tidak Hadir badge, the message and a relative time such as "baru saja"; scrollable with `max-h-[28rem] overflow-y-auto`
  - messages are rendered as text only

  Depends on T054.
- [X] T059 [US5] Add the Gift, Rsvp and Wishes sections to `src/App.tsx` between Gallery and Closing.

**Checkpoint**: All six user stories are functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T060 [P] Write a responsive end-to-end test in `tests/e2e/responsive.spec.ts`. On every viewport project, open the invitation, scroll through it and assert `document.documentElement.scrollWidth <= window.innerWidth`. Also check that the cover name wraps for a 60-character `?inv=` value (SC-003, edge cases).
- [X] T061 [P] Do a reduced-motion pass. Add a Playwright case in `tests/e2e/responsive.spec.ts` using `reducedMotion: 'reduce'`: no PetalFall element is present and all section content is visible without scrolling animations (FR-020).
- [X] T062 [P] Do an accessibility pass across `src/sections/*` and `src/components/*`:
  - one `h1` (cover names), `h2` per section
  - focus-visible rings using `--color-accent`
  - every interactive element reachable by keyboard, with tap targets of at least 44px (FR-021)
  - decorative ornaments `aria-hidden`
  - body-text contrast of at least 4.5:1
- [X] T063 Optimize performance:
  - preload the cover background and the script font in `index.html`
  - convert all images in `src/content/images` to WebP at no more than 1600px
  - check that the lightbox chunk is split in `npm run build`
  - keep initial JS at or under 150 KB gzipped
  - run Lighthouse mobile on `npm run preview` and fix issues until Performance is 85 or higher (SC-002)
- [X] T064 [P] Write `README.md` at the repository root, in Indonesian and English, covering:
  - how to edit `src/content/wedding.ts` and replace the images and music
  - how to share personalized links (`?inv=Nama+Tamu`)
  - how to switch `activeTheme` in `src/config/site.ts`
  - how to add a new theme (folder + tokens + ornaments + registry entry)
  - the npm scripts
- [X] T065 Run every scenario in `specs/001-wedding-invitation-site/quickstart.md` (1–16, 18–19; skip 17 until a second theme exists). Record the results and fix any failures. Confirm that `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` all pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and **blocks all stories**.
- **US1 (Phase 3)**: Depends on Foundational. It is the MVP.
- **US2, US3, US4, US6, US5 (Phases 4–8)**: Each depends only on Foundational plus the `App.tsx` shell from US1 (T028). They are otherwise independent of one another.
- **Polish (Phase 9)**: Depends on all stories.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P1)**: Foundational. It mounts into the App shell after T028.
- **US3 (P2)**: Foundational plus T028.
- **US4 (P2)**: Foundational plus T028. It hooks into the "Buka Undangan" handler.
- **US6 (P2)**: Foundational plus T028. Nav items auto-hide for sections not yet built, so it works at any point.
- **US5 (P3)**: Foundational (T017 service contract) plus T028.

### Within Each Story

Pure `lib/` logic and its tests → hooks → components and sections → wiring in `App.tsx`. Tasks that edit `src/App.tsx` (T023, T028–T030, T039, T043, T046, T049, T059) are **sequential** with each other.

### Parallel Opportunities

- Setup: T003–T007 in parallel after T001–T002.
- Foundational: T008, T010–T013 and T016–T022 in parallel. T009 follows T008, T014 follows T010–T013, T015 follows T012, and T023 comes last.
- After US1, the US2, US3, US4, US6 and US5 phases can run in parallel, one developer each, with only the `App.tsx` wiring tasks serialized.

---

## Parallel Example: User Story 2

```text
Task: "T032 Implement getCountdown in src/lib/countdown.ts"
Task: "T033 Implement calendar helpers in src/lib/calendar.ts"
Task: "T034 Unit tests countdown/calendar/dateFormat in tests/unit/"
# then T035 → T036/T037 → T038 → T039
```

## Parallel Example: User Story 5

```text
Task: "T051 copyText in src/lib/clipboard.ts"
Task: "T052 Toast in src/components/Toast.tsx"
Task: "T053 validators in src/lib/validation.ts"
# then T054 → T055 (P) + T056/T057/T058 → T059
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, then Phase 2 Foundational.
2. Phase 3 (US1): cover, hero and closing.
3. **Stop and validate**: quickstart scenarios 1–3, then demo the themed cover.

### Incremental Delivery

1. MVP (US1), then US2 (the invitation is now fully informative and shareable).
2. Then US6 (navigation), US3 (story and gallery) and US4 (music).
3. Then US5 (gift, RSVP and wishes, in memory).
4. Polish, then deploy the static `dist/`.

### Later (out of scope for this task list)

- Themes #2 and #3: new `src/themes/<id>/` folders plus a registry entry. No section changes are needed (SC-007, quickstart #17).
- Backend phase: HTTP implementations of `RsvpService` and `WishService` in `src/services/`, swapped in `src/services/index.ts`.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- Every section uses `SectionShell`, theme tokens and ornament slots, and never hard-coded colors or images, so themes stay swappable.
- Guest-provided text (`?inv=`, form inputs) is always rendered as React text and never as HTML.
- Commit after each task or logical group once git is initialized.

---

## Implementation Notes (2026-10-01)

Deviations from the task text above:

- **T012/T015 (tokens)**: Theme tokens are prefixed `--theme-*` (e.g. `--theme-bg`, `--theme-font-script`). The unprefixed names would collide with Tailwind v4's `--color-*` and `--font-*` namespaces and create self-referencing variables. `src/index.css` maps them to the same utilities (`bg-surface`, `text-accent`, `font-script`, …). contracts/theme-contract.md has been updated to match.
- **T012 (contrast)**: `--theme-text-muted` was darkened from `#9E7A8C` to `#86606F` so muted text passes WCAG AA on the cream background.
- **T046 (music)**: The placeholder track is a generated `public/music/backsound.wav`, because an mp3 encoder isn't available. Replace it with a real mp3 and update `music.src`.
- **T048 (navigation)**: The mobile bottom bar fits all 8 items without horizontal scrolling. Labels are hidden visually (kept for screen readers) below 360px.
- **T006 (Playwright)**: The preview server runs on port 4817, because 4173 was already in use by another local project.
- **Extra**: `tests/e2e/features.spec.ts` covers music, events, Save the Date and the gallery lightbox. `scripts/generate-placeholders.mjs` generates the placeholder images and music.
