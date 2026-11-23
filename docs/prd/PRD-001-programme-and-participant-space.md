# PRD-001 — Public programme, interest flow and participant space


|         |                                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | Draft — for stakeholder sign-off                                                                                                                                      |
| Date    | 2026-09-30                                                                                                                                                            |
| Related | [PRD-002](PRD-002-admin-app-and-programme-management.md), [ADR-002](../adr/ADR-002-authentication-per-audience.md), [ADR-003](../adr/ADR-003-programme-data-model.md) |


## 1. Context

Stakeholder feedback on the current site:

- The home page is too long. The "Programme FIF 2026" section lists all three days in full.
- To register interest, a visitor has to find "Participer" in the navbar. On mobile this is not discoverable.
- After registering, participants cannot see or change what they picked.
- The programme is hard-coded in the web app. Nobody can change it without a deploy.



## 2. Goals

1. A **short home page**: the programme shows one day at a time, collapsed, with animated day switching.
2. **Register interest where the sessions are shown**: from a day on the home page, a modal opens. The visitor picks sessions for that day and the following days, then submits once. No detour through the navbar, no toggles on the page itself.
3. A **participant space**, accessed with e-mail + one-time code (OTP) only. There, a participant sees their days and sessions as a list and as a calendar, and can add, cancel or request sessions.
4. **Sessions with different access rules**: open, on approval (request → wait → accepted or declined), or informational only.
5. **Programme changes made by admins appear in the participant space**, clearly marked, with a notification.



## 3. Non-goals (this release)

- Paid ticketing, payments, invoices.
- Live streaming (tracked separately; the stream feature is announced in the QA guide).
- Native mobile app. The web experience must be excellent on mobile instead.
- Personal agenda export to Google/Outlook: nice to have, see §9.



## 4. Personas


| Persona                                          | Needs                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Visitor** (mobile, often on a slow connection) | Understand the 3 days in seconds; pick what interests them; done in under 2 minutes. |
| **Participant** (registered by e-mail)           | Find their programme again, see changes, add or cancel sessions, show their badge.   |
| **Innovator / Organization** (password account)  | Same programme features as a participant, inside their existing space.               |




## 5. User stories and acceptance criteria



### 5.1 Compact programme on the home page

**As a visitor, I see a compact programme and can open a day to see its sessions.**

- The section shows a **day switcher** ("Jour 1 · 25 nov", "Jour 2 · 26 nov", "Jour 3 · 27 nov") styled as notebook tabs. It is sticky within the section on mobile.
- Switching day plays a **page transition**: a horizontal slide or page-turn, 250–350 ms. It uses the View Transitions API, falls back to a CSS transform, and is disabled under `prefers-reduced-motion`. Swiping left or right switches day on touch devices.
- Each day shows its **theme line** (e.g. "Inspirer • Découvrir • Connecter"). Sessions appear as **collapsed rows**: time, title, room, type chip. Tapping a row expands its description and speakers (accordion, one open at a time).
- By default only **Day 1** is visible. The section is at most ~1 screen tall on mobile before a row is expanded.
- Sessions come from the API (`GET /programme`). Cached and server-rendered for SEO. Private or unlisted sessions never appear (see ADR-003).
- Cancelled sessions stay visible, struck through, labelled "Annulé", so nobody shows up for a session that no longer exists.
- The page itself is **read-only**: no toggles or checkboxes on session rows. Each day panel ends with a primary button **"Participer"**, which opens the registration modal (§5.2) on that day. Sessions that need approval show a lock and "Sur validation" as information only.



### 5.2 Register interest in a modal

**As a visitor, I choose my sessions across all days in one modal and submit once, without leaving the home page.**

