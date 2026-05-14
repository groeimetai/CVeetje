# DSR Procedure — Behandeling van Verzoeken van Betrokkenen

> AVG art. 12-23. Termijn: 1 maand (verlengbaar met 2 maanden bij complexe verzoeken — schriftelijk gemotiveerd binnen de eerste maand). Eerste verzoek per kalenderjaar = kosteloos.

## Doel

Eenduidig proces voor het beantwoorden van verzoeken van betrokkenen voor:
- inzage (art. 15)
- rectificatie (art. 16)
- verwijdering / vergetelheid (art. 17)
- beperking van verwerking (art. 18)
- dataportabiliteit (art. 20)
- bezwaar (art. 21)
- intrekking toestemming
- klacht naar AP

## Kanaal

Primair: **info@groeimetai.io** — door verantwoordelijke (Niels van der Werf) gemonitord.

Self-service (geen ticket nodig):
- Inzage account-velden: `/settings`
- Wijzigen account-velden: `/settings`
- Verwijderen profielen/CV's: `/profiles`, `/cv`
- Verwijderen account: `/settings → Account → Account verwijderen`
- Dataportabiliteit (JSON-export): `/settings → Account → Mijn gegevens exporteren`

## Workflow per verzoektype

### Inzage (art. 15)

1. Authenticeer verzoeker (matching e-mail account; eventueel security-vraag bij twijfel).
2. Lever JSON-export + screenshots of een eenvoudig overzicht.
3. Doorlooptijd: ≤ 1 maand. SLA-doel: 7 dagen.

### Rectificatie (art. 16)

1. Authenticeer.
2. Pas data aan via Firestore Admin Console of doorbreek user-side UI-flow.
3. Bevestig schriftelijk.

### Verwijdering (art. 17)

1. Authenticeer.
2. Wijs op zelfservice-knop (`/settings`).
3. Indien niet mogelijk via self-service: verwijder via `src/app/api/settings/account/route.ts` flow (Auth + Firestore batch + Storage).
4. Bewaartermijn-uitzondering: betaal-records 7 jaar (fiscale plicht) — communiceer dit duidelijk.

### Dataportabiliteit (art. 20)

1. Wijs op `/settings → Mijn gegevens exporteren` (JSON-bestand).
2. Indien specifieke andere formaten gevraagd: schrijf custom export (CSV).

### Bezwaar (art. 21)

1. Identificeer rechtsgrond. Bezwaar tegen `art. 6 lid 1 sub f` (gerechtvaardigd belang) is toegestaan.
2. Mogelijke "f"-verwerkingen: reCAPTCHA, logging, jobs board.
3. Bij gegrond bezwaar: stop de verwerking voor die betrokkene (kan praktisch betekenen account-deactivering).

### Verzoek datalek (art. 33-34)

Zie `incident-response.md`.

## Identificatie van verzoeker

We vragen om:
- De ingelogde e-mail die hoort bij het account, of
- Een via die e-mail verstuurd bericht.

Bij twijfel: bevestigingslink naar account-e-mail. **Géén** kopie ID-bewijs vragen — dat is bovenmatig (AP-handreiking 2020).

## Termijnen

| Actie | Termijn |
|---|---|
| Bevestiging ontvangst | ≤ 3 werkdagen |
| Inhoudelijk antwoord | ≤ 1 maand (verlengbaar met 2 maanden bij complex verzoek) |
| Updates bij verlenging | Binnen oorspronkelijke maand schriftelijk uitgelegd |

## Weigeringsgronden

We kunnen een verzoek weigeren of beperken als:
- Verzoek kennelijk ongegrond of buitensporig (bv. >1x/maand zelfde verzoek).
- Wettelijke bewaartermijn nog niet verstreken (bv. fiscale records).
- Verzoek raakt rechten van anderen (zeldzaam in onze context).

Weigering altijd schriftelijk + onder verwijzing naar klacht-route AP.

## Logging

Elke DSR wordt bijgehouden in een privé Linear-bord of GitHub Issues label `dsr` (binnen `groeimetai/CVeetje`) met:
- Datum ontvangst
- Type verzoek
- Datum afhandeling
- Acties genomen

Bewaartermijn DSR-logs: 5 jaar (verantwoordingsbewijs AVG art. 5 lid 2).
