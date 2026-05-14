# Vendor Review Checklist — Onboarding nieuwe subverwerker

> AVG art. 28 lid 1: alleen subverwerkers inschakelen die voldoende garanties bieden voor passende technische en organisatorische maatregelen.

Vul deze checklist in vóór elke nieuwe subverwerker. Bewaar ingevulde checklist in `docs/compliance/vendors/<naam>.md`.

## Algemeen

- [ ] Naam wettelijke entiteit
- [ ] Vestigingsland
- [ ] Doel binnen onze stack
- [ ] Categorieën persoonsgegevens die we delen
- [ ] Volume / frequentie
- [ ] Alternatieven overwogen (geef minstens 1)

## Juridisch

- [ ] DPA aangeboden door verwerker (link naar exacte versie)
- [ ] DPA bevat SCC's (indien doorgifte buiten EER)
- [ ] DPA bevat audit-recht voor controller
- [ ] DPA bevat notificatieplicht bij data breach (≤ 24-48u)
- [ ] DPA bevat notificatieplicht bij overheidsverzoek
- [ ] Sub-sub-processors publiek gemaakt door verwerker
- [ ] Adequacy decision EU Commissie of geldige SCC's
- [ ] Voor doorgifte buiten EER: TIA noodzakelijk → uitgevoerd?

## Beveiliging

- [ ] ISO 27001 / SOC 2 Type 2 of vergelijkbaar (link naar attestation)
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Encryption at rest
- [ ] Toegangscontrole / least-privilege
- [ ] Audit-logging van toegang
- [ ] Incident-respons procedure publiek of contractueel
- [ ] Penetration testing of bug bounty programma
- [ ] Data-localisatie-opties (EU-only datacenters?)

## AI-specifiek (alleen voor AI-providers)

- [ ] Training-policy: gebruikt provider input voor model-training? (Voorkeur: nee.)
- [ ] Retention-policy: hoe lang bewaart de provider prompts/outputs?
- [ ] Zero-retention optie beschikbaar?
- [ ] Bias-/fairness-documentatie beschikbaar?
- [ ] Provider classificatie onder AI Act (provider GPAI? model card?)
- [ ] Disclosed model versies en versiebeheer

## Operationeel

- [ ] Pricing redelijk en voorspelbaar
- [ ] SLA: minimaal 99.5% uptime
- [ ] Support channel + reactietijd
- [ ] Exit-procedure: hoe migreren we weg en hoe wordt onze data verwijderd?
- [ ] Roadmap-zichtbaarheid

## Risico-score

| Risico | Score (1-5) |
|---|---|
| Doorgifte buiten EER | |
| Gevoeligheid van gedeelde data | |
| Schaal | |
| Vervangbaarheid | |
| Beveiligingsmaturiteit | |
| **Totaal** | |

≤ 12: laag risico → directe goedkeuring.
13-18: middel → mitigaties documenteren.
≥ 19: hoog → directie / extern juridisch advies vóór go-live.

## Goedkeuring

- Datum review
- Reviewer (Niels van der Werf)
- Beslissing (goedgekeurd / afgewezen / voorwaardelijk)
- Datum live
- Datum volgende review (jaarlijks of bij wijziging)