- **Opening**: "Participer" on a day opens the modal **on that day**. The navbar "Participer" link opens it on Day 1. On mobile the modal is a full-screen sheet; on desktop, a centred dialog (max ~720 px wide).
- **Step 1 — Sessions**:
  - Day tabs inside the modal (J1 · J2 · J3), with the same page transition as the home page. The visitor moves to the next days without closing anything.
  - Each tab shows a count of what is selected on that day.
  - Every session is a selectable row:
    - **Open** → checkbox "Je participe".
    - **On approval** → checkbox "Demander à participer", lock icon, hint "Sur validation — l'organisation confirmera".
    - **Informational** (breaks, village, meals) → shown greyed, not selectable.
  - Selecting sessions that overlap in time shows an inline notice ("Se déroule en même temps que …"). It is a warning, not a block.
  - Footer, always visible: "5 sessions · J1, J3" + "Continuer" (disabled until at least one session is selected).
- **Step 2 — Details**:
  - E-mail, then first name, last name, postnom, city, WhatsApp, and optional organization — the same fields the badge uses.
  - "Retour" goes back to step 1 with the selections intact.
- **Step 3 — Code**:
  - A **6-digit code** is sent to the e-mail; the visitor enters it in the modal.
  - Auto-advance between digits, paste support, "Renvoyer le code" after 30 s, "Modifier l'e-mail" back to step 2.
- **Submission happens once**: the code confirms the e-mail and saves everything in a single request — identity, and all selected sessions across all days.
- **Becoming a participant**: a visitor becomes a participant **only when the code is confirmed**. Until then nothing is stored server-side — only the draft in the browser. An abandoned or failed code leaves no account, no registration, no badge.
- **Step 4 — Done**:
  - Badge QR on screen, "Un e-mail de confirmation vous a été envoyé", and a link to "Mon espace".
  - The summary lists each session with its status: "Inscrit", "Demande envoyée", or "Liste d'attente".
  - Secondary button **"Inscrire une autre personne"**:
    - signs this device out;
    - restarts the modal at step 1 with the **same sessions pre-selected** (editable) and blank details;
    - the friend then receives their own code by e-mail. They must be present or send the code over, which proves consent and a valid address.
- **Signed-in device**: when the modal opens on a device that is already signed in, it skips details and code, and shows at the top "Connecté en tant que awa@… · **Pas vous ?**". "Pas vous ?" signs the device out and restarts the modal blank, keeping the selected sessions.
- **Existing e-mail**: if the e-mail already has a space, step 2 asks for the e-mail only. After the code, the new selections are **added** to the existing ones ("Vos sélections ont été ajoutées à votre programme").
- **Closing with unsaved input**: closing by the × button, Escape, backdrop click, or the phone's back button shows a confirmation:
  - Text: "Quitter l'inscription ? Vos sélections et informations seront perdues."
  - Buttons: "Continuer mon inscription" (default focus) · "Quitter".
  - Nothing selected yet, or already on the success step → the modal closes directly.
- **Accidental loss is prevented**: while the modal is open, the draft (selections + typed fields, never the code) is kept in `sessionStorage`. A reload or a trip to the mail app on mobile reopens the modal where the visitor left it. Choosing "Quitter" or completing the flow clears the draft.

### 5.3 Participant space — access

**As a participant, I enter my space with only my e-mail and a code.**

- Route `/mon-espace`. Screen 1: e-mail. Screen 2: 6-digit code.
- The code is valid **10 minutes**, allows **5 attempts**, and is rate-limited per e-mail and per IP (ADR-002).
- The session lasts **30 days** on that device, so returning participants rarely need a new code.
- An unknown e-mail gets the same "code envoyé" screen, so the flow never reveals who is registered. No code is actually sent in that case, which saves quota.
- "Se déconnecter" is always available, both in the participant space and in a small account menu in the site header ("Mon espace", "Se déconnecter"). It is shown only when signed in, and matters on shared phones.
- Only one person is signed in per browser. Registering several people from one phone is done in turn, with "Inscrire une autre personne" or "Pas vous ?" (§5.2). Group registration — one person entering several attendees — is out of scope.



### 5.4 Participant space — my programme

**As a participant, I see my selected days and sessions, and changes to them.**

