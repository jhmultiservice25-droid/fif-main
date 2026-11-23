# ADR-006 — Showcase solutions: import, presenter allocation and contact relay

| | |
|---|---|
| Status | Proposed |
| Date | 2026-10-03 |
| Related | [PRD-003](../prd/PRD-003-opportunities-showcase-and-unified-access.md), [ADR-003](ADR-003-programme-data-model.md) |

## Context

- 284 selected solutions arrive as a spreadsheet and must be presentable at the festival.
- Innovators pick up to 2 solutions each; each solution takes at most 3 presenters.
- Picks race against each other: the 3rd place on a popular solution.
- Partners must be able to contact owners without seeing their e-mail addresses.

## Decision

### Data

```
ShowcaseSolution   id, reference (unique), name, summary, sector, city, teamName, contactEmail?, website?,
                   active, createdAt, updatedAt
SolutionPresenter  id, solutionId, userId, listedPublicly, assignedById?, createdAt
                   unique(solutionId, userId)
ShowcaseSettings   single row: pickerOpen, deadline?, maxPerInnovator (2), maxPerSolution (3), demoShowSessionIds[]
ContactMessage     id, targetType (SOLUTION | PROJECT), targetId, senderName, senderEmail, senderOrganization,
                   senderType, message, deliveredAt?, createdAt
```

### Allocation

The innovator's pick runs in one transaction:

1. **Locks, always in the same order:**
   - the innovator's user row (`SELECT … FOR UPDATE`), which serializes their own picks;
   - the solution row (`FOR UPDATE`), which serializes the race for its places.
2. **Checks:**
   - picker open, and the deadline not passed;
   - solution active;
   - presenters on this solution < `maxPerSolution`;
   - picks of this innovator < `maxPerInnovator`.
3. **Insert, then auto-register** to the Demo Show session(s) through the programme service, with `invited: true`. Locking always in the same order avoids deadlocks.

- Release deletes the row, and removes the Demo Show registration if the innovator holds no other pick and had not registered themselves.
- Admin actions (add, remove, move) reuse the same transaction but may pass `overrideLimits` with an explicit confirmation. Every change is logged with `assignedById` and e-mails the affected innovators.

### Import

- **Parsing:** CSV (UTF-8, `,` or `;`, BOM tolerated) or XLSX, first sheet, with SheetJS on the server. Headers are case- and accent-insensitive, accepting FR and EN aliases.
- **Dry run first:**
  - the upload returns a preview (create / update / deactivate / errors) and an `importToken`;
  - the confirm call applies that exact preview within 15 minutes;
  - a file larger than 2 MB or 5,000 rows is rejected.
- **Applying** upserts by `reference` and never deletes. Deactivation needs confirmation and notifies presenters.

### Contact relay

- The public endpoint stores the message, then e-mails the owner with `Reply-To: sender`. The owner is the project's innovator, or the solution's `contactEmail`, falling back to the FIF team.
- Abuse limits from PRD-003 §6.3 apply.
- Public catalogue responses never include owner e-mails, the same rule as speaker contact e-mails.

## Consequences

- Fairness is guaranteed by the database, not the UI. The limit-reached message is the normal outcome of a lost race, not an error page.
- One more dependency on the API (SheetJS), loaded only by the import endpoint.
- The relay keeps personal data private and gives the organizers a record of partner interest ("mises en relation") for impact reporting.
