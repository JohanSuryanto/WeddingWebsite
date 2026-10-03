# Feature Specification: Server Storage for Couples, Media and Guest Responses

**Feature Branch**: `003-backend-data-persistence`

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "so right now most of the FE are done for this weddingwebsite, now as this rightnow only save at client end or cookies, i want this to be saved at DB. So as you know to access the admin, we will make admin.{url}, so BE needed in here. for DB, should we go for postgre or mongodb? and for saving the images and music, where should we save it? GCP? pls note as this is for learn i hope all of the service we use free. you can suggest me as well what i can use for the 3rd party save images and postgre deployment."

## Overview

Features 001 and 002 built the guest invitation and the admin dashboard, but everything is still kept in the browser:

- Couples, photos and music live in the admin's browser storage. They cannot be seen on the public address (`wedding.johansuryanto.dev`) because browsers keep each address's data separate.
- The admin login only demonstrates the flow. It does not truly protect anything.
- Guest RSVPs and wishes are not saved at all. They disappear on refresh.

This feature moves all of that to one shared online storage service used by both addresses. A couple saved in the admin (`admin.wedding.johansuryanto.dev`) appears at its public address immediately, with no redeploy. Photos and music are stored online and load on both addresses. The admin login becomes real protection. Guest responses are saved and visible to the admin.

The screens built in 002 stay the same. Only where the data is kept changes. The one addition is a **4-digit passcode** on each couple's send-invitation page, set by the admin, so only the couple can create guest links and see their guests' responses. The service is a learning project, so every hosted service it relies on must be usable at no cost at the expected scale.

## Clarifications

### Session 2026-10-02

- Q: Should couples see their RSVPs and wishes on the send-invitation page, given it has no login? → A: **The send-invitation page is locked with a 4-digit passcode that the admin sets per couple.** The admin hands the couple the page link and the passcode. After entering it, the couple creates personal guest links by typing guests' names (as today) and can see their RSVPs and wishes. Guests opening the invitation itself never need a passcode.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A couple saved in the admin goes live on the public address (Priority: P1)

The admin creates or edits a couple in the dashboard and publishes it. A guest opening `wedding.johansuryanto.dev/<address-name>` on any device sees that couple's invitation, with the latest saved content. The admin does not redeploy or touch code.

**Why this priority**: This is the reason for the feature. Without it the service cannot be handed to real couples.

**Independent Test**: In the admin, create "Budi & Sari" with one event and publish. On a different device that has never opened the admin, open `wedding.johansuryanto.dev/budi-sari` and see the invitation. Change the bride's nickname in the admin, save, refresh the public page, and see the change.

**Acceptance Scenarios**:

1. **Given** a couple saved and published in the admin, **When** a guest opens its public address on any device, **Then** the invitation shows that couple's saved content in its default theme.
2. **Given** a published couple, **When** the admin saves an edit, **Then** guests who open or refresh the invitation afterwards see the edit.
3. **Given** a couple in Draf, **When** a guest opens its public address, **Then** "Undangan belum tersedia" is shown, and none of the couple's content is sent to the guest's browser.
4. **Given** the admin is logged in on a second computer, **When** they open the dashboard, **Then** they see the same couples with the same content as on the first computer.
5. **Given** a couple's send-invitation page unlocked with its passcode (User Story 4), **When** it is used on any device, **Then** it generates guest links for that couple's public address, as it does today.
6. **Given** the online storage is briefly unreachable, **When** a guest opens an invitation, **Then** a friendly "Undangan sedang tidak dapat dimuat, coba lagi" message with a retry button is shown instead of a blank page.

---

### User Story 2 - Only the admin can change data (Priority: P1)

The admin logs in with their email and password. The online service, not just the screen, refuses every create, edit, publish, delete and upload request that does not come from a logged-in admin. Guests can only read published invitations and submit responses.

**Why this priority**: Once data is online, anyone could otherwise change or delete couples. Real protection must arrive together with online storage.

