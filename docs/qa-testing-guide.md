# QA testing guide — FIF 2026

Flows to test by role, plus what's coming next and the security checks that matter most. All scenarios below were
run and verified against a live instance while writing this doc (programme flows: 61 automated API checks plus a
browser pass on the console calendar, editor and requests).

## Coming soon (not built yet — don't file bugs for it)

We're adding a **stream feature**: innovators who can't be in Kinshasa physically will be able to showcase their
solution remotely (livestream or submitted video, shown alongside on-site presentations). Not implemented yet —
mentioned so it's on your radar for the next pass, not something to test now.

## Setup

- Admin login: on the **organizer console**, a separate app served at `https://festival.fikiri.co/admin` (local: `http://localhost:4300`, `pnpm dev:admin`). Credentials are `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the server's `.env` (defaults to `admin@fikiri.cd`). Non-admin accounts are refused there, even with a valid password.
- Innovator/organization accounts: self-service, create your own via the register pages.
- Committee/volunteer applicants: no account needed, form-only.
- API reference: `/openapi.json` on the running server (or the Scalar docs UI at `/reference`).

## Flows to test

### 1. Public site
- Landing page sections (Concept, Expériences, Programme, Impact) render.
- `/speakers` — directory loads, photos/bios display, empty state if none exist.

### 2. Committee / volunteer application (no login)
- `/applications/committee` and `/applications/volunteer` — pick a role, fill identity + contact + short
  motivation, submit. Confirm the success state, and that reopening the form in the same browser shows "already
  applied". This is a per-browser guard only: the server does not reject a second submission with the same email.
- Word-limited motivation field rejects over-length text server-side, not just client-side.

### 3. Programme and participant registration (home page, no password)
- **Home programme** (`/#programme`): compact, one day at a time. J1/J2/J3 tabs slide; on a phone, swipe left/right.
  Rows expand on tap. Sessions sharing a slot fold into one row ("9 sessions en parallèle"). No checkboxes on the page.
- **"Participer"** (per day, header, or `/?participer=1`; old `/applications/participant` redirects here) opens the
  registration modal on that day:
  - Day tabs inside the modal, with a count per day. Breaks/village rows can't be ticked. Overlapping picks show a
    "Se déroule en même temps que…" warning but are allowed. "Sur validation" sessions become requests.
  - New e-mail → identity form → 6-digit code → done screen with the badge QR and a status per session
    ("Inscrit(e)", "Demande envoyée", "Liste d'attente").
  - Known e-mail → no identity form; after the code, the done screen lists **all** sessions, the new ones tagged
    "Nouveau", with "Modifier mes choix".
  - Nothing is saved before the code: abandon at the code step and check no account or registration exists.
  - Wrong code → error, field clears. "Renvoyer le code" is available after 30 s. A 4th code request for the same
    e-mail within 10 minutes is refused ("Trop de demandes de code").
  - Closing with something selected (×, Escape, click outside, phone back button) asks "Quitter l'inscription ?".
    A page reload restores the draft (never the code).
  - Signed-in device: header shows "Connecté en tant que… · Pas vous ?". Already-held sessions are ticked and
    counted; untick to remove, tick to add, then Confirmer (no code). "Pas vous ?" signs out and continues as a guest.
  - Done screen: "Inscrire une autre personne" signs the device out and restarts with the same sessions pre-ticked.
- **Local testing**: without `RESEND_API_KEY` the code is printed in the API terminal (`[dev] Code de connexion…`).
- `/applications/badge` still reprints badges of people who registered with the old form.

### 3b. Participant space (`/mon-espace`)
- Signed out: e-mail → code. An unknown e-mail gets the same "code envoyé" screen but no code is sent.
- People registered with the old form log in with their e-mail: their earlier activity picks appear as sessions.
- "Mon programme": list (by day, with statuses) and calendar (day tabs, overlapping sessions side by side).
  "Me désinscrire" / "Retirer ma demande" asks to confirm. A freed seat goes to the first person on the waiting list.
- Sessions changed by the organizers show "Modifié · 10h00 → 11h00…" until "J'ai compris".
- Badge (download), contact details (city/WhatsApp editable), sign out.
- "Vous avez un projet ?" → "Présenter mon projet" → confirm: the account becomes an innovator (same badge, same
  programme, profile pre-filled) and lands on the new-project form.
- Innovators and organizations have the same "Mon programme" page in their own space.

### 4. Admin reviews an application → badge email
- Sign in as admin → **Candidatures** → open one → set status to **Sélectionné**.
- This is the only status change that issues a badge: confirmed a `COMMITTEE`/`VOLUNTEER` badge is created only
  on the RECEIVED→SELECTED transition, and re-saving SELECTED again does not create a duplicate.
