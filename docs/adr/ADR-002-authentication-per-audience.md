# ADR-002 — Authentication per audience and e-mail budget

| | |
|---|---|
| Status | Proposed — password part superseded by [ADR-005](ADR-005-passwordless-access-for-all-attendees.md) |
| Date | 2026-09-30 |
| Deciders | Product owner, tech lead |

## Context

Three audiences sign in:

| Audience | Today | Volume |
|---|---|---|
| Admins | e-mail + password (Better Auth), seeded from env | < 10 |
| Innovators / organizations | e-mail + password, self sign-up | tens to low hundreds |
| Participants | **no account** — form only, badge by e-mail | 200 expected, plan for **2,000** ("2 000 jeunes") |

Participants now need a personal space: see, change and cancel sessions. Stakeholders want participants on **e-mail + one-time code only**, with the code also sent **at sign-up**. Innovators keep passwords. The question is which approach costs least while staying secure and usable on mobile.

E-mail is sent through Resend. Pricing checked on 2026-09-30:

- **Free**: 3,000 e-mails/month, **100 e-mails/day**.
- **Pro**: $20/month for 50,000/month, no daily cap. $35/month for 100,000.

## Options for participants

| | Password | Magic link | **E-mail OTP (6 digits)** | SMS / WhatsApp OTP |
|---|---|---|---|---|
| E-mails per participant* | ~3.5 (verify, badge, resets, notices) | ~6.5 | **~6.5** | ~4 + paid SMS |
| Mobile UX | Poor (another password to create and forget) | Poor: the link opens in the mail app's browser, so the session lands in the wrong browser | **Good**: type or paste the code in the same tab | Good |
| Proves e-mail ownership | Only if a verification mail is added | Yes | **Yes** | Proves phone, not e-mail |
| Support load | Password resets | Low | **Low** | Low |
| Extra cost | — | — | — | Per-message fees, well above e-mail cost; needs an SMS/WhatsApp provider contract |

\* Estimate per participant over the event: 1 sign-up code + 1 badge + ~1.5 re-login codes (30-day sessions) + ~1 approval decision + ~2 change/cancel notices.

### Volume and cost

| Scenario | E-mails (Oct–Nov) | Peak day | Plan needed |
|---|---|---|---|
| 200 participants, OTP | ~1,300 + broadcasts | > 100 on launch/registration days (code + badge = 2 per sign-up) | **Pro** — the Free daily cap is hit on peak days |
| 2,000 participants, OTP | ~13,000 + 2 broadcasts × 2,000 ≈ 17,000 | several hundred | **Pro $20/month** (50k) |
| 2,000 participants, password | ~7,000 + broadcasts ≈ 11,000 | several hundred | **Pro $20/month** — same bill |

**Cost does not decide between password and OTP.** Both need Resend Pro for the event months because of the 100/day cap. Today's badge e-mails already exceed that cap on busy days. OTP adds roughly 2,400 e-mails at 2,000 participants — about 5 % of the Pro quota, $0 extra. The deciding factors are UX and security, and OTP wins on both.

## Decision

- **Participants: passwordless e-mail OTP** with the Better Auth `emailOTP` plugin:
  - 6 digits, valid 10 minutes, 5 attempts, stored hashed.
  - Rate-limited to 3 codes per e-mail per 10 minutes, plus a per-IP limit.
  - The code is **required at sign-up** (proves the e-mail before the badge is issued) and at each new sign-in.
  - Session lasts **30 days** to keep re-login codes rare.
  - `disableSignUp: true` on the plugin. The participant user is created by our registration endpoint, and **only after the code is verified**:
    - identity and session selections are submitted together with the code, in one request;
    - a failed or abandoned code leaves nothing in the database — no user, no registration, no badge;
    - a code alone, without that endpoint, never creates an account.
  - Unknown e-mails get a generic "code envoyé" response, and no e-mail is sent (no enumeration, no wasted quota).
- **Existing participants** (registered before this change, no user row): on their first code request, if a `ParticipantRegistration` exists for that e-mail, a `PARTICIPANT` user is created and linked. The same person keeps one identity.
- **Innovators / organizations: unchanged** — e-mail + password. Adding password reset by e-mail is in scope (currently missing).
- **Admins: e-mail + password**, 8-hour sessions, TOTP 2FA later (ADR-001).
- **E-mail provider: Resend Pro ($20/month) from October through the end of November 2026**, then downgrade to Free. Total ≈ **$40**.
  - Sends stay best-effort: if `RESEND_API_KEY` is missing or a send fails, the flows still complete, the failure is recorded, and admins can retry. This does not apply to OTP: without a sent code there is no login, so the UI shows an explicit error.

- **One person per browser; registering a friend = sign out and restart** (Luma-style, PRD-001 §5.2):
  - "Pas vous ?" in the modal and "Inscrire une autre personne" on the success step both call sign-out, then restart the flow.
  - The friend verifies their own e-mail with their own code.
  - Group registration (one person entering several attendees, each confirming later) was rejected: it needs pending attendees, reminder e-mails and held seats, and costs more e-mail.

## Consequences

- Roles become `ADMIN | INNOVATOR | ORGANIZATION | PARTICIPANT`. `ParticipantRegistration` gains a `userId` link.
- A shared "Mon programme" feature serves every non-admin role (PRD-001 §5.5).
- Budget line to approve: **$40** for Resend Pro, October–November.
- Sign-out is exposed on the public site (header account menu), not only in the participant space, because phones are often shared.
- Deliverability: SPF/DKIM for `fikiri.co` must be verified in Resend before launch (see the e-mail setup notes shared earlier).