**Independent Test**: Logged out, send a request to change a couple directly to the service (bypassing the dashboard) and confirm it is refused and nothing changes. Log in and make the same change through the dashboard successfully.

**Acceptance Scenarios**:

1. **Given** correct credentials, **When** the admin logs in, **Then** they reach the dashboard and stay logged in on that browser for up to 7 days, unless they log out.
2. **Given** no valid login, **When** any request to create, change, publish, delete or upload is made, **Then** it is refused and no data changes.
3. **Given** wrong credentials, **When** the admin tries to log in, **Then** "Email atau kata sandi salah" is shown, and after 5 consecutive failures login is paused for 1 minute. The pause is enforced by the service, so it cannot be bypassed by refreshing or switching browsers.
4. **Given** the admin's login expires while they are editing, **When** they press "Simpan", **Then** they are asked to log in again and their unsaved edits are kept and saved after logging in.
5. **Given** the admin presses "Keluar", **When** anyone reuses that browser's previous login, **Then** it no longer works.
6. **Given** the admin's password is stored by the service, **When** the stored data is inspected, **Then** the password itself cannot be read from it.

---

### User Story 3 - Photos and music are stored online (Priority: P1)

When the admin uploads a cover, portraits, gallery photos, story photos, gift logos or music, the files are stored online with the couple. They load for guests on the public address and for the admin in the dashboard, on any device.

**Why this priority**: An invitation without its photos is not usable, and photos are the largest part of each couple's data.

**Independent Test**: Upload a cover, 5 gallery photos and a music file for a couple and save. On another device, open the public invitation and confirm every photo shows and the music plays. Delete one gallery photo in the admin and confirm it disappears from the invitation.

**Acceptance Scenarios**:

1. **Given** the admin uploads photos and music and saves, **When** the invitation is opened on any device, **Then** all files load.
2. **Given** photos uploaded through the dashboard, **When** they are stored, **Then** they are already resized and compressed, as in 002, so storage use stays small.
3. **Given** an upload in progress, **When** it fails or the connection drops, **Then** the admin sees which file failed and can retry it without re-selecting the others, and the couple is never saved pointing at a missing file.
4. **Given** a photo is removed or replaced, or a couple is deleted, **When** the change is saved, **Then** the old files are removed from online storage, so unused files do not pile up.
5. **Given** a couple in Draf, **When** someone guesses a file's address, **Then** the file may load, but nothing on the public site lists or links to it. (See Assumptions: media addresses are hard to guess but not secret.)
6. **Given** the free media quota is close to its limit, **When** the admin opens the dashboard, **Then** they see how much of the quota (storage plus delivery) is used and a warning at 80% or more.

---

### User Story 4 - The couple unlocks their send-invitation page with a passcode (Priority: P1)

When the admin sets up a couple, they set a 4-digit passcode for the couple's send-invitation page (or let the dashboard suggest a random one). The admin gives the couple two things: the page link (`wedding.johansuryanto.dev/<address-name>/send-invitation`) and the passcode. The couple opens the link and enters the passcode. They can then type guest names to create a personal invitation link for each guest and share it (e.g. via WhatsApp), and see who has responded. Anyone without the passcode sees only the passcode screen.

**Why this priority**: The send-invitation page is how couples use the service. Once guest responses are saved, it must not be open to anyone who finds the link.

**Independent Test**: Set passcode `4821` for Budi & Sari. On a new device, open `/budi-sari/send-invitation` and see only the passcode screen. Enter `1111` and see an error. Enter `4821`, type the guest name "Pak Andi", and receive a link that opens the invitation greeting "Pak Andi". Open the guest link on a third device and confirm no passcode is asked.

**Acceptance Scenarios**:

