# Build order — programme, participant space, admin app

Everything ships together, in one pass. There are no phased releases. The order below exists only because each step depends on the one before it.

Scope: [PRD-001](prd/PRD-001-programme-and-participant-space.md), [PRD-002](prd/PRD-002-admin-app-and-programme-management.md). Decisions: [ADRs](adr/README.md).

1. **Data model + seed** (ADR-003): rooms, sessions, speakers link, registrations, change log. The current 3-day programme is inserted automatically at API start when the table is empty.
2. **Programme API**:
   - public `GET /programme`;
   - participant endpoints: join, request, cancel, "Modifié" state;
   - admin endpoints: sessions and rooms CRUD, conflict check, requests, attendees, CSV;
   - capacity and waitlist under row locks.
3. **Participant auth** (ADR-002): e-mail OTP sign-up and sign-in, lazy linking of existing registrations, CORS allow-list, admin 8 h sessions.
4. **Public site** (PRD-001): compact programme with animated day switcher, inline selection, bottom sheet with OTP, `/mon-espace` (list + calendar + browse), "Mon programme" in innovator/organization spaces.
5. **Admin app** (ADR-001): second Angular project, all existing admin features moved, programme calendar, requests inbox, rooms. Plus the `/admin` redirect and the deploy workflow.
6. **Verification**: every flow in the browser at 360 px and desktop, and the QA guide rewritten.

## Needed from outside the codebase

- DNS record `admin-festival.fikiri.co → 203.161.53.130` and a Caddy site block (guide provided at deploy time).
- Resend Pro subscription (ADR-002).
- Answers to the PRD open questions. Until they come, the proposals written in the PRDs are used as defaults.
