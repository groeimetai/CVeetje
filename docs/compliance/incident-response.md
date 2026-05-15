# Incident Response Procedure — Datalekken & Beveiligingsincidenten

> AVG art. 33 (melding aan AP binnen 72 uur) en art. 34 (melding aan betrokkenen bij hoog risico). AI Act art. 73 (melding ernstige incidenten bij high-risk AI — niet op ons van toepassing, maar voor het geval).

## 1 · Detectie

Bronnen van signalen:
- Google Cloud Logging → ongebruikelijk verkeerspatroon of error-spike.
- Firebase Authentication → onverwachte sign-in pogingen.
- Anthropic / OpenAI rate-limit / billing alerts.
- Gebruikersmeldingen via `/feedback` of e-mail.
- Externe security researcher → responsible disclosure naar info@groeimetai.io.

## 2 · Triage (binnen 4 uur na detectie)

| Vraag | Actie |
|---|---|
| Is er persoonsgegevens uit ons systeem ongeautoriseerd ingezien/wijzigd/verloren? | Ja → datalek. Nee → security-incident maar geen meldplicht. |
| Welke betrokkenen, welke categorieën gegevens? | Schaalbepaling: enkele accounts, of breed. |
| Is er bijzondere persoonsgegevens betrokken? | Verhoogt risicoclassificatie. |
| Kan de incidentbron nog actief schade veroorzaken? | Ja → directe containment (revoke tokens, IAM-blokkade, key rotation). |

Voer triage-formulier in `docs/compliance/incidents/YYYY-MM-DD-slug.md` (volg template hieronder).

## 3 · Containment (parallel aan triage)

- Roteer Firebase service-account credentials.
- Roteer Anthropic + andere AI-provider API-keys.
- Roteer `ENCRYPTION_KEY` indien sleutel-compromittering. **Let op:** dit maakt versleutelde user API-keys onleesbaar — communiceren naar gebruikers dat ze hun BYOK-sleutel opnieuw moeten invoeren.
- Roteer `GITHUB_TOKEN` en `MOLLIE_API_KEY`.
- Schakel verdachte accounts uit via Firebase Auth.
- Zet, indien nodig, kritieke endpoints op maintenance-mode.

## 4 · AP-meldplicht (binnen 72 uur na ontdekking)

Drempel: tenzij het onwaarschijnlijk is dat het lek een risico inhoudt voor rechten en vrijheden — bijvoorbeeld zuiver versleutelde data zonder gelekte sleutel.

Meldingsprocedure:
1. Ga naar https://datalekken.autoriteitpersoonsgegevens.nl
2. Vul in:
   - Naam organisatie: GroeimetAI / CVeetje
   - KvK 90102304
   - Contactpersoon: Niels van der Werf, niels@groeimetai.io
   - Aard van het lek (vertrouwelijkheid / integriteit / beschikbaarheid)
   - Categorieën en aantal betrokkenen
   - Categorieën en aantal records
   - Mogelijke gevolgen
   - Genomen en geplande maatregelen
3. Bewaar referentienummer in `docs/compliance/incidents/YYYY-MM-DD-slug.md`.

Bij wijziging van feiten: aanvullende melding indienen (vervolgmelding).

## 5 · Melding aan betrokkenen (art. 34)

Verplicht bij "waarschijnlijk hoog risico" voor rechten/vrijheden. Indicaties: bijzondere categorieën gelekt, financiële schade waarschijnlijk, identiteits­fraude denkbaar, mass-impact.

Inhoud bericht aan betrokkenen:
- Wat is er gebeurd (in heldere taal, geen jargon)
- Welke data is betrokken
- Welke gevolgen mogelijk zijn
- Wat zij kunnen doen (wachtwoord wijzigen, alert op identity theft etc.)
- Wat wij hebben gedaan
- Contactpunt voor vragen

Kanaal: e-mail aan ingelogde adres + banner in de app.

## 6 · Onderzoek & root cause

- Identificeer hoofdoorzaak (technisch, menselijk, derde partij).
- Documenteer in incident report.
- Voer post-mortem uit (binnen 2 weken).
- Vertaal naar concrete preventieve maatregelen.

## 7 · Communicatie naar subverwerkers

Als de root cause bij een subverwerker ligt:
- Notificeer hen formeel via security-contact.
- Verzoek RCA + bewijs van mitigatie.
- Bij ernstige tekortkomingen: heroverweeg de verwerkers-relatie.

## 8 · Incident-template

```markdown
# Incident YYYY-MM-DD — <slug>

- **Detectiedatum:** YYYY-MM-DD HH:MM CET
- **Triagedatum:** YYYY-MM-DD HH:MM CET
- **Severity:** P0 / P1 / P2 / P3
- **Type:** vertrouwelijkheid / integriteit / beschikbaarheid
- **Bron signaal:** logging / gebruiker / extern
- **Affected systems:** ...
- **Affected users (count + categories):** ...
- **Affected data types:** ...
- **Containment actions:** ...
- **AP melding:** Ja / Nee — referentie ...
- **Melding betrokkenen:** Ja / Nee — datum + kanaal
- **Root cause:** ...
- **Permanent fix:** ...
- **Post-mortem date:** ...
- **Verbetermaatregelen:** ...
```

## 9 · Bij externe security disclosure

Stel een eenvoudig responsible-disclosure-protocol beschikbaar via `/.well-known/security.txt`:

```
Contact: mailto:security@groeimetai.io
Expires: 2027-12-31T23:59:59Z
Acknowledgments: https://maakcveetje.nl/security
Preferred-Languages: nl, en
Policy: https://maakcveetje.nl/security
```

`/.well-known/security.txt` is gepubliceerd onder `public/.well-known/security.txt`. Contact is `info@groeimetai.io` (geen aparte security@ alias actief — info@ wordt door Niels van der Werf gemonitord).
