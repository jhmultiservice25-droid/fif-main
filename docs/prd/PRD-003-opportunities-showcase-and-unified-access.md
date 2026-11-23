# PRD-003 — Opportunities, showcase solutions and unified access

| | |
|---|---|
| Status | Draft — for stakeholder sign-off |
| Date | 2026-10-03 |
| Related | [PRD-001](PRD-001-programme-and-participant-space.md), [PRD-002](PRD-002-admin-app-and-programme-management.md), [ADR-005](../adr/ADR-005-passwordless-access-for-all-attendees.md), [ADR-006](../adr/ADR-006-showcase-solutions-and-presenter-allocation.md) |

## 1. Context

Stakeholder requests (2026-10-02):

1. A simpler header with two menus, **Opportunités** and **Participer**.
2. A public place where donors, institutions, companies and partners **browse projects and solutions, open their details, and contact the owner**.
3. **284 selected solutions**. Innovators choose up to **2** of them to present at the festival, and each solution can have at most **3** presenters, so presentations spread across all 284.

Product feedback from the same review:

- The difference between participants (e-mail + code) and innovators/organizations (password) makes no sense from the outside.
- There is no clear path to register an organization.
- The hero's "S'inscrire au festival" button is broken.

Decisions recorded with the stakeholder:

- The 284 solutions are imported by admins from CSV/XLSX.
- They are a separate catalogue from projects submitted on the site; both are shown, the 284 first.
- Picks can be changed until a deadline.
- Admins can reassign presenters, and every affected innovator is e-mailed.
- Presentations are tied generically to "Demo Show" sessions.
- Contact goes through a relay form, not by publishing e-mail addresses.
- Everyone except admins signs in with e-mail + code.

## 2. Goals

1. **Two-menu header** that says what each audience can do.
2. **Browse projects and solutions**: a public catalogue with detail pages and a contact form relayed to the owner.
3. **Showcase picker**: innovators choose up to 2 of the 284 solutions to present, at most 3 presenters per solution, fair under concurrency.
4. **Showcase admin**: CSV/XLSX import with preview, presenter overview, manual reassignment with e-mail notices, settings (deadline, limits, Demo Show sessions).
5. **One way in for everyone**: e-mail + code. Each profile has a clear entry: participant, innovator or organization.

## 3. Non-goals

- Payments, sponsorship packages, ticket tiers.
- In-app chat between partners and innovators. The contact form relays one message by e-mail; the conversation continues by e-mail.
- Scheduling each presenter into a precise time slot. Presenting is linked to the Demo Show session(s) as a whole.

## 4. Header and entry points

Desktop: logo, Programme, Speakers, **Opportunités ▾**, **Participer ▾**. Mobile: the same two groups as accordion sections in the menu sheet.

| Opportunités | Participer |
|---|---|
| Devenir volontaire → `/applications/volunteer` | S'inscrire à une activité → programme modal (PRD-001) |
| Rejoindre le comité → `/applications/committee` | Mon espace → `/mon-espace` (routes to the right space by profile) |
| Soumettre une solution / un projet → `/rejoindre/innovateur` | Connexion → `/connexion` (e-mail + code); "Se déconnecter" when signed in |
| Publier un besoin (organisations) → `/rejoindre/organisation` | |
| Parcourir les projets et solutions → `/projets` | |

- Each item shows a one-line description under its label (mega-menu style, as on VivaTech and Web Summit), so visitors know what happens before clicking.
- Hero: primary "S'inscrire à une activité" (opens the modal), secondary "Soumettre une solution". This also fixes the broken button.
- Footer: the same two groups.
- Concept, Expériences and Impact stay as sections of the home page, reachable by scrolling and from the footer. They leave the top bar to keep it short.

## 5. Unified access (ADR-005)

- **One account per e-mail, one profile**: Participant, Innovateur or Organisation. Admins are separate and keep their password on the console.
- **One login**, `/connexion` = `/mon-espace` when signed out: e-mail → 6-digit code → the user's space. Existing innovator and organization accounts keep working; they just receive a code instead of typing a password. The password form and the old sign-up choice page are removed (redirected).
- **Onboarding by profile**, each in 3 short steps:
  1. e-mail;
  2. code;
  3. a profile form:
     - `/rejoindre/innovateur`: name, organization (optional), city, phone. Then the innovator space, with "Choisir mes solutions à présenter" and "Soumettre un projet".
     - `/rejoindre/organisation`: organization name, type, sector, city, contact name and title, phone. Then the organization space, with "Publier un besoin".
     - Participant: unchanged, it is the programme modal.
- **Changing profile** from the space:
  - participant → innovator (exists);
  - participant → organization ("Je représente une organisation").
  - Badge and programme are kept.
- Fixed fallback code while `RESEND_API_KEY` is absent (already shipped) applies to everyone.

## 6. Browse projects and solutions — `/projets`

### 6.1 Catalogue

- Two tabs:
  - **Solutions FIF 2026** (the imported catalogue, default tab).
  - **Projets soumis** (innovator projects with status *Soumis* and consent *Identifiée* or *Anonyme*).
