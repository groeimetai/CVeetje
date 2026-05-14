# Fundamental Rights Impact Assessment (FRIA)

> AI Act art. 27 verplicht een FRIA alleen voor publieke instanties en bepaalde private deployers van high-risk AI (Annex III). CVeetje valt niet onder die verplichting. We stellen toch vrijwillig een FRIA op om transparantie te tonen en als anker bij toekomstige feature-uitbreidingen.

Versie 1.0 — 2026-05-15

## 1 · AI-systeem in scope

| Veld | Waarde |
|---|---|
| Naam | CVeetje |
| Doel | CV- en motivatiebrief-generatie, fit-analyse, stijl-generatie via LLM. |
| Deployer | GroeimetAI (CVeetje). |
| Provider GPAI | Anthropic (Claude Opus 4.7) — bij Platform AI. Bij BYOK: gebruikerskeuze. |
| Inzetcontext | Consumenten-app voor werkzoekenden. Niet voor werkgevers/recruiters. |
| Verwacht aantal eindgebruikers (NL) | < 50.000 in 2026 (schatting). |

## 2 · Beoogde fundamentele rechten in scope

Gebaseerd op het EU Handvest van de grondrechten en de Nederlandse Grondwet:

| Recht | Risico-richting | Beoordeling |
|---|---|---|
| Recht op privéleven (art. 7 Handvest, art. 10 GW) | AI-tool verwerkt CV-data | Beheerst — strikte rechtsgronden, dataminimalisatie, opt-out altijd mogelijk. |
| Bescherming persoonsgegevens (art. 8) | Inherent | Beheerst — zie `dpia.md`. |
| Non-discriminatie (art. 21) | LLM-output kan stereotypen reproduceren | **Aandachtspunt** — gemitigeerd door reviewable output, geen automatische beslissing. |
| Vrijheid van beroep (art. 15) | Positief — tool helpt mensen aan werk te komen | Voordeel. |
| Toegang tot rechtsmiddelen (art. 47) | Output kan iemand bij werkgever benadelen | Beheerst — fit-score is alleen voor gebruiker zelf, niet gedeeld met werkgever. |
| Menselijke waardigheid (art. 1) | AI kan gevoelig overkomen bij job-rejection vibes | Voordeel — geen rejection, alleen schrijfhulp. |
| Rechten van kinderen (art. 24) | 16+ minimumleeftijd | Beheerst — registratie blokkeert <16. |
| Sociaal recht / participatie | Toegankelijkheid voor minder draagkrachtigen | 10 gratis credits/maand mitigeert toegangsbarrière. |

## 3 · Categorieën betrokken personen

- Geregistreerde gebruikers (volwassenen 16+, divers naar opleiding/inkomen/herkomst).
- Geen indirecte betrokkenheid van werkgevers — die zien alleen het eindproduct dat de gebruiker zelf naar hen stuurt.
- Geen verwerking van data van derden zonder hun toestemming (referenties krijgen alleen contactgegevens, geen profilering).

## 4 · Risico-analyse per recht

### Non-discriminatie

**Risico:** LLM-output bevat onbewust seksistische, leeftijdsgerelateerde of cultureel-bevooroordeelde framing (bijv. "energieke jonge professional"). Dit kan iemand schaden in een sollicitatieproces, ook al ziet de werkgever de prompt niet.

**Mitigatie:**
- Prompts zijn neutraal geformuleerd; geen demografische sturing.
- De gebruiker reviewt elke output voor verzending.
- Dispute-knop voor het melden van problematische framing → gatekeeper-LLM beoordeelt + regenereert.
- Reguliere review van high-traffic prompts op bias-patronen.

**Restrisico:** laag. Verbetering via prompt-tuning + community-feedback (`feedback`-flow).

### Toegang en evenwicht

**Risico:** Wie geen credits kan betalen en geen eigen API-sleutel heeft, kan toch de dienst niet gebruiken voor uitgebreide AI.

**Mitigatie:** 10 gratis credits per maand. BYOK is mogelijk met providers die zelf gratis tiers aanbieden (Google Gemini Flash, Groq, etc.).

### Transparantie

**Risico:** Gebruiker begrijpt niet dat AI in zijn naam schrijft.

**Mitigatie:** Art. 50 transparantie + AI-geletterdheid (zie `ai-act-classification.md`).

## 5 · Belanghebbenden geconsulteerd

CVeetje is op dit moment een single-founder product. Consultatie gebeurt via:

- Publieke feedback-flow (gebruikersinzendingen).
- Dispute-flow als formeel bezwaarinstrument.
- Roadmap-issues op GitHub (`groeimetai/CVeetje` privé, geanonimiseerd).

Bij groei naar > 10.000 actieve gebruikers/maand: formele gebruikersraad of ethics-board overwegen.

## 6 · Monitoring

- Maandelijks: review van disputes-data om systematische bias of fouten te detecteren.
- Kwartaalslot: re-check van AI-output samples op niet-inclusieve framing.
- Jaarlijks: volledige FRIA-update.

## 7 · Conclusie

De inzet van AI in CVeetje raakt fundamentele rechten in beperkte mate. De voornaamste aandacht­punten zijn (a) non-discriminatie in output en (b) duidelijke transparantie naar gebruikers. Beide zijn momenteel gemitigeerd. Geen blokkerend risico voor inzet.

Volgende review: **2027-05-14**.