- **List view (default)**: grouped by day, then chronological. Each item shows time, room, title and status:
  - `Inscrit` (open session, confirmed)
  - `En attente de validation` (approval requested)
  - `Accepté` (approval granted; behaves like Inscrit)
  - `Refusé` (with the optional admin note)
  - `Liste d'attente` (capacity reached)
  - `Annulé par l'organisation` (session cancelled)
- **Calendar view**: day switcher plus a vertical time grid (08:00–22:00) with the participant's sessions as blocks. Overlapping blocks sit side by side. Tapping a block opens the session details. Same animation as the home page.
- **Changes are visible**: if an admin moved, re-timed, re-roomed or cancelled a session the participant holds, the item shows a "Modifié" badge with before → after ("10:00 → 11:00, Salle B"). The badge stays until seen. An in-app notification is created (bell, same component as today).
- **Browse and add**: a "Tout le programme" tab lists all public sessions. "Ajouter des sessions" opens the same modal as the home page, skipping details and code because the participant is already signed in. Sessions they already hold are shown as selected.
- **Cancel**: "Me désinscrire" asks for confirmation. It frees the seat and promotes the waitlist (PRD-002 §5.5). A pending request can be withdrawn.
- **Badge**: the QR badge is always reachable from the space and downloadable.
- **Profile**: city and WhatsApp can be edited. The e-mail cannot, because it is the login; changing it means contacting the organizers.



### 5.5 Innovators and organizations

- The existing innovator and organization spaces gain the same **"Mon programme"** page (list + calendar + browse), backed by the same API.
- Login for them stays e-mail + password (ADR-002).



## 6. Notifications to participants


| Event                                | In-app        | E-mail                                   |
| ------------------------------------ | ------------- | ---------------------------------------- |
| Registration confirmed (first time)  | ✓             | ✓ (with badge)                           |
| Approval request accepted / declined | ✓             | ✓                                        |
| Promoted from waitlist               | ✓             | ✓                                        |
| Session time/room changed            | ✓             | ✓ daily digest, max 1 per day per person |
| Session cancelled                    | ✓             | ✓ immediate                              |
| Title/description edits              | ✓ ("Modifié") | ✗                                        |


E-mail volume is budgeted in ADR-002.

## 7. UX and quality bar

- Mobile first. Tested at 360 px width, on a mid-range Android phone over a throttled 3G profile.
- **The public website stays light**:
  - The home programme is server-rendered HTML plus a small day-switcher script.
  - The registration modal, OTP handling and participant space are **lazy-loaded** on first use, never in the initial bundle.
  - Admin code is not in the site at all (ADR-001).
  - Calendar views load only in `/mon-espace` (ADR-004).
  - Targets: the initial JS bundle does not grow compared with today; Lighthouse mobile performance ≥ 90; no layout shift when switching day.
- All interactions work by keyboard. Focus is trapped in the modal and returns to the triggering button on close. Every icon-only control has an ARIA label.
- French only for this release. Dates and times shown in **Kinshasa time (UTC+1)** regardless of device timezone.



## 8. Success metrics

- ≥ 60 % of registrations start from the home programme, not from the navbar (tracked via a `source` field on the registration).
- Median time from first tap to confirmed registration < 2 minutes.
- < 2 % of OTP attempts end in "code expired / too many attempts".
- Zero "I can't find my programme" support requests handled manually.



## 9. Open questions for stakeholders

1. **Private sessions**: should they be listed publicly with a lock ("sur demande"), or hidden completely (invite only)? Proposal: support both — `Sur validation` is listed, `Sur invitation` is hidden (ADR-003).
2. **Required fields at interest time**: keep all badge fields (name, postnom, city, WhatsApp), or only e-mail + name and complete later? Proposal: keep them, because the badge needs them.
3. **Capacity**: which sessions have a hard seat limit (masterclasses, Innovators Night)?
4. **Rooms ("spots")**: the list of rooms/stages and their capacities.
5. Calendar export (.ics) for participants: wanted for this release?

