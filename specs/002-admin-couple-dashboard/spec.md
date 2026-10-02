# Feature Specification: Admin Login & Couple Dashboard (Frontend)

**Feature Branch**: `002-admin-couple-dashboard`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "lets complete FE first, i want to see how it looks first, so lets make another route like login and then dashboard for me to insert the pic, to me the setup the route for new couple"

## Overview

Today the invitation site serves one couple whose details are written into the code. The site owner (the "admin") wants to run it as a service: couples call the admin, send their photos and details, and the admin sets up their invitation. Each couple then receives their own invitation address and their own "send invitation" page for choosing a theme and sharing guest links. Couples never log in.

This feature adds the admin side: a **login page** and a **dashboard** where the admin creates a couple, fills in all invitation details, uploads photos and music, picks a default theme, and gets the couple's addresses to hand over. The public site lives at `wedding.johansuryanto.dev` and the admin at `admin.wedding.johansuryanto.dev`. This phase is **frontend only**, so the admin can see and try the full flow before a backend exists. Data is saved in the admin's browser (see Clarifications for what that means across the two addresses). Everything is built so a backend can replace the temporary storage later without changing the screens.

## Clarifications

### Session 2026-10-02

- Q: Where are couples kept before a backend exists? → A: **Saved in the admin's own browser.** Data survives refresh and restarting the browser, on that browser and device only.
- Q: What does a couple's address look like, and what does the root show? → A: **`wedding.johansuryanto.dev/<address-name>`**, e.g. `/anisa-raka`, with the send-invitation page at `/<address-name>/send-invitation`. The root `wedding.johansuryanto.dev/` shows a **landing page** about the invitation service with the admin's contact.
- Q: Where do the public site and the admin live? → A: Two addresses. The **public site** (landing page, invitations, send-invitation pages) is at `wedding.johansuryanto.dev`. The **admin** (login and dashboard) is at `admin.wedding.johansuryanto.dev`. Admin pages never appear on the public address.
- **Consequence for this phase.** Browsers keep each website address's saved data separate. Couples saved on the admin address cannot be read by the public address, even in the same browser. Until the backend exists:
  - couples created in the dashboard are viewed through the dashboard's own preview, including full-page preview and the couple's send-invitation page inside the admin
  - the public address serves the landing page and the built-in sample couple (Anisa & Raka)

  Once the backend is connected, couples saved in the dashboard appear on the public address with no screen changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin logs in (Priority: P1)

The admin opens the login page, enters their credentials and reaches the dashboard. Without logging in, the dashboard and editing pages cannot be opened.

**Why this priority**: Everything else in this feature sits behind the login.

**Independent Test**: Open the dashboard address directly while logged out and confirm you are sent to the login page. Log in with the correct credentials and land on the dashboard. Log in with wrong credentials and see an error.

**Acceptance Scenarios**:

1. **Given** the admin is logged out, **When** they open any dashboard address, **Then** they are redirected to the login page, and after logging in they return to the page they asked for.
2. **Given** the login page, **When** the admin enters correct credentials, **Then** they reach the dashboard.
3. **Given** the login page, **When** the admin enters wrong credentials, **Then** an error "Email atau kata sandi salah" is shown and the password field is cleared.
4. **Given** the admin is logged in, **When** they press "Keluar" (log out), **Then** they return to the login page and the dashboard can no longer be opened.

---

### User Story 2 - Admin creates a new couple and gets their addresses (Priority: P1)

From the dashboard, the admin creates a new couple by entering the couple's nicknames and an address name (e.g. `budi-sari`), suggested automatically from the nicknames. The couple appears in the dashboard list with its invitation address and its send-invitation address, each with a copy button.

**Why this priority**: Setting up a route for each new couple is the core of the request.

