import { wrapInLayout, ctaButton } from './base-layout';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

export function renderCreditsLowEmail(data: {
  displayName: string;
  remaining: number;
}): { subject: string; html: string } {
  const creditWord = data.remaining === 1 ? 'credit' : 'credits';

  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Je credits raken op</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
      Hoi ${data.displayName},
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
      Je hebt nog <strong>${data.remaining} ${creditWord}</strong> over. Koop extra credits zodat je ongestoord kunt blijven solliciteren.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#fefce8;border-radius:8px;margin:0 0 24px 0;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px 0;font-size:14px;color:#6b7280;">Resterend</p>
          <p style="margin:0;font-size:32px;font-weight:700;color:#ca8a04;">${data.remaining}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      Je gratis credits worden elke maand op de 1e automatisch bijgevuld.
    </p>
    ${ctaButton('Credits kopen', `${APP_URL}/nl/dashboard/settings`)}
  `;

  return {
    subject: `Je hebt nog ${data.remaining} ${creditWord} over`,
    html: wrapInLayout('Credits bijna op', body),
  };
}
