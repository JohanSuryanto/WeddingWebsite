# Research: Wedding Invitation Website (Frontend)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-10-01

The spec names no tech stack, so every item in Technical Context started as an open question. Each decision below resolves one.

## R1. Framework and build tool

- **Decision**: React 19 + TypeScript 5, built with Vite. The output is a static single-page site.
- **Rationale**: The site is one scrolling page with many small interactive pieces (countdown, lightbox, music player, forms, copy buttons). A component model keeps sections isolated and lets a theme swap visuals per section. Vite gives fast dev reloads and plain static output that any host can serve. TypeScript enforces the content and theme contracts, so a wrong field breaks the build rather than the page. React also leaves a clean path for the later backend phase, which only needs data calls.
- **Alternatives considered**:
  - *Plain HTML/CSS/JS*: very light, but multi-theme swapping and typed content get messy fast.
  - *Next.js / Astro*: server rendering and routing aren't needed for one page with no backend yet. Astro is a strong option for static sites, but it adds friction for the heavily interactive parts.
  - *Vue / Svelte*: equally capable. React was picked for its ecosystem and familiarity, not for any technical gap in the others.

## R2. Styling and multi-theme strategy

- **Decision**: Tailwind CSS v4 utilities that read **CSS custom properties (design tokens)**. Each theme lives in its own folder `src/themes/<theme-id>/` and has:
  1. `tokens.css`: colors, fonts, radii and shadows, scoped under `[data-theme="<id>"]`
  2. `index.ts`: a `Theme` object with metadata, font imports and an **ornaments** map (decorative React components such as floral corners, dividers and the cover background)
  3. `assets/`: theme-only images (watercolor PNG/SVG)

  The active theme comes from one setting, `activeTheme` in `src/config/site.ts`. It sets `data-theme` on `<html>`. Sections use only semantic tokens (`bg-surface`, `text-accent`, `font-script`) and ornament slots, never raw colors.
- **Rationale**: This meets FR-018a and SC-007. Adding theme #2 or #3 means adding a folder and flipping one setting, with no section or content edits. Using CSS variables means switching themes involves no JS style recalculation.
- **Alternatives considered**:
  - *A separate CSS file per theme with section-specific overrides*: sections would get tangled up with themes.
  - *CSS-in-JS theme provider*: costs runtime and adds a dependency, for no benefit over CSS variables.
  - *A separate component tree per theme*: triples the maintenance.

## R3. Romantic Floral theme details