- See **Email limitation** below for what you can actually observe here.

### 5. Innovator space (`/innovateur/...`)
- Register → lands on **Aperçu** (overview), not the raw profile form.
- Overview shows: badge/QR, project counts, unread notifications, a "complete your profile" nudge until name/city/
  phone are filled.
- Create a project, edit it, upload a pitch video (video files only, ≤ 200 MB — confirmed a non-video file is
  rejected server-side, not just by the file picker's `accept` filter).
- Badge QR is downloadable as a PNG from the overview page.

### 6. Organization space (`/organisation/...`)
- Same shape as innovator: register → **Aperçu** → complete profile → create/edit a fiche de besoin → badge visible.

### 7. Admin: content & marketplace
- Speakers: one form for everything — photo (image only, ≤ 5 MB), name, title, bio, contact email, participation
  days — saved in a single step. Edit and delete too. Confirm the public `/speakers` page reflects changes
  immediately and **never shows the contact email**.
- Marketplace: needs and projects lists/detail pages load and match what organizations/innovators submitted.
- Marketplace lists show the organization/innovator name, French status labels (not `DRAFT`/`DISCUSS`), and a
  proper empty state when there is nothing to list.
- Dashboard stats: organization/innovator/participant counts and application counts match actual DB state.
- Table pagination text is in French ("1 – 4 sur 4") on every admin list.

### 7b. Admin: programme (console `/programme`, `/programme/demandes`, `/programme/salles`)
- **Calendar**: day tabs (red dot = day with conflicts), one column per room plus "Sans salle", 08:00–23:00.
  Cards show type colour, time, sign-ups ("registered/seats"), pending requests, 🔒 (on approval), crossed eye
  (invite only), red ⚠ on conflicts. Search and filters (pending requests, conflicts). List view on phones.
- **Mouse**: drag a card to change time and/or room; drag its bottom edge to change duration (15-min snap);
  click an empty slot to create a session there. The toast says when registrants were notified.
- **Conflicts**: same speaker or same room at the same time, or capacity below current sign-ups, are blocking —
  the editor needs "Je confirme malgré le conflit"; a drag shows a red banner "Confirmer quand même / Annuler"
  and puts the card back if cancelled. Parallel sessions are information only.
- **Editor** (right panel): title, type, room, day, start/end with duration shortcuts, speakers, description,
  access (Ouvert / Sur validation / Libre), visibility (Publique / Sur invitation), seats + waiting list.
  "N inscrit(s) seront prévenus" appears before saving a change that affects them.
  Tabs: Participants (add by e-mail — the only way into invite-only sessions —, remove, CSV) and Historique.
  Duplicate, cancel with a reason (registrants e-mailed), reschedule, delete (only with nobody registered).
- Two admins editing the same session: the second save is refused ("modifiée entre-temps"), never overwritten.
- Lowering seats below sign-ups (confirmed) moves the latest sign-ups to the waiting list.
- **Demandes**: pending requests grouped by session; accept/refuse per person or for a selection; a refusal can carry
  a message, which the person sees in their space. Accepting into a full session puts them on the waiting list.
- **Salles**: add, rename, capacity, colour. A room still used by sessions can't be deleted.
- Invite-only sessions never appear on the public site or in the registration modal.

### 8. Admin: check-in desk (console `/checkin`)
- **Scan path**: scan a newly issued badge with a phone camera → it opens the console's `/checkin?code=…` and runs the
  lookup by itself. Logged out, it must send you to login rather than show anything.
- **Manual path**: type or paste the code — or the whole scanned link — and press Vérifier.
- Either way the holder's name, email, type and email status show before anything is confirmed.
- Badges issued before this change carry a bare code, not a link: they only work through the manual path.
- Confirm entry → shows success, appears in the "recent" list.
- Confirm the same badge again → shows "already checked in", does not error or double-count.
- Invalid/garbage code → clear "not found" message, no crash.
- "Envoyer / Renvoyer l'e-mail" on the badge card re-sends the badge email (see **Email limitation**).
- USB/Bluetooth scanners that type the decoded text + Enter work through the manual path — worth testing with a
  real device once available.

### 9. Admin: participants (console `/participants`)
- Lists every participant registration with contact, chosen days (J1–J3) and whether the badge email went out.
- The counters at the top match the rows; "e-mails en attente" counts only the current page.
- "Envoyer l'e-mail" / "Renvoyer" on a row: with a Resend key the status flips to **Envoyé**; without one you get
  a clear "not sent" error and the status stays **Non envoyé**.
- Empty state shows when nobody has registered.

### 10. Admin: broadcast (console `/diffusion`)
- Audiences show their address count; an audience with zero addresses can't be selected. Speakers only count if
  a contact email was entered for them.
- Select several audiences, write subject (≥ 3 characters) and message (≥ 10), press Envoyer → a confirmation
  step shows the recipient count before anything is sent. Annuler backs out without sending.
- Someone present in two selected audiences receives one email. Each email opens with "Bonjour [name],".
- After a full success the form resets; on partial or total failure it keeps your text and says how many failed.
- **Use test addresses only.** This sends real email to real people once a Resend key is configured.

## Cross-role access (confirm in the UI, not just the API)

All of the below return the right HTTP status server-side (401/403) — that's the actual security boundary. Please
also confirm the UI doesn't flash any data before redirecting:

- Logged out → any console page redirects to the console login, keeping the deep link (`/connexion?redirect=…`); no data is visible first.
- `festival.fikiri.co/admin/...` links (including badges printed earlier) open the console directly. Locally, `localhost:4200/admin/...` forwards to the console dev server on 4300.
- **⌘K / Ctrl+K** in the console opens quick navigation; every page and the main actions are reachable from it.
- Innovator session → any `/organisation/*` page: redirected to "Accès refusé". Signing in to the console with an innovator account is refused and leaves no session open.
- The API only accepts cross-origin calls from the website and console origins (CORS allow-list). Admin sessions expire after 8 hours. Sign-in is limited to 5 attempts per minute in production.
- Organization session → any `/innovateur/*` page: redirected to "Accès refusé".

## Email limitation for this test pass

**Login codes without Resend**: while `RESEND_API_KEY` is not set, every login code is the fixed `123456`
(`OTP_FALLBACK_CODE` to change it) and the code screens say so. **This is a temporary launch measure: anyone who
knows an attendee's e-mail can open their space and badge.** Setting the key (and restarting the API) switches to
random e-mailed codes immediately.
Programme e-mails: cancellations and request decisions are e-mailed; time/room changes only reach people in their
space (no daily e-mail summary yet).


Badge emails and broadcasts go out via Resend, which needs a live API key. Until `RESEND_API_KEY` is set on the
server, sending is skipped — registration and status changes still succeed, and the badge is marked "e-mail non
envoyé". Once the key is set, a badge email is retried automatically the next time its holder opens their badge,
or manually from the participants list or the check-in desk. Actual delivery has not been tested yet: confirm the
key is configured before testing it rather than filing it as a bug.

Resend's free plan allows 100 emails a day. A broadcast larger than that will partly fail until the plan is
upgraded. Broadcasts are not logged anywhere — there is no history of what was sent.

## Security considerations

- **Badge tokens are never returned in any API response** — check-in verify/confirm/list and the holder's own
  "my badge" view all return the rendered QR image only, never the underlying token. If you ever see a raw
  `token` field in a response, that's a regression — report it immediately.
- **The badge link contains the token.** The QR on new badges is a link to the check-in page with the token in
  `?code=`. It is useless without an admin session (confirm a logged-out or non-admin user gets nothing), but it
  will sit in the scanning device's browser history — check-in devices should be staff devices.
- **Speaker contact emails are admin-only** — the public speakers endpoint must never include them.
- **Broadcast is admin-only** and its input is length-limited and HTML-escaped; confirm a message containing
  `<script>` or HTML arrives as plain text.
- **Role checks are server-side**, enforced independently of the UI (confirmed by calling the API directly with
  the wrong role's session cookie). The frontend route guards are a UX convenience, not the security boundary.
- **File uploads are validated by content type server-side**, not just by the `<input accept>` filter, which
  users can bypass trivially.
- **Session cookies are httpOnly** (Better Auth default) — confirm devtools/JS cannot read the session cookie.
- **E-mail codes**: 6 digits, valid 10 minutes, 5 attempts, stored hashed. Better Auth's own code endpoints are
  blocked (404) — codes are only sent through `/programme/interest` and `/participant-auth/request-code`, which
  rate-limit per e-mail and per IP and never send a code to an unknown e-mail on the login screen.
- **Seat counting is race-safe**: concurrent sign-ups on a session with seats lock the session row, so it cannot be
  overbooked; worth a quick parallel test with a 1-seat session.
- **Admin accounts are provisioned only via `ADMIN_EMAIL`/`ADMIN_PASSWORD`** at server boot — there's no in-app
  staff invite flow yet, so admin access changes currently require an env/deploy change.
