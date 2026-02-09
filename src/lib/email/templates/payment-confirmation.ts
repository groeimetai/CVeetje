import { wrapInLayout, ctaButton } from './base-layout';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

export function renderPaymentConfirmationEmail(data: {
  displayName: string;
  credits: number;
  packageName: string;
}): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Betaling bevestigd</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
      Hoi ${data.displayName},
    </p>
    <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#374151;">
      Bedankt voor je aankoop! Je betaling is succesvol verwerkt.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f0ff;border-radius:8px;margin:0 0 24px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size:14px;color:#6b7280;padding-bottom:8px;">Pakket</td>
              <td style="font-size:14px;color:#111827;font-weight:600;text-align:right;padding-bottom:8px;">${data.packageName}</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#6b7280;">Credits toegevoegd</td>
              <td style="font-size:14px;color:#6366f1;font-weight:700;text-align:right;">+${data.credits}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 0 0;font-size:15px;line-height:1.6;color:#374151;">
      Je credits zijn direct beschikbaar. Ga naar je dashboard om een CV te maken.
    </p>
    ${ctaButton('Naar dashboard', `${APP_URL}/nl/dashboard`)}
  `;

  return {
    subject: `Betaling bevestigd — ${data.credits} credits toegevoegd`,
    html: wrapInLayout('Betaling bevestigd', body),
  };
}
