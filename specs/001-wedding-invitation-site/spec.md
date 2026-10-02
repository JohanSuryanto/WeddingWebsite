# Feature Specification: Wedding Invitation Website (Frontend)

**Feature Branch**: `001-wedding-invitation-site`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "so as this folder name, wedding website, i want to make this website responsive both pc/mobile. So i want you to give me some theme from your end first, and i will let you know, it will contains welcome things, it will contains some of the pages. basically what need to be done to show the wedding invitation. yes i forgot, its about wedding invitation website. and later it will contains about their gift, attandence, and then user input about they feel. right now focus on FE first, do not think about BE and DB."

## Overview

A digital wedding invitation that a couple shares with guests as a link. Guests open it on a phone or computer, see a welcome screen, open the invitation, and scroll or navigate through the couple's details, the event schedule and venue, and photos. Later sections cover gifts, attendance (RSVP) and guest wishes. This phase covers only the guest-facing presentation. No server storage or database is involved.

## Clarifications

### Session 2026-10-01

- Q: Which visual theme should the invitation use? → A: **Romantic Floral** (blush pink, dusty rose and mauve, watercolor florals, soft motion, handwritten script for names) is the first theme. The site must support 2–3 themes in total; the others will be added later.
- Q: How should gift, attendance and wishes behave without a backend? → A: Fully interactive on the frontend (validation, copy buttons, submitted wishes appear in the list), but nothing is saved; data is lost on refresh.
- Q: Which language should the invitation use? → A: Indonesian only (e.g. "Buka Undangan", "Kepada Yth.").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the invitation from the welcome screen (Priority: P1)

A guest taps the invitation link. They see a welcome (cover) screen with the couple's names, the wedding date, a short greeting and their own name if the link was personalized. They press "Buka Undangan" (Open Invitation) and the main invitation appears.

**Why this priority**: This is the first impression and the entry point to everything else. Without it there is no invitation.

**Independent Test**: Open the site on a phone and on a desktop. Confirm the cover shows names, date and greeting, and that pressing "Open Invitation" reveals the main content.

**Acceptance Scenarios**:

1. **Given** a guest opens the link, **When** the page loads, **Then** the welcome screen shows the couple's names, wedding date and an "Open Invitation" button, and the rest of the content stays hidden.
2. **Given** the link includes a guest name (e.g. `?inv=Budi+Santoso`), **When** the welcome screen loads, **Then** it shows "Kepada Yth. Budi Santoso".
3. **Given** the link has no guest name, **When** the welcome screen loads, **Then** it shows a generic greeting ("Kepada Yth. Bapak/Ibu/Saudara/i") with no blank or broken text.
4. **Given** the guest is on the welcome screen, **When** they press "Open Invitation", **Then** the main invitation appears with a smooth transition.

---

### User Story 2 - Read the couple and event details (Priority: P1)

After opening the invitation, the guest reads who is getting married, when and where each event takes place, and how long until the day.

**Why this priority**: The date, time and place are the essential information an invitation must deliver.

**Independent Test**: Open the invitation and confirm that the couple section, the event schedule (ceremony and reception), the venue with a map link, and a live countdown are all visible and correct on phone and desktop.

**Acceptance Scenarios**:

1. **Given** the invitation is open, **When** the guest reaches the couple section, **Then** they see each partner's full name, photo and parents' names.
2. **Given** the invitation is open, **When** the guest reaches the event section, **Then** each event (e.g. ceremony, reception) shows its name, date, start–end time, venue name and address.
3. **Given** an event has a venue, **When** the guest presses "View Location", **Then** the venue opens in a map service in a new tab or app.
4. **Given** the wedding date is in the future, **When** the guest views the countdown, **Then** it shows the remaining days, hours, minutes and seconds and updates every second.
5. **Given** the wedding date has passed, **When** the guest views the countdown, **Then** it shows a friendly message (e.g. "Hari bahagia telah tiba") instead of negative numbers.
6. **Given** the guest presses "Save the Date", **When** the action completes, **Then** they can add the event to their calendar with its title, date, time and location filled in.

---

### User Story 3 - Browse the love story and photo gallery (Priority: P2)

The guest views the couple's story as a short timeline and browses a photo gallery, opening any photo full-screen.

**Why this priority**: Adds warmth and personality but is not needed to attend the event.

**Independent Test**: Open the gallery, tap a photo, confirm it opens full-screen and can be navigated and closed on both touch and mouse.