- **Decision**:
  - Palette tokens: blush `#F8E1E4`, dusty rose `#D8A7B1`, mauve `#9E7A8C`, deep plum text `#4A3440`, cream surface `#FFF8F6`, gold accent `#C9A66B`.
  - Fonts: *Great Vibes* (script, for the couple's names), *Cormorant Garamond* (headings), *Lato* (body). All are self-hosted through `@fontsource` packages so the site doesn't depend on Google's servers or bring in layout shift from late loading.
  - Ornaments: watercolor floral corner PNGs (transparent, compressed WebP), an SVG floral divider and a soft petal-fall animation on the cover. The petal fall is disabled when the device requests reduced motion.
- **Rationale**: This matches the palette described to and approved by the user. Body text on the cream surface meets WCAG AA contrast (plum on cream ≈ 10:1).
- **Alternatives considered**: Dancing Script or Parisienne for the script font. Either can replace Great Vibes by changing one line in the theme.

## R4. Scroll animations

- **Decision**: A small custom `useReveal` hook built on `IntersectionObserver`, which adds a CSS class. The fade and float keyframes are defined in each theme's CSS. All motion is wrapped in `@media (prefers-reduced-motion: no-preference)`.
- **Rationale**: The only need is reveal-on-scroll, and no animation library is required for it. It also satisfies FR-020 directly.
- **Alternatives considered**: *Motion (Framer Motion)*: adds about 30 KB for features the site doesn't need. *AOS*: an unmaintained jQuery-era library.

## R5. Gallery lightbox with swipe

- **Decision**: The `yet-another-react-lightbox` library, with its thumbnail plugin left off.
- **Rationale**: It supports touch swipe, keyboard, next/prev and close, and is accessible and maintained. That covers FR-009 and User Story 3, including swiping on phones.
- **Alternatives considered**: A hand-built lightbox is doable, but swipe handling and focus trapping are easy to get wrong. PhotoSwipe is also excellent but has a heavier setup.

## R6. Background music

- **Decision**: One hidden `<audio loop>` element. `play()` is called inside the "Buka Undangan" click handler, which counts as a user action and is therefore allowed by browser autoplay rules. A floating toggle button handles pause and resume. If `play()` is rejected, the page shows the paused state silently.
- **Rationale**: Browsers block autoplay without a user action. The cover button provides exactly that action, which covers FR-010 and US4-AS3.

## R7. Save the Date (calendar)

- **Decision**: Offer two options: a **Google Calendar** link built from a URL template, and a generated **.ics** file download for Apple and Outlook calendars. Both are built on the device; no server is needed.
- **Rationale**: Covers Android, iOS and desktop users (FR-007) without a backend.

## R8. Guest name personalization and safety

- **Decision**: Read `?inv=` with `URLSearchParams`, decode it, trim it, collapse spaces and limit it to 60 characters. Render it only as React text, never as HTML. If it is empty, fall back to "Bapak/Ibu/Saudara/i".
- **Rationale**: React escapes text by default, which covers the unsafe-characters edge case. The length limit and CSS word-breaking cover the long-name edge case.

## R9. RSVP / Wishes without a backend

- **Decision**: Define `RsvpService` and `WishService` interfaces ([contracts/submission-services.md](./contracts/submission-services.md)). This phase ships an **in-memory** implementation that keeps data only in React state, so it is lost on refresh as the spec requires. The wishes list is seeded with 3 sample wishes from the content file so the section doesn't look empty. Validation uses a small hand-written validator per form.
- **Rationale**: Meets FR-016 exactly. The later backend phase only has to write an HTTP implementation of the same interface; UI components don't change.
- **Alternatives considered**: *localStorage*: contradicts the requirement that data is not kept after refresh. *A form library (react-hook-form + zod)*: overkill for two small forms. It can be adopted in the backend phase if shared schemas become useful.

## R10. Copy to clipboard

- **Decision**: `navigator.clipboard.writeText`, falling back to a hidden textarea with `document.execCommand('copy')` on older in-app browsers such as the WhatsApp and Instagram webviews. Show a "Tersalin!" toast for 2 seconds.
- **Rationale**: Invitation links are usually opened inside chat-app webviews, where the Clipboard API is sometimes unavailable.

## R11. Navigation

- **Decision**: A fixed bottom icon bar on mobile (< 768px) and a top bar with text links on desktop. Both use anchor links to section IDs with smooth scrolling. The active section is highlighted using `IntersectionObserver` (the same approach as R4).
- **Rationale**: Bottom navigation is easy to reach with a thumb on phones, and eight sections need one-tap access (FR-011, SC-004).

## R12. Testing

- **Decision**:
  - **Vitest + React Testing Library** for unit and component tests: countdown math, guest name parsing, .ics generation, form validation and the in-memory services.
  - **Playwright** for end-to-end tests at 320, 375, 768, 1366 and 1920px widths. They check for horizontal overflow (SC-003), navigation (SC-004) and the cover-to-invitation flow.
- **Rationale**: This automates each measurable success criterion that can be automated. SC-006 (look-and-feel rating) remains a manual review.

## R13. Hosting and performance

- **Decision**: Deploy as static files to any static host (Vercel, Netlify or GitHub Pages). The final host is decided at deploy time. Images are served as WebP, sized to at most 1600px, and lazy-loaded below the fold. Target a mobile Lighthouse Performance score of 85 or higher.
- **Rationale**: SC-002 requires the welcome screen within 3 seconds on mobile. The cover renders from critical CSS with one hero image, and everything else is lazy-loaded.
