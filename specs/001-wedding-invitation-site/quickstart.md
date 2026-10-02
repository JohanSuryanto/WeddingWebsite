# Quickstart & Validation Guide

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Node.js 20 or later (tested on 22.x) and npm 10 or later
- For end-to-end tests: `npx playwright install chromium webkit` (run once)

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
npm run preview    # serve the production build
```

## Automated checks

```bash
npm run lint
npm run typecheck
npm test           # Vitest: content validation, guest-name parsing, countdown, ics, validators, services, theme conformance
npm run test:e2e   # Playwright: viewports 320/375/768/1366/1920
```

## Manual validation scenarios

| # | Scenario | Steps | Expected | Covers |
|---|---|---|---|---|
| 1 | Cover, personalized | Open `/?inv=Budi+Santoso` | Cover shows couple's names, date, "Kepada Yth. Budi Santoso", button "Buka Undangan"; content hidden | US1, FR-001–003 |
| 2 | Cover, generic | Open `/` | "Kepada Yth. Bapak/Ibu/Saudara/i" | US1-AS3 |
| 3 | Unsafe name | Open `/?inv=%3Cb%3EHi%3C%2Fb%3E` | Shows `<b>Hi</b>` literally, not bold | Edge case |
| 4 | Open + music | Press "Buka Undangan" | Smooth transition, music starts, floating music toggle pauses and resumes it | US1-AS4, US4 |
| 5 | Event details | Scroll to Acara | Akad and Resepsi with Indonesian dates/times + WIB; "Lihat Lokasi" opens maps in new tab | US2-AS2/3 |
| 6 | Countdown | Watch countdown | Days/hours/minutes/seconds update every second; set main event date in the past in content → "Hari bahagia telah tiba" | US2-AS4/5 |
| 7 | Save the Date | Press "Simpan Tanggal" | Google Calendar option opens prefilled event; .ics option downloads a file that imports correctly | FR-007 |
| 8 | Gallery | Tap a photo; swipe on phone; press Esc on desktop | Full-screen viewer, next/prev by swipe/arrows, closes | US3 |
| 9 | Copy account | Press "Salin" on a gift account | Toast "Tersalin!"; pasted value has no spaces | US5-AS1, R10 |
| 10 | RSVP validation | Submit empty RSVP | Field errors "Nama wajib diisi", "Silakan pilih konfirmasi kehadiran" | US5-AS2 |
| 11 | RSVP success | Fill and submit | "Mengirim…" then thank-you message | FR-014 |
| 12 | Wishes | Submit a wish | Appears at top of the list; refresh → gone, samples remain | US5-AS3, FR-016 |
| 13 | Navigation | Tap each nav item on phone (bottom bar) and desktop (top bar) | Scrolls to section in one action; active item highlighted | US6, SC-004 |
| 14 | Responsive | DevTools at 320, 375, 768, 1366, 1920 px + landscape phone | No horizontal scroll, no overlap/cut-off | FR-017, SC-003 |
| 15 | Reduced motion | Enable OS "reduce motion", reload | No petal fall, no float animations; content fully visible | FR-020 |
| 16 | Content-only edit | Change couple names/date in `src/content/wedding.ts` | Page updates everywhere; no other files touched | FR-019, SC-005 |
| 17 | Theme switch | (Once a 2nd theme exists) change `activeTheme` in `src/config/site.ts` | Entire look changes; content unchanged | FR-018a, SC-007 |
| 18 | Performance | Lighthouse mobile on `npm run preview` | Performance ≥ 85; cover visible < 3 s on "Slow 4G" throttling | SC-002 |
| 19 | In-app browser | Open link inside WhatsApp on a phone | Cover, music, copy button all work | R6, R10 |

## Validation results (2026-10-01)

| Check | Result |
|---|---|
| `npm run lint`, `npm run typecheck` | ✅ clean |
| `npm test` (Vitest) | ✅ 42/42 |
| `npm run test:e2e` (Playwright, 6 viewport projects) | ✅ 84/84 |
| Scenarios 1–15 | ✅ Automated in `tests/e2e/*` and `tests/unit/*` |
| Scenario 16 (content-only edit) | ✅ By construction: every section reads only `src/content/wedding.ts`. Not separately automated |
| Scenario 17 (theme switch) | ✅ Three themes: Romantic Floral, Elegant Classic and Rustic Garden (preview with `?t=1`, `?t=2`, `?t=3`). All pass conformance (`tests/unit/themes.test.ts`) and the per-viewport preview checks (`tests/e2e/themes.spec.ts`). Unit tests: 52/52. E2E: 108/108 |
| Scenario 18 (Lighthouse mobile) | ✅ Performance 91, Accessibility 100, Best Practices 100. LCP 2.9 s, CLS 0.011 on simulated slow 4G |
| Scenario 19 (WhatsApp in-app browser) | ⚠️ Needs a manual check on a real phone once the site is deployed |
| Initial JS | 104 KB gzipped (budget 150 KB). The lightbox is a separate lazy chunk (12 KB gzipped) |
