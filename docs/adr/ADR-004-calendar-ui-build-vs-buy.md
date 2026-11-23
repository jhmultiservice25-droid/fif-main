# ADR-004 — Calendar UI: build on Angular CDK rather than buy a scheduler

| | |
|---|---|
| Status | Proposed |
| Date | 2026-09-30 |
| Deciders | Tech lead |

## Context

Three calendar surfaces are needed:

1. Admin **day × room** time grid with drag, resize, snapping and conflict states (PRD-002 §5.1).
2. Participant **personal day** time grid, read-only (PRD-001 §5.4).
3. Public **compact day switcher** with animated transitions (PRD-001 §5.1).

Scale is small: 3 days, about 5–10 rooms, about 60–150 sessions. The admin grid must also work on phones. The look must match our design system.

## Options

| | FullCalendar | Other scheduler libraries (Schedule-X, DayPilot, …) | **Custom on Angular CDK** |
|---|---|---|---|
| Room (resource) columns | **Premium only**: "Vertical Resource View" / "Timeline View", from **$480** (checked 2026-09-30) | Resource/room views are commonly in paid tiers; would need per-library licence review | **Yes** |
| Design control | Theming through CSS overrides | Varies | **Full** (Tailwind + Material tokens) |
| Mobile agenda + swipe days | Partly; needs customization | Varies | **Built for it** |
| Bundle cost | Large | Medium–large | **Small** — `@angular/cdk/drag-drop` is already a dependency via Material |
| Effort | Low to integrate, medium to restyle | Similar | **~4–5 dev-days** for the admin grid, reused for the participant grid |
| Risk | Licence, look | Licence, maturity | Our own maintenance; accessibility is on us |

## Decision

**Build a small calendar component set in-house on Angular CDK:**

- `calendar-grid`:
  - CSS grid, rows = 15-minute slots, columns = rooms (admin) or one column (participant).
  - Overlapping blocks in a column are laid out side by side (interval-graph column packing).
- Drag and resize via `@angular/cdk/drag-drop`, snapped to 15 minutes. Every drag result goes through the conflict check (ADR-003) before commit, with optimistic update and rollback.
- `day-switcher`:
  - Notebook tabs with a slide/page transition via the View Transitions API.
  - CSS-transform fallback, swipe gestures on touch, disabled under `prefers-reduced-motion`.
- `agenda-list`: the mobile rendering of the same data.
- **Accessibility**: drag is never the only way. Every card opens an editor with time and room fields. Cards are focusable buttons with full-text ARIA labels, and arrow keys move focus between cards.

The components live in the shared `src/app/shared` code of the Angular workspace (ADR-001), so the console, participant space and public site share them. They load where they are used:

- The **public home page** uses only `day-switcher`: no grid, no drag-drop, no CDK drag module.
- `calendar-grid` and `agenda-list` are lazy-loaded with `/mon-espace` and the admin app.

## Consequences

- No licence spend or vendor lock-in; the UI is exactly our design system.
- We own edge cases: overlap packing, scroll during drag on touch, time-zone display. These are covered by unit tests on the layout functions and a Playwright pass on mobile and desktop viewports.
- If requirements grow (multi-week, recurring events, dozens of rooms), revisit and consider a commercial licence.
