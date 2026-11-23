# ADR-001 — Separate admin application

| | |
|---|---|
| Status | Accepted — implemented 2026-10-01 |
| Date | 2026-09-30 |
| Deciders | Product owner, tech lead |

## Context

The admin UI lives in the public Angular app under `/admin`:

- Admin routes, components and API paths are shipped in (lazy) chunks of the public site. Anyone can download them and learn the admin surface.
- Admin and public share one origin, one CSP, one deploy. A public-site change can break admin, and the reverse.
- The API's CORS config reflects **any** origin with credentials (`origin: true` in `apps/server/src/main.ts`). Separating origins only helps if the API trusts a fixed list.
- Stakeholders see the shared app as a risk, and want it separated if it costs little.

Server-side protection already exists: every `/admin/*` endpoint requires an authenticated `ADMIN` session. The separation is defence in depth plus operational isolation. It does not replace server authorization.

## Options

| | A. Keep `/admin` in the web app | **B. Separate SPA, same API** | C. Separate SPA + separate admin API service |
|---|---|---|---|
| Admin code in public bundle | Yes | **No** | No |
| Independent deploy / CSP | No | **Yes** | Yes |
| Infra cost | 0 | **~0** (static container on the same VPS, 1 DNS record, Caddy auto-TLS) | +1 Node process, more RAM, duplicated auth |
| Dev cost | 0 | **Medium** — move `domains/admin` into `apps/admin`, extract shared code | High |
| Attack-surface reduction | — | **Good** | Marginally better than B |

## Decision

**Option B.**

- **New Angular project `fif-admin`** in `apps/web/projects/admin`:
  - Angular 22, client-side only (no SSR — no SEO need, smaller attack surface).
  - Built to static files and served by an nginx container (`fif-admin`, port 4300) behind Caddy at **`admin-festival.fikiri.co`**.
- **Shared code — implementation note**: the console is a second project in the existing Angular workspace, not a separate `apps/admin` + `packages/shared` package as first proposed.
  - Both projects compile against the same `src/app/core` and `src/app/shared` through the workspace path alias. There is no duplication and no copy to keep in sync.
  - Each project is its own build with its own bundle. The website build contains no console code (verified on the production build).
  - Why not the separate package: extracting a package in a pnpm workspace risks two copies of Angular at runtime (dependency-injection breakage) and Tailwind source-scanning issues, for no security gain.
- **Web app** loses `domains/admin` and the `/admin` routes. Legacy `/admin/*` URLs are 301-redirected server-side, and in-app by a guard, to the same path on the console. This also keeps the public site light: admin-only dependencies (paginator, tables, calendar editing) never reach its build. Old `/admin/*` URLs redirect to the admin domain; badge QR codes already printed keep working through that redirect.
- **API hardening**, shipped with this change:
  - CORS allow-list = `WEBSITE_ORIGIN` + `ADMIN_ORIGIN` (Better Auth `trustedOrigins` already uses both).
  - Admin sessions expire after 8 h (checked in the admin guard from the session's `createdAt`).
  - Login rate limiting enabled for Better Auth sign-in and OTP routes.
  - Security headers on the console host: strict CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `noindex`.
    - Set by the console's nginx (`apps/web/projects/admin/nginx.conf`), so Caddy only proxies.
  - Badge QR codes now point to `ADMIN_ORIGIN/checkin?code=…`.
- **Later, not blocking**: TOTP 2FA for admins (Better Auth `twoFactor` plugin); optional IP allow-list at Caddy during the festival.

## Launch note (2026-10-02)

To avoid waiting on a new DNS record, the console ships **under `/admin` on the website's domain**
(`https://festival.fikiri.co/admin`), not on `admin-festival.fikiri.co`:

- It is still the separate `fif-admin` build. The website's Node server serves its static files under `/admin`, with
  the console's security headers (CSP, `frame-ancestors 'none'`, `noindex`). The public bundles contain no console code.
- There is no extra container, Caddy block or DNS record.
- Badge QR codes point to `WEBSITE_ORIGIN/admin/checkin?code=…`, so badges printed before the split keep working
  as they are.
- Moving to the subdomain later means: build with `baseHref: "/"`, serve it on its own host, and set `ADMIN_APP_URL`
  on the API.

## Consequences

- One more container: `fif-admin`, in `compose.prod.yml`, built from the web Dockerfile's `admin` stage. The web workflow deploys `web` and `admin` together, since both come from `apps/web`.
- One-time cost to extract `packages/shared` and to move the admin domain; the code is already isolated under `domains/admin`, so the move is mechanical.
- One more DNS record and Caddy site block, requested from the person managing `fikiri.co`.
- Cookies: the session cookie belongs to the API host, and `*.fikiri.co` sites are same-site, so `SameSite=Lax` keeps working for both frontends. A browser holds one API session at a time. An admin testing as a participant uses a private window.