**Acceptance Scenarios**:

1. **Given** the guest reaches the love story section, **When** it is displayed, **Then** milestones appear in chronological order, each with a title, date and short text.
2. **Given** the guest is in the gallery, **When** they tap or click a photo, **Then** it opens enlarged with next/previous controls and a close control.
3. **Given** a photo is open full-screen on a phone, **When** the guest swipes left or right, **Then** the next or previous photo appears.

---

### User Story 4 - Background music (Priority: P2)

Soft background music starts when the guest opens the invitation, and the guest can pause or resume it at any time.

**Why this priority**: A common, expected touch in digital invitations, but optional to the core information.

**Independent Test**: Open the invitation, confirm music begins after pressing "Open Invitation", and that a floating control pauses and resumes it.

**Acceptance Scenarios**:

1. **Given** the guest presses "Open Invitation", **When** the main content appears, **Then** the background music starts playing.
2. **Given** music is playing, **When** the guest presses the music control, **Then** the music pauses, and pressing it again resumes it.
3. **Given** music cannot play (file missing or the device blocks it), **When** the invitation opens, **Then** the rest of the invitation works normally with no error shown to the guest.

---

### User Story 5 - Gift, attendance and wishes sections (Priority: P3)

The guest can see how to send a gift (e.g. bank account or e-wallet details with a copy button, and a gift delivery address), state whether they will attend and with how many people, and leave a message of wishes for the couple.

**Why this priority**: The user described these as coming "later". Saving the responses requires a backend, which is out of scope for this phase. In this phase they are fully interactive on screen, but nothing is saved.

**Independent Test**: Copy an account number, submit the RSVP form with and without required fields, and submit a wish. Confirm feedback appears, then refresh and confirm nothing was kept.

**Acceptance Scenarios**:

1. **Given** the gift section is shown, **When** the guest presses "Copy" next to an account number, **Then** the number is copied and a short confirmation ("Tersalin!") appears.
2. **Given** the attendance form is shown, **When** the guest submits without a name or attendance choice, **Then** a clear message indicates which fields are required.
3. **Given** the wishes form is shown, **When** the guest submits a valid name and message, **Then** a thank-you confirmation appears and the message is shown in the wishes list for that visit.

---

### User Story 6 - Navigate between sections (Priority: P2)

On any device, the guest can jump directly to a section (Home, Couple, Event, Story, Gallery, Gift, RSVP, Wishes) instead of scrolling through everything.

**Why this priority**: The invitation has many sections, and quick navigation matters on small screens.

**Independent Test**: Use the navigation on phone and desktop to reach each section in one tap or click.

**Acceptance Scenarios**:

1. **Given** the invitation is open on a phone, **When** the guest taps a section in the navigation bar, **Then** the page moves to that section.
2. **Given** the invitation is open on a desktop, **When** the guest clicks a section in the navigation, **Then** the page moves to that section and the active section is highlighted.

---

### Edge Cases

- A very long guest name in the link wraps cleanly on the cover and does not overflow the screen.
- Special or unsafe characters in the guest name are shown as plain text and never interpreted as page content.
- A photo that fails to load shows a neutral placeholder instead of a broken image.
- A very narrow phone (320px wide), a tablet, landscape orientation or a wide desktop (1920px+) all show a readable, unbroken layout.
- If the guest's device has "reduce motion" enabled, animations are minimized.
- A guest who returns to the page after opening it sees the welcome screen again, so the cover experience stays consistent.
- An event with no map link hides the "View Location" button.

## Requirements *(mandatory)*

### Functional Requirements

**Welcome / Cover**

- **FR-001**: The site MUST show a welcome screen first, with the couple's names, wedding date, a greeting and an "Open Invitation" button.
- **FR-002**: The site MUST read an optional guest name from the invitation link and display it on the welcome screen, falling back to a generic greeting when absent.
- **FR-003**: The main invitation content MUST stay hidden until the guest presses "Open Invitation".

**Invitation content**

- **FR-004**: The site MUST show a couple section with each partner's name, photo and parents' names.
- **FR-005**: The site MUST show one or more events, each with name, date, start–end time, venue name, address and an optional map link.
- **FR-006**: The site MUST show a live countdown to the main wedding event and a friendly message once the date has passed.
- **FR-007**: The site MUST let the guest add the wedding to their calendar.
- **FR-008**: The site MUST show a love story timeline in chronological order.
- **FR-009**: The site MUST show a photo gallery with a full-screen viewer that supports next/previous, swipe on touch devices, and closing.
- **FR-010**: The site MUST play background music after the invitation is opened and provide an always-visible control to pause and resume it.
- **FR-011**: The site MUST provide navigation that lets the guest jump to any section in one action.
- **FR-012**: The site MUST include a closing section with a thank-you message and the couple's names.

