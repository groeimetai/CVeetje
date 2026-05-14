# Sub-processors — Interne Verwerkers Lijst

> AVG art. 28. Spiegelt de publieke pagina `/sub-processors` met aanvullende interne velden (contracten, contactpersonen, DPA-versies).

Laatst bijgewerkt: 2026-05-15

## Productie-subverwerkers

### 1 · Google Cloud Platform (Firebase Auth, Firestore, Cloud Storage, Cloud Run, Cloud Logging)

| Veld | Waarde |
|---|---|
| Verwerker | Google Ireland Ltd. (EU) / Google LLC (US) |
| DPA | Google Cloud Data Processing Addendum — geaccepteerd 2025-xx-xx (zie console.cloud.google.com → contract acceptance). |
| Versie | "Cloud Data Processing Addendum (Customers)" met EU SCC's (2021/914) module 2. |
| Locatie | europe-west4 (Eemshaven). |
| Contact | https://cloud.google.com/contact |
| Sub-sub-processors lijst | https://cloud.google.com/terms/subprocessors |

### 2 · Anthropic, PBC

| Veld | Waarde |
|---|---|
| Verwerker | Anthropic, PBC — San Francisco, CA, USA |
| DPA | Anthropic Commercial Data Processing Addendum (2024-Q3 versie). |
| SCC's | EU SCCs (2021/914) module 2 — bijlage bij DPA. |
| Locatie verwerking | USA (us-west, us-east). |
| Training op data | Géén — Commercial Terms art. 4.2.b. |
| Retentie | Zero retention waar mogelijk (Anthropic Console → org settings → "Zero data retention"). |
| Contact | privacy@anthropic.com |
| Sub-sub-processors | https://www.anthropic.com/legal/subprocessors |

### 3 · Mollie B.V.

| Veld | Waarde |
|---|---|
| Verwerker | Mollie B.V., Keizersgracht 313, Amsterdam |
| DPA | Mollie Data Processing Agreement — geaccepteerd bij account-aanmaak. |
| Locatie | Nederland. |
| Status | Mollie is **zelfstandig verwerkingsverantwoordelijke** voor de transactie-data (PSD2), CVeetje is dat voor de orderdata. |
| Contact | privacy@mollie.com |

### 4 · Adzuna Ltd.

| Veld | Waarde |
|---|---|
| Verwerker | Adzuna Ltd., UK |
| Soort relatie | API-consumer — wij sturen alleen zoekquery's. Geen persoonsgegevens van eindgebruikers in transit. |
| Locatie | Verenigd Koninkrijk (adequacy decision EU Commissie). |
| Contact | enterprise@adzuna.com |

### 5 · GitHub, Inc. (Microsoft)

| Veld | Waarde |
|---|---|
| Verwerker | GitHub, Inc. — San Francisco / Microsoft Corporation |
| DPA | Microsoft Products and Services DPA — geaccepteerd 2025-xx-xx. |
| Locatie | USA. |
| SCC's | EU SCCs + EU-US Data Privacy Framework certificering. |
| Doel | Feedback-issues in privé-repo `groeimetai/CVeetje`. |
| Contact | privacy@github.com |

### 6 · Google reCAPTCHA v3 (Google Ireland Ltd.)

| Veld | Waarde |
|---|---|
| Verwerker | Google Ireland Ltd. |
| DPA | Inbegrepen onder Google Cloud DPA. |
| Locatie | EU + USA. |
| Doel | Abuse detection bij register/login. |
| Rechtsgrond | Art. 6 lid 1 sub f (gerechtvaardigd belang). |

### 7 · Firebase Trigger Email extension

| Veld | Waarde |
|---|---|
| Verwerker | Google LLC (extensie draait als Cloud Run service onder ons project). |
| Locatie | us-central1 (Cloud Run service voor de extensie). |
| Locatie bron-data | europe-west4 (Firestore `mail` collectie). |
| Verbeterpunt | Migreren naar EU-only SMTP-provider of zelf-gehoste mailer in europe-west4. Op de roadmap. |

### 8 · Google Analytics 4 (optioneel — alleen na consent)

| Veld | Waarde |
|---|---|
| Verwerker | Google Ireland Ltd. |
| DPA | Inbegrepen onder Google Cloud DPA. |
| Config | `anonymize_ip: true`, geen Google Signals, geen advertising features. |
| Activatie | Alleen na expliciete cookie-consent. |

## BYOK-providers (géén subverwerker van CVeetje)

Wanneer een gebruiker een eigen API-sleutel instelt, treedt CVeetje op als doorgever. De gebruiker is dan zelf verantwoordelijk voor de relatie met de provider (OpenAI, Google, Mistral, Groq, DeepSeek, Together, Fireworks, Azure, Cohere, etc.). Wij sluiten **geen** DPA met deze providers voor BYOK-gebruik.

## Toegevoegde subverwerkers — notificatie-procedure

1. Beoordeel de nieuwe subverwerker tegen `vendor-review.md` checklist.
2. Onderteken DPA (e-mail of console-flow).
3. Update dit document + `/sub-processors`-pagina.
4. Stuur 14 dagen vóór live-gang een e-mail aan alle actieve gebruikers met de wijziging.
5. Stem af met juridisch (extern adviseur indien nodig) bij US/non-EER providers.

## Verwijderen subverwerker

1. Migreer data weg.
2. Bevestig deletion door subverwerker (schriftelijk).
3. Update dit document + publieke pagina.
4. Update RoPA.
