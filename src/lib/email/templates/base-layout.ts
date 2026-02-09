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
                    <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-block;text-align:center;line-height:40px;">
                      <span style="color:#ffffff;font-size:16px;font-weight:700;">CV</span>
                    </div>
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