**Gift, attendance and wishes (frontend only)**

- **FR-013**: The site MUST show a gift section listing one or more gift accounts (provider, account number, account holder) with a one-tap copy action, plus an optional gift delivery address.
- **FR-014**: The site MUST show an attendance (RSVP) form with guest name, attendance choice (attending / not attending) and number of guests, with required-field validation.
- **FR-015**: The site MUST show a wishes form (name, message) and a list of wishes.
- **FR-016**: In this phase, responses from FR-014 and FR-015 MUST NOT be sent to or stored on any server. They MUST still behave fully on screen (validation, confirmation messages, the submitted wish appearing in the list) for the current visit only, and are cleared on page refresh.

**Responsive design and theme**

- **FR-017**: Every section MUST be fully usable and readable on phones (from 320px wide), tablets and desktops, without horizontal scrolling.
- **FR-018**: The site MUST apply one consistent visual theme (colors, fonts, decorative elements, animation style) across all sections. The first theme is **Romantic Floral**: blush pink, dusty rose and mauve palette, watercolor floral corner ornaments, a handwritten script font for the couple's names with a readable serif or sans-serif for body text, and soft fade/float motion.
- **FR-018a**: Themes MUST be separable from content and section structure, so 2–3 themes can exist and the active theme can be switched through a single setting without editing content or sections. Only Romantic Floral is built in this phase; the other themes will be defined later.
- **FR-019**: All wedding content (names, dates, venues, story, photos, accounts, music) MUST be kept in one editable content source, so it can be changed without altering page layout.
- **FR-020**: Sections MUST use gentle entrance animations as they scroll into view, which are reduced when the device requests reduced motion.
- **FR-021**: Interactive controls MUST be large enough to tap comfortably on touch screens and operable by keyboard on desktop.
- **FR-022**: All guest-facing text MUST be in Indonesian.

### Key Entities

- **Couple**: The two partners. Each has a full name, nickname, photo, and parents' names.
- **Event**: A wedding occasion (e.g. ceremony, reception) with a name, date, start and end time, venue name, address and map link.
- **Guest**: The person viewing the invitation. In this phase only their name, taken from the invitation link, is known.
- **Story Milestone**: A moment in the couple's relationship, with a title, date, short description and optional photo.
- **Gallery Photo**: An image with optional caption.
- **Gift Account**: A way to send a gift, with a provider (bank / e-wallet), account number and account holder name.
- **RSVP Response**: A guest's name, attendance choice and number of attendees. Not saved in this phase.
- **Wish**: A guest's name and message to the couple. Not saved in this phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time guest can find the wedding date, time and venue within 30 seconds of opening the link.
- **SC-002**: The welcome screen is visible within 3 seconds on a typical mobile connection.
- **SC-003**: All sections display without horizontal scrolling, overlapping text or cut-off content at widths of 320px, 375px, 768px, 1366px and 1920px.
- **SC-004**: Every section is reachable from the navigation in one tap or click.
- **SC-005**: Replacing the couple's names, dates, venues and photos requires editing only the content source, with no layout changes.
- **SC-006**: In a review with at least 5 people, at least 4 of them rate the look and feel as "fits a wedding invitation" or better on both phone and desktop.
- **SC-007**: Switching the active theme requires changing only one setting, with no content or section edits (verified once a second theme exists).

## Assumptions

- The site is a single invitation for one couple. There is no admin panel, login or multi-couple support.
- Real names, dates, venues, photos and music are not yet provided. Realistic placeholder content will be used and replaced later.
- Personalization uses a guest name in the link. Guest lists are not managed by the site.
- Map links point to an external map service. No embedded interactive map is required.
- Saving RSVP and wishes, preventing duplicates or spam, and showing wishes from other guests will be handled in a later backend phase.
- Only one theme is active per deployment; guests do not pick a theme themselves.
- Guests use a current version of a common mobile or desktop browser.
- The site layout scrolls as a single page with anchored sections ("pages" in the request are treated as sections of this page, reachable via navigation).