1. **Given** a new couple, **When** the admin creates it, **Then** a random 4-digit passcode is suggested. The admin can change it, see it at any time in the dashboard, and copy the page link and passcode together as a ready-to-send message.
2. **Given** the send-invitation page, **When** opened without having entered the passcode, **Then** only a passcode screen ("Masukkan kode akses") with 4 digit boxes is shown. No guest data, link generator or couple details beyond the names are visible.
3. **Given** the correct passcode, **When** the couple enters it, **Then** the page unlocks and stays unlocked on that browser for 30 days, unless the admin changes the passcode.
4. **Given** a wrong passcode, **When** entered, **Then** "Kode akses salah" is shown. After 5 wrong attempts, entry is paused for 15 minutes for that couple's page. The pause is enforced by the service, so it cannot be bypassed by refreshing or switching browsers.
5. **Given** the page is unlocked, **When** the couple types one or more guest names, **Then** a personal invitation link is created for each, with copy and WhatsApp share buttons, as today.
6. **Given** the admin changes a couple's passcode, **When** the couple's browser that was unlocked with the old passcode reopens the page, **Then** it asks for the new passcode.
7. **Given** a guest opens a personal invitation link, **When** the invitation loads, **Then** no passcode is asked, and the link does not contain or reveal the passcode.
8. **Given** a couple in Draf, **When** its send-invitation page is opened, **Then** the couple can still unlock it and prepare links, with a notice that the invitation is not live yet.

---

### User Story 5 - Guest RSVPs and wishes are saved (Priority: P2)

A guest submits their attendance (RSVP) or a wish on a couple's invitation. The response is saved. Every guest sees all wishes for that couple, newest first. The admin sees each couple's RSVPs and wishes in the dashboard, can hide or delete an inappropriate wish, and can download the RSVPs as a spreadsheet file.

**Why this priority**: Saving responses was promised as a backend-phase item in 001. It is valuable to couples but the invitation works without it.

**Independent Test**: As two different guests on two devices, submit one RSVP and one wish each for "Budi & Sari". Refresh and confirm both wishes show for both guests. In the admin, confirm both RSVPs and wishes appear for Budi & Sari only. Delete one wish and confirm it disappears from the invitation.

**Acceptance Scenarios**:

1. **Given** a guest submits a valid RSVP, **When** they refresh the invitation, **Then** they see that their response was received, and the admin sees it in the couple's responses list.
2. **Given** a guest who already submitted an RSVP from the same browser, **When** they submit again, **Then** their earlier response is replaced rather than counted twice.
3. **Given** a guest submits a wish, **When** any guest opens the invitation, **Then** the wish appears in the wishes list, newest first.
4. **Given** the admin hides or deletes a wish, **When** guests open the invitation, **Then** that wish no longer shows.
5. **Given** a couple's responses, **When** the admin views them, **Then** they see totals of attending, not attending, and the number of people attending, and can download all RSVPs as a spreadsheet file.
6. **Given** the same browser submits more than 5 wishes to one couple within 10 minutes, **When** it submits again, **Then** the submission is refused with "Terlalu banyak pesan, coba lagi nanti".
7. **Given** a couple in Draf, **When** anyone tries to submit a response to it, **Then** it is refused.
8. **Given** the couple's send-invitation page is unlocked with its passcode, **When** the couple views it, **Then** they see their RSVP totals, the RSVP list and the wishes, and can download the RSVPs as a spreadsheet file. Hiding or deleting wishes stays with the admin.

---

### User Story 6 - Move existing browser data online (Priority: P2)

The admin has already set up couples in the 002 browser-only dashboard. They restore their existing backup file into the online storage, and every couple and photo appears online unchanged.

**Why this priority**: Prevents the admin from re-entering couples already prepared. Only needed once.

**Independent Test**: Make a backup from the 002 dashboard containing 2 couples with photos. In the new dashboard, restore it, and confirm both couples, their content, status and photos match, and their public addresses work.

**Acceptance Scenarios**:

1. **Given** a backup file from the 002 dashboard, **When** the admin restores it, **Then** every couple, its content, status, default theme and media are created online.
2. **Given** a couple in the backup whose address name already exists online, **When** restoring, **Then** the admin chooses per couple whether to skip it, replace the online one, or keep both with a new address name.
3. **Given** a restore fails partway, **When** the admin looks at the dashboard, **Then** they see which couples were restored and which were not, and can run the restore again without creating duplicates.
4. **Given** the built-in sample couple (Anisa & Raka), **When** the online storage is first set up, **Then** the sample couple exists online at `/anisa-raka` so the landing page examples keep working.

---

### User Story 7 - Back up everything online (Priority: P3)

The admin downloads a backup file of all couples, media and guest responses from the dashboard, and can restore it later, for example to move to another free provider.

**Why this priority**: Free services can change their terms or delete inactive data. A backup the admin holds protects against that. Not needed day to day.

**Independent Test**: Download a backup, restore it into an empty online storage, and confirm every couple, photo, RSVP and wish comes back.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** the admin presses "Unduh Cadangan", **Then** they receive one file containing all couples, media and guest responses.
2. **Given** that file and an empty online storage, **When** the admin restores it, **Then** everything comes back unchanged.

---

### Edge Cases

- **Online storage asleep or slow to wake.** Free services may pause when unused. The first invitation opened after a quiet period may load slower, but it must still load and show a loading state, never a blank page or error (see SC-003).
- **Two admin sessions edit the same couple** (two tabs or two computers). The second save is refused with the existing "sudah diubah" warning, as in 002, now enforced across devices.
- **Address name renamed after links were shared.** As in 002, the admin is warned. Old links show "Undangan tidak ditemukan".
- **Couple deleted while guests have it open.** Further RSVP or wish submissions are refused with a friendly message.
- **Very long wish or abusive content.** Wishes are limited to 500 characters and names to 60. Links in wishes are shown as plain text. The admin can hide or delete any wish.
- **Free-tier limit reached** (storage space, monthly transfer or requests). Uploads are refused with a clear message, and invitations already live keep working as long as the provider allows. The admin sees usage before this happens (US3 scenario 6).
- **Upload of a very large original photo on a slow phone connection.** Photos are compressed on the admin's device before upload, so the upload is small.
- **Admin forgets their password.** Out of scope; reset is done by the site owner changing the stored credential in the service settings (see Assumptions).
- **Couple forgets their passcode.** They contact the admin, who reads it from the dashboard or sets a new one.
- **Couple shares the passcode with family.** Allowed; anyone with the passcode can create links and see responses for that couple only.
- **Someone tries all 10,000 passcodes.** The 5-attempt / 15-minute pause makes this take weeks, and the admin sees a warning on the couple when the page has been paused repeatedly.
- **Couples imported from a 002 backup** have no passcode. A random one is set on import, and the dashboard shows it.
- **Guest opens an old link with `inv` and `t` options.** These keep working, unchanged from 001/002.

## Requirements *(mandatory)*

### Functional Requirements

**Shared online storage**

- **FR-001**: All couple data, media and guest responses MUST be kept in one online storage service shared by the public address and the admin address. Browser storage MUST no longer be the place where couples are kept.
- **FR-002**: A couple published or edited in the admin MUST be visible at its public address on any device without a redeploy or code change.
- **FR-003**: The public address MUST only be able to read published (Aktif) couples. Draft couples' content MUST NOT be sent to guests.
- **FR-004**: The screens built in 002 MUST keep their behaviour. Only the data layer behind them is replaced. The "preview phase" notice from 002 (FR-019) MUST be removed.
- **FR-005**: The service MUST keep refusing a save when the couple changed since it was opened (existing conflict warning), across devices.

**Access control**

