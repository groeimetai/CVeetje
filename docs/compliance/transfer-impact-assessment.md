# Transfer Impact Assessment (TIA) — Anthropic (VS)

> EDPB Recommendations 01/2020 + Schrems II. Verplicht bij doorgifte naar derde landen onder SCC's wanneer geen adequacy decision geldt voor de hele dataset. Voor Google geldt EU-US Data Privacy Framework als primaire grond; aanvullende SCC's zijn de tweede laag. Voor Anthropic is alleen SCC + technische/organisatorische waarborgen het kader.

Versie 1.0 — 2026-05-15

## 1 · Mapping van de doorgifte

| Veld | Waarde |
|---|---|
| Exporteur | GroeimetAI (CVeetje), Apeldoorn, NL |
| Importeur | Anthropic, PBC, San Francisco, CA, USA |
| Doel | Inferentie via Claude API voor CV-generatie, motivatiebrief, fit-analyse, stijl-generatie |
| Frequentie | Continu, real-time API-calls bij gebruikersacties |
| Datatypen | Prompt-content (profielsamenvatting, vacaturetekst, instructies) — géén raw account/payment data |
| Volume | Schatting: enkele 1000 calls/dag in 2026 |

## 2 · Rechtsinstrument

EU Standard Contractual Clauses (2021/914) **module 2 (controller → processor)** als ondertekend in Anthropic Commercial DPA. CVeetje is controller, Anthropic is processor.

## 3 · Beoordeling toelichting Amerikaans recht

**FISA 702 / Executive Order 12333**: Anthropic valt onder FISA 702 als elektronische communicatiedienst (mogelijk reikwijdte discutabel — Anthropic is geen "ECS" in klassieke zin). Theoretisch risico op bulk-toegang door Amerikaanse inlichtingendiensten.

**Cloud Act**: USA kan via wettelijk verzoek data opvragen die door US-bedrijven wordt verwerkt, ongeacht waar.

**EU-US Data Privacy Framework (DPF)**: Anthropic is **niet** gecertificeerd onder DPF (status mei 2026). Daarom kan DPF niet als primaire rechtsgrond worden gebruikt.

## 4 · Risico-inschatting (per EDPB)

| Stap | Beoordeling |
|---|---|
| Stap 1 — ken je transfers | Voltooid, zie sectie 1. |
| Stap 2 — identificeer instrument | SCC module 2 onder Anthropic DPA. |
| Stap 3 — beoordeel effectiviteit van rechtsinstrument in licht van importeur-rechtsgebied | Effectief voor de meeste verwerkingen. Beperkt door FISA 702 in theorie. |
| Stap 4 — aanvullende maatregelen | Toegepast — zie sectie 5. |
| Stap 5 — formaliteit | DPA ondertekend, SCC's geïncorporeerd. |
| Stap 6 — herhaalde herziening | Jaarlijks of bij Anthropic ToS-wijzigingen. |

## 5 · Aanvullende maatregelen

### Technisch

- **Geen account-credentials in prompts.** Wij sturen alleen tekstuele inhoud die de gebruiker zelf heeft ingevoerd of die uit een gekoppeld profiel komt.
- **Geen unique identifiers in prompts.** UID of e-mailadres wordt niet meegestuurd; Anthropic kan op promptniveau geen koppeling maken met een specifieke persoon (behalve wanneer de gebruiker zijn eigen e-mail in vrije tekst zet — wij filteren dit niet maar waarschuwen wel in de help).
- **TLS 1.2+** voor alle calls naar `api.anthropic.com`.
- **Zero data retention** ingeschakeld waar Anthropic dit aanbiedt (organization-level instelling).
- **Geen logging van prompts** bij Anthropic-side voor langer dan operationele requirements (no-train policy).

### Contractueel

- Anthropic Commercial Terms art. 4.2.b: geen training op API-input.
- DPA incl. SCC's module 2.
- Notificatieplicht bij overheidsverzoeken (Anthropic DPA art. 7).
- Audit-rechten voor CVeetje (DPA art. 8).

### Organisatorisch

- Strikt access-control: alleen Niels van der Werf heeft toegang tot Anthropic-console.
- API-keys geroteerd bij personeelswissel (NVT — single founder, maar procedure gedocumenteerd).
- Periodieke check op Anthropic legal/policy pagina's.

## 6 · Subjectief risico voor betrokkenen

Gemiddelde gebruiker stuurt: CV-achtige informatie + vacaturetekst. Geen bijzondere persoonsgegevens. Geen financiële data. Geen wachtwoorden of API-keys.

Het risico op concrete schade door eventuele Amerikaanse overheidstoegang is laag: een individuele CV-prompt is geen interessante target voor mass-surveillance, en zelfs als data zou worden ingezien, geeft het niet meer prijs dan wat de gebruiker zelf publiceert op zijn LinkedIn-profiel.

## 7 · Conclusie

De doorgifte naar Anthropic onder SCC module 2 mét bovenstaande aanvullende maatregelen biedt een beschermingsniveau dat in essentie gelijkwaardig is aan dat van de AVG. Doorgifte is daarmee toegestaan.

Volgende review: **2027-05-14** (jaarlijks) of bij materiële wijziging in:
- Anthropic-eigendom/locatie
- Amerikaanse FISA-wetgeving (geplande hervorming)
- EU Commission adequacy decision voor de VS
- Schrems III / nieuwe EHJ-uitspraak