- Cards show: name, sector, short summary, city.
  - Solutions also show "Présentée au festival" when they have at least one presenter.
  - Anonymous projects show "Porteur anonyme" and no name.
- Search (name, summary), filters (sector, stage where known), 24 per page, server-side. Server-rendered for SEO, light per PRD-001 §7.

### 6.2 Detail page — `/projets/solutions/:ref` and `/projets/soumis/:id`

- Full description, sector, stage, city, website (solutions), pitch video (projects, if the owner allowed publication).
- Presenters' names (solutions), only once the presenter has agreed to be listed (checkbox when picking, on by default).
- **"Contacter le porteur"** button. Hidden for projects without a contact path. Solutions without a contact e-mail route the message to the FIF team.

### 6.3 Contact form (relay)

- Fields:
  - name;
  - organization;
  - type (Bailleur, Institution, Entreprise, Partenaire, Autre);
  - e-mail;
  - message (20–2,000 characters);
  - consent to share these details with the owner.
- The message is **e-mailed to the owner** with `Reply-To` set to the sender. The owner's address is never shown to the sender.
- The sender gets a copy, and a confirmation on screen.
- Anti-abuse:
  - honeypot field;
  - 3 messages per sender e-mail per hour;
  - 20 per IP per day;
  - links in messages are stripped of HTML.
- Every message is stored. Admins see the list in the console ("Mises en relation"), useful for impact reporting. Owners see received messages in their space.

## 7. Showcase solutions (ADR-006)

### 7.1 Innovator: choose solutions to present

- In the innovator space, **"Mes présentations"**:
  - the catalogue of active solutions with search and sector filter;
  - each row shows the places left ("2 places sur 3", "Complet");
  - full solutions are greyed out and can't be selected.
- The innovator can hold **at most 2**. A counter "1 / 2 solutions choisies" stays visible. Choosing a third is blocked with a clear message.
- Choosing or releasing is instant. Under concurrency, the last place goes to the first confirmed request; the other gets "Plus de place sur cette solution" and the list refreshes.
- Until the **deadline** (admin setting), picks can be changed: release one, take another. After it, the list is read-only with "Choix clôturés le …".
- Holding at least one solution automatically registers the innovator to the **Demo Show** session(s) configured by admins (PRD-001 programme). Releasing all removes that registration, unless they had also registered themselves.
- The innovator's space and badge e-mail mention which solutions they present.

### 7.2 Admin (console → "Solutions FIF")

- **Import** (CSV or XLSX):
  - drag a file;
  - see a **preview**: rows to create, update or deactivate, and errors per line (missing reference or name, duplicate reference, invalid e-mail);
  - then confirm.
  - Columns: `reference` (unique, required), `nom` (required), `resume`, `secteur`, `ville`, `equipe`, `email_contact`, `site_web`. The French or English header names are accepted; a downloadable template is provided.
  - Re-import updates by `reference` and never deletes picks. Solutions missing from a re-import are only deactivated after confirmation; affected presenters are listed and e-mailed.
- **Overview**: table of solutions with presenter count (0–3), filters "Sans présentateur", "Complet", search.
  - A coverage gauge shows "212 / 284 solutions ont au moins un présentateur".
- **Solution detail**: presenters (name, e-mail, chosen at), **add** an innovator by e-mail, **remove**, **move** to another solution.
  - Admin actions may exceed the limits only with an explicit "dépasser la limite" confirmation.
  - Each change e-mails every affected innovator and creates an in-app notification.
- **Settings**:
  - deadline;
  - maximum per innovator (default 2);
  - maximum per solution (default 3);
  - Demo Show session(s) to auto-register presenters into;
  - picker open or closed.
- **Export** CSV of presenters by solution, for the Demo Show running order.

## 8. Notifications

| Event | Who | In-app | E-mail |
|---|---|---|---|
| Innovator picks or releases a solution | that innovator | ✓ | ✗ (on-screen confirmation) |
| Admin adds, removes or moves a presenter | each affected innovator | ✓ | ✓ |
| Solution deactivated by an import | its presenters | ✓ | ✓ |
| Contact form sent | owner (relay) + sender (copy) | owner ✓ | ✓ |
| Deadline in 48 h | innovators holding fewer than 2 picks | ✓ | ✓ (once) |

## 9. Acceptance criteria (summary)

- With 4 innovators racing for the last place on a solution, exactly one gets it. No solution ever has more than 3 presenters through the innovator flow.
- No innovator can hold 3 solutions through the innovator flow.
- Importing the 284-row file twice yields 284 solutions, not 568.
- A partner can find a solution, open it and send a message without an account. The owner receives it with Reply-To set. The owner's address never appears in any public response.
- Every header item leads somewhere useful, signed in or not, on mobile and desktop. The hero CTA works.
- An existing innovator or organization account signs in with e-mail + code and finds its data.

## 10. Open questions

1. Should the presenter names on public solution pages be shown (default yes, with opt-out) or hidden?
2. Deadline date for picks.
3. Exact column names of the stakeholder's 284-row file — the importer accepts both FR and EN headers; a sample file would let us confirm.
