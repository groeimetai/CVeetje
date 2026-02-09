import { wrapInLayout, ctaButton } from './base-layout';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

export function renderCreditsResetEmail(data: {
  displayName: string;
  creditAmount: number;
}): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Je credits zijn bijgevuld</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
      Hoi ${data.displayName},
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
      Het is weer een nieuwe maand! Je gratis credits zijn bijgevuld.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0fdf4;border-radius:8px;margin:0 0 24px 0;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px 0;font-size:14px;color:#6b7280;">Gratis credits deze maand</p>
          <p style="margin:0;font-size:32px;font-weight:700;color:#16a34a;">${data.creditAmount}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#374151;">
      Klaar om te solliciteren? Maak een op-maat-gemaakt CV voor je volgende vacature.
    </p>
    ${ctaButton('Maak een CV', `${APP_URL}/nl/dashboard`)}
  `;

  return {
    subject: 'Je maandelijkse credits zijn bijgevuld',
    html: wrapInLayout('Credits bijgevuld', body),
  };
}
