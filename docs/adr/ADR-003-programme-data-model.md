# ADR-003 — Programme data model, access rules and conflicts

| | |
|---|---|
| Status | Proposed |
| Date | 2026-09-30 |
| Deciders | Tech lead |

## Context

The programme is hard-coded twice in the web app: the landing `program.ts` and `participant-program.ts`. Participants' choices are stored as free strings (`selectedDays[]`, `selectedActivities[]`) on `ParticipantRegistration`. We need:

- editable sessions and rooms;
- per-session access rules and capacity;
- registrations with states;
- conflict detection;
- change history that drives participant notifications.

## Decision

### Entities (Prisma, PostgreSQL)

```
Room             id, name, capacity?, color, order
ProgramSession   id, code (unique, stable slug e.g. "d1-ouverture"), title, description,
                 type, startsAt (timestamptz), endsAt, roomId?, visibility, admission,
                 capacity?, waitlistEnabled, status, cancelReason?, version, createdAt, updatedAt
SessionSpeaker   sessionId, speakerId, role?              (PK sessionId+speakerId)
Participant      = ParticipantRegistration + userId (unique, nullable until first login) + source
SessionRegistration
                 id, sessionId, userId, status, note?, requestedAt, decidedAt?, decidedById?
                 unique(sessionId, userId)
SessionChange    id, sessionId, actorId, kind, before (jsonb), after (jsonb), notifiedAt?, createdAt
```

Enums:

- `type`: PLENARY, TALK, MASTERCLASS, WORKSHOP, PITCH, NETWORKING, BREAK, SOCIAL, VILLAGE
- `visibility`: PUBLIC (listed everywhere) · INVITE_ONLY (hidden from public programme and browse; attendees added by admins)
- `admission`: NONE (informational) · OPEN (instant) · APPROVAL (request → decision)
- `status` (session): SCHEDULED · CANCELLED
- `status` (registration): REGISTERED · PENDING · DECLINED · WAITLISTED · CANCELLED

Days are **derived** from `startsAt` in Africa/Kinshasa time (UTC+1, no DST). Festival days are config (`2026-11-25..27`), not a table. All timestamps are stored in UTC.

`ProgramSession` rather than `Session`: Better Auth already owns the `Session` model (login sessions).

### Rules

- **Capacity**: an OPEN sign-up beyond capacity becomes WAITLISTED (or is rejected if the waitlist is off). A cancellation promotes the oldest WAITLISTED person, in the same transaction. Seat counting uses `SELECT … FOR UPDATE` on the session row to avoid overbooking under concurrent sign-ups.
- **APPROVAL** sessions create PENDING registrations. An admin decision sets REGISTERED or DECLINED. Approval also respects capacity.
- **Cancelled session**: registrations are kept, not deleted; participants see "Annulé par l'organisation".
- **Optimistic concurrency**: every session update sends `version`. A stale version gets `409 Conflict` with the current row.
- **Change history**: an update that touches `startsAt | endsAt | roomId | status | admission | visibility` writes a `SessionChange`. A background job, run in-process every 15 minutes (no external queue), turns un-notified changes into in-app notifications and a once-a-day digest e-mail per participant. Cancellations send an e-mail immediately.

### Conflicts

Computed server-side by one function, used by both the dry-run endpoint and the write path:

| Code | Rule | Severity |
|---|---|---|
| `SPEAKER_OVERLAP` | a speaker is in another session with an overlapping time range | blocking |
| `ROOM_OVERLAP` | another non-cancelled session in the same room overlaps | blocking |
| `CAPACITY_BELOW_REGISTERED` | new capacity < current REGISTERED count | blocking |
| `PARALLEL` | any other non-cancelled session overlaps | info |

Overlap means `a.startsAt < b.endsAt AND b.startsAt < a.endsAt`. Adjacent sessions do not overlap.

- `POST /admin/sessions/check` returns the conflict list without saving.
- `PATCH /admin/sessions/:id` without `acknowledgeConflicts: true` answers `409` with the blocking list. With it, the save proceeds and the acknowledgement is recorded in `SessionChange`.
- Participants get non-blocking `PARALLEL` hints for their own overlapping registrations.

### Seeds and migration

- A seed inserts the current programme (the 3 days in `participant-program.ts`) as `Session` rows keyed by `code`, plus default rooms.
- The seed is **insert-only**: it never overwrites a session that admins have edited.
- A data migration converts existing `selectedActivities` codes into `SessionRegistration(REGISTERED)` rows, once the participant user exists (ADR-002 lazy linking). Until then they are kept as-is.
- The two hard-coded lists in the web app are removed. Public pages read `GET /programme`, which is cached for 60 s and returns public sessions only, never registrant data.

## Consequences

- One source of truth for public site, participant space and admin calendar.
- Adding a session type or room needs no deploy.
- The in-process job is fine for one API instance. Running several instances would need a lock (e.g. `pg_try_advisory_lock`); noted, not needed now.