- **FR-006**: Every request that creates, changes, publishes, deletes or uploads data, and every request that reads drafts or guest responses, MUST be refused unless it comes from a logged-in admin. One exception: a browser unlocked with a couple's passcode may read **that couple's own** content (including while in Draf) and guest responses, read only (FR-010b, FR-019). This MUST be enforced by the online service, not only by the screens.
- **FR-007**: The admin's password MUST be stored in a form that cannot be turned back into the password.
- **FR-008**: A login MUST last at most 7 days, MUST end on "Keluar", and MUST NOT be readable by page scripts on the public address.
- **FR-009**: The 5-failures/1-minute login pause from 002 MUST be enforced by the service.
- **FR-010**: The service MUST only accept browser requests coming from the public address and the admin address (plus local development addresses).

**Send-invitation passcode**

- **FR-010a**: Each couple MUST have a 4-digit passcode for its send-invitation page. A random one is suggested on creation (and on import from a 002 backup). The admin MUST be able to view, change and copy it, together with the page link, as a ready-to-send message.
- **FR-010b**: The send-invitation page MUST show only a passcode screen until the correct passcode is entered. The link generator and guest responses MUST NOT be sent to the browser before that. This MUST be enforced by the online service.
- **FR-010c**: A correct passcode MUST unlock the page on that browser for 30 days. Changing the passcode MUST end all existing unlocks for that couple.
- **FR-010d**: After 5 wrong passcodes for one couple, entry MUST be paused for 15 minutes, enforced by the service. The admin MUST see a warning on a couple whose page was paused 3 or more times in a day.
- **FR-010e**: Guest invitation links MUST NOT require or contain the passcode.

**Media**

- **FR-011**: Uploaded photos and music MUST be stored online and load from addresses that work on both the public and admin address.
- **FR-012**: Photos MUST still be resized and compressed before upload (002 FR-015). Upload limits from 002 (30 gallery photos, music 10 MB per couple) MUST be enforced by the service too. The 10 MB limit on photos before compression is checked on the admin's device; the service enforces 10 MB on each file it receives.
- **FR-013**: When media is removed, replaced, or its couple is deleted, the files MUST be removed from online storage.
- **FR-014**: The dashboard MUST show how much of the free media quota (storage plus delivery) has been used, with a warning at 80% or more.
- **FR-015**: A failed upload MUST be retryable per file, and a couple MUST NOT be saved referencing a file that failed to upload.

**Guest responses**

- **FR-016**: The service MUST save RSVPs (name, attending or not, number of people 1–5, time) and wishes (name, message, time) per couple, only for published couples.
- **FR-017**: A repeated RSVP from the same browser for the same couple MUST replace the earlier one.
- **FR-018**: Every guest MUST see all visible wishes for the couple, newest first, loaded in pages of 20.
- **FR-019**: The admin MUST be able to view each couple's RSVPs with totals, download them as a spreadsheet file, and view, hide and delete wishes. The couple MUST be able to view their own RSVPs (with totals and spreadsheet download) and wishes on their unlocked send-invitation page, read only.
- **FR-020**: Response submissions MUST be rate-limited (5 per browser per couple per 10 minutes) and length-limited (name 60, message 500 characters). Wishes MUST be displayed as plain text.

**Moving data and backups**

- **FR-021**: The admin MUST be able to restore a 002 backup file into online storage, choosing per conflicting address name to skip, replace or keep both. A rerun MUST NOT create duplicates.
- **FR-022**: The sample couple (Anisa & Raka) MUST exist online at `/anisa-raka` after first setup.
- **FR-023**: The admin MUST be able to download a full backup (couples, media, guest responses) and restore it into empty online storage.

**Reliability**

- **FR-024**: When the online service is unreachable or slow, guests MUST see a loading state and then a friendly retry message, never a blank page. The admin MUST see a clear error and keep unsaved edits.

**Cost**

- **FR-025**: Every hosted service used (website hosting, server, database, media storage) MUST be usable on a free plan at the scale stated in Assumptions, without requiring paid add-ons.

### Key Entities