**Independent Test**: Create "Budi & Sari" and confirm the suggested address `budi-sari`. Open its full-page preview and see an invitation for Budi & Sari. Open its send-invitation page and generate a guest link pointing at `wedding.johansuryanto.dev/budi-sari`.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** the admin presses "Tambah Pasangan" and enters "Budi" and "Sari", **Then** the address name `budi-sari` is suggested and can be edited.
2. **Given** an address name already used by another couple, or one reserved by the site (e.g. `login`, `dashboard`, `send-invitation`), **When** the admin tries to save, **Then** saving is blocked with a clear message.
3. **Given** a new couple is saved, **When** the admin views the list, **Then** it shows the couple's names, wedding date (if set), status, invitation address and send-invitation address, each with a "Salin" button.
4. **Given** a couple exists, **When** its invitation is opened (in this phase through the dashboard's full-page preview; after the backend, at its public address), **Then** the invitation shows that couple's details in the couple's default theme, and the guest-name (`inv`) and theme (`t`) link options work as they do today.
5. **Given** a couple exists, **When** its send-invitation page is opened, **Then** links are generated for that couple's public address, e.g. `https://wedding.johansuryanto.dev/budi-sari?inv=…&t=…`, not the site root.
6. **Given** an address that matches no couple, **When** it is opened, **Then** a friendly "Undangan tidak ditemukan" page is shown.

---

### User Story 3 - Admin fills in all invitation details (Priority: P1)

The admin opens a couple and fills in every part of the invitation through forms grouped in tabs or steps:
- **Mempelai**: full names, nicknames, child order and parents
- **Acara**: events with date, time, time zone, venue, address and map link; the main event is marked
- **Cerita**: story milestones
- **Hadiah**: gift accounts and delivery address
- **Musik**
- **Penutup**: closing message and quote
- **Pesan WhatsApp**
- **Tema bawaan**: default theme

**Why this priority**: Without this the admin cannot set up a real couple.

**Independent Test**: Fill in each group for a couple, save, reopen the couple, and confirm everything was kept and shows correctly on the couple's invitation.

**Acceptance Scenarios**:

1. **Given** a couple, **When** the admin edits any field and presses "Simpan", **Then** a confirmation appears and the invitation reflects the change.
2. **Given** the events form, **When** the admin adds, removes or reorders events, **Then** exactly one event must be marked as the main event before saving is allowed.
3. **Given** an event whose end time is before its start time, **When** the admin saves, **Then** saving is blocked with "Jam selesai harus setelah jam mulai".
4. **Given** optional sections (story, gallery, gifts, music) left empty, **When** the invitation is opened, **Then** those sections and their navigation items are hidden, as they are today.
5. **Given** unsaved changes, **When** the admin tries to leave the page, **Then** they are warned before losing the changes.

---

### User Story 4 - Admin uploads photos and music (Priority: P1)

The admin uploads the cover background, the two couple portraits, gallery photos (several at once, reorderable, with alt text), story photos and a music file. Each upload shows a preview, and each can be replaced or removed.

**Why this priority**: The user explicitly asked for a place to "insert the pic". Photos are central to an invitation.

**Independent Test**: Upload a portrait, a cover and 5 gallery photos for a couple. Reorder the gallery, remove one photo, save, and confirm the invitation shows the new photos in the new order.

**Acceptance Scenarios**:

1. **Given** the photo form, **When** the admin selects image files, **Then** each shows a thumbnail preview before saving.
2. **Given** a selected image larger than allowed, or a file that is not an image, **When** it is added, **Then** it is rejected with a clear message stating the limit.
3. **Given** large photos, **When** they are uploaded, **Then** they are automatically resized and compressed for fast loading, without the admin doing anything.
4. **Given** gallery photos, **When** the admin drags them (or uses up/down buttons on touch devices), **Then** their order changes, and the invitation follows that order.
5. **Given** a gallery photo, **When** the admin leaves its description empty, **Then** saving is blocked and the photo is highlighted, because every photo needs a description for accessibility.
6. **Given** a music file, **When** uploaded, **Then** the admin can play it in the dashboard before saving.

---

### User Story 5 - Admin previews the invitation while editing (Priority: P2)

While editing a couple, the admin sees a live phone-sized preview of the couple's invitation that updates as they type. They can switch the preview between the three themes.

**Why this priority**: The admin wants to "see how it looks". A preview avoids switching back and forth, but the invitation address can also be opened directly.

**Independent Test**: Change the bride's nickname and see the preview update within a second. Switch the preview to theme 2 and see the Elegant Classic look.

**Acceptance Scenarios**:

1. **Given** the edit page, **When** the admin types in any field, **Then** the preview reflects the change without saving.
2. **Given** the preview, **When** the admin picks theme 1, 2 or 3, **Then** the preview switches theme without changing the couple's saved default theme.
3. **Given** a phone-width screen, **When** the admin edits, **Then** the preview is available through a "Lihat Tampilan" button instead of side by side.

---

### User Story 6 - Admin manages the couple list (Priority: P2)

The dashboard lists all couples with search, and shows each couple's status:
- **Draf** (draft): not yet shown to guests
- **Aktif** (active): live

The admin can publish or unpublish a couple, open its invitation, duplicate a couple as a starting point, and delete a couple after confirming.

**Why this priority**: Useful as the number of couples grows, but not needed to set up the first couple.

**Independent Test**: Create two couples, search by one name, set one to Draf and confirm its invitation shows "Undangan belum tersedia", then delete it after confirming.

**Acceptance Scenarios**:

1. **Given** several couples, **When** the admin types in search, **Then** the list filters by names or address name.
2. **Given** a couple in Draf, **When** a guest opens its invitation address, **Then** they see "Undangan belum tersedia" instead of the invitation. The admin can still preview it from the dashboard.
3. **Given** a couple, **When** the admin presses "Hapus" and confirms by typing the address name, **Then** the couple and its photos are removed.
4. **Given** a couple, **When** the admin presses "Duplikat", **Then** a copy is created as Draf with a new address name, ready to edit.

---

### User Story 7 - Visitors see a landing page at the root address (Priority: P3)

Anyone opening `wedding.johansuryanto.dev/` sees a short landing page about the digital invitation service:
- what it offers
- the three themes, each with a live example
- how ordering works (contact the admin, send details and photos, receive your links)
- a WhatsApp contact button

**Why this priority**: The root needs something sensible instead of the old single invitation. It is not required for setting up couples.

**Independent Test**: Open the root on phone and desktop, view each theme example, and press the contact button to open WhatsApp with a pre-filled message.

**Acceptance Scenarios**:

1. **Given** the root address, **When** it loads, **Then** the landing page shows the service description, theme examples and a contact button. It has no login link.
2. **Given** a theme example, **When** the visitor opens it, **Then** the sample invitation opens in that theme.
3. **Given** the contact button, **When** pressed, **Then** WhatsApp opens to the admin's number with a pre-filled message.

---

### Edge Cases

- **Renaming an address name after links were shared.** The admin is warned that previously shared links will stop working.
- **Address names with spaces, capitals or symbols.** They are converted to a clean form (lowercase letters, numbers and hyphens) and shown before saving.
- **Two browser tabs editing the same couple.** The last save wins, and the admin is warned if the couple changed since it was opened.
- **Very many or very large photos.** A clear limit applies (see Assumptions) and the admin sees how much is used.
- **Content from couples created before this feature.** The existing sample couple (Anisa & Raka) remains available as the first couple.
- **Login page opened while already logged in.** The admin goes straight to the dashboard.
- **Wrong password entered repeatedly.** After 5 failed attempts, the login is paused for 1 minute.

## Requirements *(mandatory)*

### Functional Requirements

**Access**

- **FR-001**: The admin address (`admin.wedding.johansuryanto.dev`) MUST provide a login page and a dashboard for a single admin role. Couples and guests never log in. The public address MUST NOT expose any admin pages or links.
- **FR-002**: Every dashboard page MUST be unreachable without logging in, and MUST redirect to the login page and back after login.
- **FR-003**: The admin MUST be able to log out from any dashboard page.
- **FR-004**: After 5 consecutive failed login attempts, login MUST be paused for 1 minute.

**Couples and addresses**

- **FR-005**: The admin MUST be able to create, edit, duplicate, publish/unpublish and delete couples.
- **FR-006**: Each couple MUST have a unique address name (lowercase letters, numbers, hyphens; 3–40 characters). It is suggested from the nicknames, and names reserved by the public site are not allowed.
- **FR-007**: Each couple MUST get its own invitation address `wedding.johansuryanto.dev/<address-name>` and send-invitation address `…/<address-name>/send-invitation`. The send-invitation page MUST generate guest links for that couple's invitation address.
- **FR-008**: The guest-name (`inv`) and theme (`t`) link options MUST keep working on every couple's invitation address.
- **FR-009**: Unknown addresses MUST show "Undangan tidak ditemukan". Draft couples MUST show "Undangan belum tersedia" to guests.
- **FR-010**: Each couple MUST have a default theme, used when a link has no theme number.

- **FR-010a**: The public root MUST show a landing page for the service: description, the three themes with live examples, how ordering works, and a WhatsApp contact button. The contact number and texts MUST be editable in one place.
- **FR-010b**: The built-in sample couple (Anisa & Raka) MUST stay available at `/anisa-raka` as the demo used by the landing page.

**Editing content**

- **FR-011**: The dashboard MUST let the admin edit every piece of invitation content that exists today: cover heading, both people's details, events, story, gallery, gifts, music, closing message and quote, hashtag, and the WhatsApp share message.
- **FR-012**: The dashboard MUST enforce the same content rules the invitation relies on:
  - at least one event, with exactly one main event
  - end time after start time
  - every gallery photo has a description
  - account numbers contain digits only, ignoring spaces and dashes
- **FR-013**: The admin MUST be warned before leaving a page with unsaved changes.

**Photos and music**

- **FR-014**: The admin MUST be able to upload, preview, replace, remove and reorder photos, and upload, play and replace a music file.
- **FR-015**: Uploaded photos MUST be automatically resized and compressed for fast loading.
- **FR-016**: Uploads MUST be limited to image files (photos) and audio files (music) within stated size limits. Rejections MUST explain why.

**Preview**

- **FR-017**: The edit page MUST show a live phone-sized preview of the couple's invitation that follows unsaved edits and can switch between all themes.

**Data in this phase**

- **FR-018**: In this phase, couple data and files MUST be saved in the admin's browser so they survive refresh. All saving and loading MUST go through a single replaceable data layer, shared by the dashboard and the invitation pages, so a backend can be connected later without changing screens.
- **FR-018a**: The dashboard MUST let the admin open a couple's full invitation and its send-invitation page as a full-page preview within the admin address, so every couple can be checked end to end before the backend exists.
- **FR-018b**: The dashboard MUST let the admin download all couples (including photos) as a backup file and restore from it, so browser data is not lost if the browser storage is cleared.
- **FR-019**: The dashboard MUST state clearly that it is in a preview phase: data is kept only in this browser, it is not yet visible on the public address, and backups are recommended.

**General**

- **FR-020**: All dashboard and login text MUST be in Indonesian. The dashboard MUST be usable on phone and desktop.

### Key Entities

- **Admin**: the site owner who logs in. There is one admin in this phase.
- **Couple**: one wedding. It has:
  - an address name and a status (Draf/Aktif)
  - a default theme
  - created and updated times
  - its full invitation content, following the same structure the invitation uses today (cover, couple, events, story, gallery, gifts, music, closing, share message)
- **Media file**: an uploaded photo or music file that belongs to one couple. It has a type, size, dimensions (photos), a description (gallery photos) and an order (gallery).
- **Guest link**: generated on the couple's send-invitation page; not stored (unchanged from today).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The admin can set up a new couple with names, one event, a cover photo and 5 gallery photos, and copy both of the couple's addresses, in under 10 minutes on a first attempt.
- **SC-002**: A new couple's invitation can be previewed in full immediately after saving, with no redeploy or code change. After the backend phase, the same is true at its public address.
- **SC-003**: 100% of dashboard pages redirect to login when opened logged out.
- **SC-004**: Edits appear in the live preview within 1 second of typing.
- **SC-005**: Photos of 5 MB or more are reduced to under 500 KB each, with no visible quality loss at phone and desktop sizes.
- **SC-006**: All dashboard pages are usable without horizontal scrolling at 320, 375, 768, 1366 and 1920 px widths.
- **SC-007**: The existing invitation for Anisa & Raka still looks and behaves exactly as before, now at `/anisa-raka`, and also appears as a couple in the dashboard.
- **SC-008**: A backup made from the dashboard can be restored into an empty browser, bringing back every couple and photo unchanged.

## Assumptions

- **One admin.** There is a single admin account. Multiple admins, roles and password reset are out of scope.
- **Login security in this phase.** Without a backend, the login only demonstrates the flow and cannot truly protect data. Real protection arrives with the backend phase. The dashboard says so (FR-019).
- **Limits.** Photos up to 10 MB each before compression, gallery up to 30 photos, music up to 10 MB, per couple.
- **Reserved address names** on the public site: `send-invitation`, `api`, `assets`, `music`, `admin`, `login`, `dashboard`, `u`, `inv`, `tema`, plus any future site pages.
- **Shared backend (next phase).** Both addresses will use the same backend and database. The browser-storage limitation in this phase therefore disappears once it is connected: a couple saved in the dashboard is immediately readable on the public address. The backend must:
  - accept requests from both addresses
  - give the public address read access to Aktif couples only, plus the ability to submit RSVPs and wishes
  - keep every create, edit and delete action behind the admin login
  - serve photos and music from links that work on both addresses
- **Domains.** Public site at `wedding.johansuryanto.dev`; admin at `admin.wedding.johansuryanto.dev`. During local development both must be reachable on one computer under two separate local addresses, mirroring production.
- **Landing page contact.** The landing page uses the admin's WhatsApp number and texts from one editable place. Placeholder values are used until the real ones are provided.
- **Browser storage capacity.** Photos are compressed (SC-005), so dozens of couples fit comfortably in browser storage. The dashboard shows usage and warns when space runs low.
- **Gift logos.** Optional, uploaded like other photos.
- **No payments.** Packages and payments are out of scope.
- **Unchanged parts.** Guest-facing behaviour of the invitation, themes and the send-invitation page stays as specified in feature 001, apart from being per couple.
- **Date entry.** Dates are entered with a date and time picker plus a time-zone choice (WIB/WITA/WIT), not typed as technical date strings.
