import { wrapInLayout, ctaButton } from './base-layout';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

export function renderWelcomeEmail(data: { displayName: string }): {
  subject: string;
  html: string;
} {
  const body = `
    <h1 style="margin:0 0 16px 0;font-size:22px;color:#111827;">Welkom bij CVeetje!</h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
      Hoi ${data.displayName},
    </p>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">
      Leuk dat je er bent! Je account is aangemaakt en je hebt <strong>10 gratis credits</strong> ontvangen om direct aan de slag te gaan.
    </p>
    <p style="margin:0 0 8px 0;font-size:15px;line-height:1.6;color:#374151;">
      Met CVeetje maak je in een paar stappen een professioneel CV dat perfect aansluit bij de vacature. Zo werkt het:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
      <tr>
        <td style="padding:4px 12px 4px 0;vertical-align:top;font-size:15px;color:#6366f1;font-weight:700;">1.</td>
        <td style="padding:4px 0;font-size:15px;line-height:1.5;color:#374151;">Voer je profiel in (tekst, LinkedIn PDF of screenshot)</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;vertical-align:top;font-size:15px;color:#6366f1;font-weight:700;">2.</td>
        <td style="padding:4px 0;font-size:15px;line-height:1.5;color:#374151;">Plak de vacaturetekst</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;vertical-align:top;font-size:15px;color:#6366f1;font-weight:700;">3.</td>
        <td style="padding:4px 0;font-size:15px;line-height:1.5;color:#374151;">AI genereert een op-maat-gemaakt CV</td>
      </tr>
    </table>
    ${ctaButton('Maak je eerste CV', `${APP_URL}/nl/dashboard`)}
  `;

  return {
    subject: 'Welkom bij CVeetje!',
    html: wrapInLayout('Welkom bij CVeetje', body),
  };
}