- **Admin**: the single site owner. Has an email, a password stored in non-reversible form, and failed-login tracking.
- **Admin session**: proof that the admin has logged in. Expires after at most 7 days or on log out.
- **Couple**: as defined in 002 (address name, Draf/Aktif status, default theme, full invitation content, version for conflict detection, created and updated times). Now stored online.
- **Send-invitation passcode**: a 4-digit code belonging to one couple, viewable and changeable by the admin, with failed-attempt tracking and pause state.
- **Couple access**: proof that a browser entered the couple's correct passcode. Lasts 30 days and ends when the passcode changes.
- **Media file**: an uploaded photo or music file owned by one couple. Has its type, size, dimensions (photos), description and order (gallery), and a public address where it loads.
- **RSVP**: one guest's attendance response for one couple: name, attending or not, number of people, submitted time, and a browser marker used to replace repeat submissions.
- **Wish**: one guest's message for one couple: name, message, submitted time, and visible/hidden state.
- **Backup file**: one downloadable file holding couples, media and guest responses, restorable into online storage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A couple published in the admin can be opened at its public address on a device that has never opened the admin, within 10 seconds of pressing publish, with no redeploy.
- **SC-002**: 100% of attempts to change data without an admin login are refused, including requests sent directly to the service rather than through the dashboard.
- **SC-003**: A published invitation's first screen appears within 3 seconds on a typical 4G phone connection when the service is awake, and within 10 seconds after a quiet period when free services may be asleep.
- **SC-004**: A guest's RSVP or wish is visible to the admin within 10 seconds of submitting, and survives refresh.
- **SC-005**: Restoring a 002 backup brings back 100% of its couples and photos online, with content, status and photos unchanged.
- **SC-006**: Running the service costs nothing per month at the scale in Assumptions.
- **SC-007**: The admin can perform every task from 002 (create, edit, upload, preview, publish, duplicate, delete) in the same number of steps as before.
- **SC-008**: After deleting a couple, none of its files remain in online storage.
- **SC-009**: A couple receiving the page link and passcode can unlock their send-invitation page and share their first personal guest link in under 1 minute.
- **SC-010**: 0 guest names, responses or link-generator content are visible on a send-invitation page before the correct passcode is entered.

## Assumptions

- **Scale.** Up to about 30 couples stored at once, up to 10 published at a time, about 300 guests per couple, and a few thousand invitation visits per month. Each couple uses at most about 30 MB of media after compression.
- **Free plans.** Free plans of hosted services can change, cap usage, or pause inactive projects. This is acceptable for a learning project, mitigated by backups (US7) and by choosing services that wake up automatically when visited. Some free plans restrict commercial use; if the admin starts charging couples, plans must be reviewed.
- **Media addresses.** Media files load from addresses that are long and hard to guess but not secret. Drafts' photos are not listed anywhere public. Stronger media privacy is out of scope.
- **Passcode strength.** A 4-digit passcode is a convenience lock, not strong security. Combined with the attempt pause, it is enough to keep guest names and responses away from casual visitors who find the link. Because the admin must be able to read it back to the couple, it is stored so the admin can view it; it is never shown on the public site.
- **Couples still don't have accounts.** The passcode is per couple, not per person. There is no couple login, email or password reset; the admin manages passcodes.
- **One admin.** Still a single admin account. Password reset is done by the owner updating the stored credential; no reset email flow.
- **Login rules.** Same email and password approach as 002, now checked by the service.
- **RSVP identity.** Guests do not log in. "Same guest" means the same browser on the same couple; a guest switching devices may create a second RSVP, which the admin can delete.
- **Guest count.** 1–5 people per RSVP, matching the existing form.
- **Unchanged parts.** Themes, invitation layout, the send-invitation page's link generation, `inv`/`t` link options and the landing page stay as in 001/002.
- **Old browser data.** After this feature, the dashboard no longer reads couples from browser storage. Existing data is moved once through a backup file (US6).
- **Local development.** The whole system, including online storage, can be run on one computer for development and testing, without using the production data.
- **Technology choices** (database type, media storage provider, server hosting) are decided in planning (`/speckit-plan`), under the cost constraint in FR-025.
