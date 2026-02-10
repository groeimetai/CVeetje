const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

/**
 * Wrap email body HTML in the shared CVeetje branded layout.
 * Uses table-based layout with all inline CSS for maximum email client compatibility.
 */
export function wrapInLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%238b5cf6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='512' height='512' rx='96' ry='96' fill='url(%23g)'/%3E%3Cpath d='M160 96h128l80 80v240c0 17.7-14.3 32-32 32H160c-17.7 0-32-14.3-32-32V128c0-17.7 14.3-32 32-32z' fill='white' fill-opacity='0.95'/%3E%3Cpath d='M288 96v48c0 17.7 14.3 32 32 32h48L288 96z' fill='white' fill-opacity='0.7'/%3E%3Ctext x='196' y='340' font-family='Arial,sans-serif' font-size='140' font-weight='700' fill='%236366f1'%3ECV%3C/text%3E%3C/svg%3E" alt="CVeetje" width="40" height="40" style="display:block;border:0;border-radius:10px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">CVeetje</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">
                &copy; ${new Date().getFullYear()} CVeetje &mdash; AI-powered CV generator
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="${APP_URL}/nl/privacy" style="color:#6366f1;text-decoration:none;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/nl/terms" style="color:#6366f1;text-decoration:none;">Voorwaarden</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Render a CTA button for use inside email body HTML.
 */
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0 auto;">
  <tr>
    <td style="border-radius:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;
}
