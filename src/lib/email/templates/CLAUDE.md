# Email templates — `src/lib/email/templates/`

HTML email-templates voor transactional email. Caller: `src/lib/email/send.ts` (parent folder).

| Bestand | Doel |
|---|---|
| `base-layout.ts` | `wrapInLayout(title, bodyHtml)` — header/footer + inline CSS reset. `ctaButton(label, href)` — herbruikbare button HTML. Alle andere templates wrappen hier doorheen. |
| `welcome.ts` | Welcome email na signup (verify-email link). |
| `credits-low.ts` | Waarschuwing bij <10 credits resterend. |
| `credits-reset.ts` | Maandelijkse credit-reset bevestiging (free-tier users). |
| `payment-confirmation.ts` | Bevestiging na Mollie succesvolle betaling. |

## Patterns

- **Inline CSS** alleen (geen external stylesheets — email clients strippen die).
- **`wrapInLayout` om elke body wrappen** — geeft consistent header/footer + reset.
- **Geen images embed** — gebruik absolute URLs naar `NEXT_PUBLIC_APP_URL`.
- **Plain-text fallback** ontbreekt momenteel; toevoegen als deliverability issues opduiken.
- **i18n**: templates ontvangen een `locale` parameter en pakken strings uit `src/i18n/messages/{nl,en}.json` via `getTranslations()` server-side.

## Nieuwe template toevoegen

1. Maak `src/lib/email/templates/<name>.ts` die een `(args) => string` exporteert.
2. Wrap met `wrapInLayout(title, bodyHtml)`.
3. Roep aan vanuit `src/lib/email/send.ts` via `sendEmail({ to, subject, html: template(args) })`.
4. Voeg i18n keys toe in beide `nl.json` en `en.json` namespaces.
