# ADR-005 — Passwordless access for every attendee profile

| | |
|---|---|
| Status | Proposed — supersedes the "innovators / organizations keep passwords" part of ADR-002 |
| Date | 2026-10-03 |
| Related | [ADR-002](ADR-002-authentication-per-audience.md), [PRD-003](../prd/PRD-003-opportunities-showcase-and-unified-access.md) |

## Context

ADR-002 gave participants e-mail + code and kept passwords for innovators and organizations. In practice:

- a participant becomes an innovator in one click and keeps signing in by code, so two innovators can sign in two different ways;
- the site needs two login screens ("Connexion" with a password, "Mon espace" with a code), and visitors cannot tell which one is theirs;
- passwords add reset e-mails and support load and bring no security benefit here: the code proves ownership of the same e-mail a reset would go to.

## Decision

- **All non-admin profiles sign in with e-mail + 6-digit code**: Participant, Innovateur, Organisation.
  - One login screen: `/connexion` = `/mon-espace`.
  - The Better Auth e-mail/password route stays enabled **only for admins**. The API rejects password sign-in for any other role, and the website no longer shows a password form.
- **Account creation always goes through a verified code** and an onboarding form specific to the profile (PRD-003 §5). Existing password accounts keep their data and simply receive codes.
- Rules from ADR-002 are unchanged:
  - 10-minute codes, 5 attempts, stored hashed;
  - per-e-mail and per-IP rate limits;
  - 30-day sessions;
  - admin sessions 8 h;
  - fixed fallback code while no e-mail provider is configured.

## Consequences

- **Removed**:
  - the password sign-in form;
  - the `/auth/choice` and `/auth/inscription/*` password sign-up pages, which redirect to `/rejoindre/*`;
  - password reset (never built).
- **E-mail volume** rises by one code per innovator or organization login, a few hundred at most. That stays well within the Resend Pro budget of ADR-002.
- **Single identity**: the e-mail. Changing it remains an admin action.
