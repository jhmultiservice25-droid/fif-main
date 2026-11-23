export interface IEmailAction {
  label: string;
  url: string;
  /** Filled button (one per e-mail); the others render as outlined links. */
  primary?: boolean;
}

export interface IEmailDetail {
  label: string;
  value: string;
}

export interface IEmailBrand {
  shortName: string;
  name: string;
  dateLabel: string;
  location: string;
  websiteUrl: string;
}

export interface IComposeEmail {
  /** Recipient's name: every e-mail opens with "Bonjour X,". */
  name?: string | null;
  /** Shown in the inbox preview, right after the subject. */
  preheader: string;
  title: string;
  intro: string | string[];
  details?: IEmailDetail[];
  /** Quoted block, e.g. a partner's message relayed to a project owner. */
  quote?: { body: string; author?: string };
  /** Big centred value, e.g. a login code. */
  highlight?: { value: string; caption?: string };
  actions?: IEmailAction[];
  outro?: string | string[];
  /** Small print under the signature explaining why this e-mail was received. */
  footerNote?: string;
}

const INK = "#111827";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const PRIMARY = "#006da4";
const DARK = "#04131f";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const paragraphs = (value: string | string[]) =>
  (Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .map(
      (text) =>
        `<p style="margin:0 0 14px; font-size:15px; line-height:24px; color:${INK};">${escapeHtml(text).replace(/\r?\n/g, "<br/>")}</p>`,
    )
    .join("");

const button = (action: IEmailAction) =>
  action.primary
    ? `<a href="${escapeHtml(action.url)}" style="display:inline-block; background:${PRIMARY}; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; padding:12px 22px; border-radius:999px;">${escapeHtml(action.label)}</a>`
    : `<a href="${escapeHtml(action.url)}" style="display:inline-block; border:1px solid ${BORDER}; color:${INK}; font-size:15px; font-weight:600; text-decoration:none; padding:11px 20px; border-radius:999px;">${escapeHtml(action.label)}</a>`;

/**
 * One layout for every e-mail the festival sends: branded header, "Bonjour X," greeting, body,
 * actions, and a signed footer with the usual links. Table-based so it survives older mail clients.
 */
export function renderEmail(input: IComposeEmail, brand: IEmailBrand): string {
  const greeting = `Bonjour${input.name?.trim() ? ` ${escapeHtml(input.name.trim().split(/\s+/)[0])}` : ""},`;

  const details = input.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px; background:#f9fafb; border:1px solid ${BORDER}; border-radius:12px;">
         <tr><td style="padding:14px 16px;">
           ${input.details
             .map(
               (detail, index) =>
                 `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${index ? "margin-top:10px;" : ""}">
                    <tr>
                      <td style="font-size:12px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.04em; padding-bottom:2px;">${escapeHtml(detail.label)}</td>
                    </tr>
                    <tr><td style="font-size:15px; color:${INK}; font-weight:600;">${escapeHtml(detail.value)}</td></tr>
                  </table>`,
             )
             .join("")}
         </td></tr>
       </table>`
    : "";

  const highlight = input.highlight
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
         <tr><td align="center" style="background:#f9fafb; border:1px solid ${BORDER}; border-radius:12px; padding:20px;">
           <div style="font-size:34px; font-weight:700; letter-spacing:10px; color:${INK};">${escapeHtml(input.highlight.value)}</div>
           ${input.highlight.caption ? `<div style="margin-top:8px; font-size:13px; color:${MUTED};">${escapeHtml(input.highlight.caption)}</div>` : ""}
         </td></tr>
       </table>`
    : "";

  const quote = input.quote
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
         <tr><td style="border-left:3px solid ${PRIMARY}; background:#f9fafb; border-radius:0 12px 12px 0; padding:14px 16px;">
           <div style="font-size:15px; line-height:24px; color:#374151;">${escapeHtml(input.quote.body).replace(/\r?\n/g, "<br/>")}</div>
           ${input.quote.author ? `<div style="margin-top:10px; font-size:13px; color:${MUTED};">— ${escapeHtml(input.quote.author)}</div>` : ""}
         </td></tr>
       </table>`
    : "";

  const actions = input.actions?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">
         <tr>${input.actions.map((action) => `<td style="padding-right:8px; padding-top:8px;">${button(action)}</td>`).join("")}</tr>
       </table>`
    : "";

  const footerLinks = [
    { label: "Programme", url: `${brand.websiteUrl}/#programme` },
    { label: "Mon espace", url: `${brand.websiteUrl}/mon-espace` },
    { label: "Projets et solutions", url: `${brand.websiteUrl}/projets` },
  ]
    .map(
      (link) =>
        `<a href="${escapeHtml(link.url)}" style="color:${MUTED}; font-size:13px; text-decoration:none; margin:0 8px;">${escapeHtml(link.label)}</a>`,
    )
    .join("<span style=\"color:#d1d5db;\">·</span>");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0; padding:0; background:#f3f4f6;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#ffffff; border:1px solid ${BORDER}; border-radius:16px; overflow:hidden; font-family:${FONT};">
          <tr>
            <td style="background:${DARK}; padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:18px; font-weight:700; color:#ffffff; letter-spacing:-0.01em;">${escapeHtml(brand.shortName)}</td>
                  <td align="right" style="font-size:12px; color:#9ec5dd;">${escapeHtml(brand.dateLabel)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 6px; font-size:15px; color:${INK};">${greeting}</p>
              <h1 style="margin:0 0 14px; font-size:21px; line-height:29px; font-weight:700; color:${INK};">${escapeHtml(input.title)}</h1>
              ${paragraphs(input.intro)}
              ${highlight}
              ${details}
              ${quote}
              ${actions}
              ${input.outro ? paragraphs(input.outro) : ""}
              <p style="margin:18px 0 0; font-size:15px; line-height:24px; color:${INK};">À très bientôt,<br/><strong>L'équipe ${escapeHtml(brand.shortName)}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid ${BORDER}; background:#fafafa; padding:18px 28px;">
              <div style="text-align:center;">${footerLinks}</div>
              <p style="margin:12px 0 0; text-align:center; font-size:12px; line-height:18px; color:${MUTED};">
                ${escapeHtml(brand.name)}<br/>
                ${escapeHtml(brand.dateLabel)} · ${escapeHtml(brand.location)}
              </p>
              ${input.footerNote ? `<p style="margin:10px 0 0; text-align:center; font-size:11px; line-height:17px; color:#9ca3af;">${escapeHtml(input.footerNote)}</p>` : ""}
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
