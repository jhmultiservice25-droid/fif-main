# PRD-002 — Admin app and programme management


|         |                                                                                                                                                                                                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | Draft — for stakeholder sign-off                                                                                                                                                                                 |
| Date    | 2026-09-30                                                                                                                                                                                                       |
| Related | [PRD-001](PRD-001-programme-and-participant-space.md), [ADR-001](../adr/ADR-001-separate-admin-app.md), [ADR-003](../adr/ADR-003-programme-data-model.md), [ADR-004](../adr/ADR-004-calendar-ui-build-vs-buy.md) |




## 1. Context

Admin screens currently live under `/admin` inside the public website (same bundle, same domain). Stakeholders want:

- A **separate admin application**, for admins only.
- **Full programme management**: a calendar of the three days, where admins create, move and re-time sessions, set access rules, and handle participation requests.

The seeded programme (today's three days) is the starting point. Admins change it from there.

## ~~2~~. Goals

1. A standalone **admin app** on its own subdomain, holding every existing admin feature plus programme management.
2. A **calendar view** of the festival: day × room. Drag to move, resize to re-time. Beautiful and usable on desktop and mobile.
3. **Conflict awareness**: the admin always sees overlaps (same speaker, same room, parallel sessions) and must acknowledge blocking ones explicitly.
4. **Access control per session**: open, on approval, informational; public, on request, or invite only; optional capacity with waitlist.
5. A **requests inbox**: see who asked to join, approve or decline one by one or in bulk, with an optional note.
6. **Every change propagates** to participants (PRD-001 §5.4 and §6) and is kept in an audit trail.



## 3. Non-goals

- Multi-event / multi-tenant support (FIF 2026 only).
- Fine-grained admin roles (one `ADMIN` role for now; see §8).
- Recurring sessions.



## 4. Admin app scope

Moved as-is from the web app, then removed from it:

- Statistiques
- Candidatures (committee/volunteer)
- Participants (list, e-mail retry)
- Diffusion e-mail
- Marketplace (fiches de besoin, projets)
- Speakers
- Contrôle d'accès (scan deep link: the badge QR will point to the admin domain)
- Notification bell

New: **Programme** (this PRD), **Salles**, **Demandes**.

## 5. Programme management — user stories



### 5.1 Calendar view

- **Desktop**: day tabs (J1, J2, J3). Below them, a **time grid** with one column per room, rows 08:00–22:00, 15-minute snapping, a "now" line during the festival.
  - Sessions are cards coloured by type (Plénière, Talk, Masterclass, Atelier, Pitch, Networking, Pause, Soirée, Village).
  - Each card shows title, time, speakers' avatars, and state icons: lock = on approval, eye-off = invite only, seats "32/40", a pending-requests badge.
- **Mobile**: an **agenda list** per day with the same cards, swipe between days, and a room filter chip row. Rooms can also be shown as horizontally scrollable columns.
- **Interactions**:
  - Drag a card to another time or room.
  - Drag the bottom edge to change the duration.
  - Click an empty slot to create a session pre-filled with that time and room.
  - Click a card to open the editor side panel.
  - Keyboard alternative for every drag: the editor has date/time/room fields.
- Filters: type, room, speaker, "has pending requests", "has conflicts".
- **List mode** toggle: a sortable table of all sessions, for bulk review and CSV export.



### 5.2 Create / edit a session

Side panel (desktop) or full-screen sheet (mobile). Fields:

- Title, description, type.
- Day, start, end — or duration presets: 15, 30, 45, 60, 90, 120 min.
- Room.
- Speakers: multi-select from Speakers, with inline "create speaker".
- **Visibility**: Public · Sur invitation (hidden from the public programme; only admins can add attendees).
- **Admission**: Informative (no registration) · Ouverte · Sur validation.
- **Capacity** (optional) + waitlist on/off.
- Status: Programmé · Annulé (with an optional public reason).

Actions: Save, Duplicate, Cancel session, Delete. Delete is only allowed when nobody is registered; otherwise the admin must cancel.

### 5.3 Conflicts

Checked on every save and on drag-drop, **before** the change is persisted:


| Conflict                                             | Severity         | Behaviour                                                           |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| Same speaker in two overlapping sessions             | Blocking         | Save disabled until the admin ticks "Je confirme malgré le conflit" |
| Same room, overlapping sessions                      | Blocking         | Same as above                                                       |
| Capacity lowered below current registrations         | Blocking         | Same as above; overflow moves to waitlist                           |
| Other sessions running at the same time              | Info             | "Se déroule en même temps que : FIKIRI Academy (Salle B)…"          |
| Session outside 08:00–22:00 or ends before it starts | Validation error | Cannot save                                                         |


On drag-drop, a blocking conflict shows the card in a warning state with a confirm/undo toast. The move is not saved until confirmed.

### 5.4 Change propagation

- Any change to time, room, status, admission or visibility of a session with registrants creates a **change record** (who, when, before → after).
- It also notifies the registrants (PRD-001 §6).
- The session editor shows "N participants seront notifiés" before saving.
- Admins can see the **history** of a session.



### 5.5 Requests and attendees

- **Demandes** inbox: all pending requests across sessions, grouped by session, oldest first.
  - Each row: participant name, e-mail, city, organization, requested at, other sessions they hold.
  - Approve / Decline individually or by multi-select. Optional note on decline, shown to the participant.
- When **capacity is reached**, open sessions put new sign-ups on the **waitlist**. When a seat frees up, the first waitlisted person is promoted automatically and notified.
- **Attendees** tab on each session: list, status filter, CSV export, "Ajouter un participant" (the only way into invite-only sessions), remove.



### 5.6 Rooms ("Salles")

CRUD on rooms: name, capacity, order, colour. A room with sessions cannot be deleted, only renamed or merged.

## 6. Security (see ADR-001)

- Separate origin `admin-festival.fikiri.co`. The public bundle contains no admin code.
- API admin endpoints stay role-guarded server-side. CORS is restricted to known origins (today it reflects any origin — to be fixed).
- Admin session lifetime 8 h. Login rate limited. Optional TOTP 2FA for admins (phase 2).
- Audit trail on programme changes and request decisions.



## 7. Quality bar

- Calendar interactions at 60 fps with ~150 sessions on a mid-range laptop.
- Optimistic UI with rollback when the server rejects a move. Two admins editing the same session → the second save gets a clear "modifié entre-temps" message, never a silent overwrite.
- Mobile: every admin action possible at 360 px width, including check-in.



## 8. Open questions

1. Do we need a read-only "staff" role (volunteers at check-in) distinct from full admins?
2. Final list of rooms and capacities (shared with PRD-001 §9).
3. Should declined participants be able to re-request the same session?

