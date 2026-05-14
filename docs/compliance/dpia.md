# Light DPIA — CVeetje

> AVG art. 35. Een volledige DPIA is wettelijk verplicht bij verwerkingen met "hoog risico voor rechten en vrijheden". Onze risicobeoordeling concludeert dat CVeetje **niet** valt onder de WP29-criteria die een volledige DPIA verplichten. We voeren toch een light-DPIA om de afweging vast te leggen en proportionele maatregelen te documenteren.

## 1 · Beschrijving van de verwerking

CVeetje is een SaaS waarmee individuele werkzoekenden hun eigen CV en motivatiebrief schrijven met AI-ondersteuning. Centrale activiteiten:

- Profielen aanmaken en opslaan (werkervaring, opleiding, vaardigheden).
- CV's, motivatiebrieven en LinkedIn-content genereren via AI (Anthropic Claude — Platform AI, of eigen API-sleutel).
- Sollicitaties bijhouden (applications tracker).
- Vacatures aggregeren via publieke ATS-bronnen (read-only).

De gebruiker is altijd de bron van zijn eigen data en de eindgebruiker van de output.

## 2 · WP29 / AP-criteria

We doorlopen de negen criteria uit WP248 rev.01:

| # | Criterium | Van toepassing? | Toelichting |
|---|---|---|---|
| 1 | Evaluatie of scoring | Beperkt | Fit-analyse is een indicatieve score voor de gebruiker zelf. Geen profiling met rechtsgevolgen. |
| 2 | Automatische besluiten met rechts­gevolgen | Nee | CVeetje neemt geen besluiten over de gebruiker. AVG art. 22 niet van toepassing. |
| 3 | Systematische monitoring | Nee | Geen tracking van publieke ruimtes of stelselmatig gedrag. |
| 4 | Bijzondere persoonsgegevens / zeer persoonlijke aard | Beperkt | Een CV is "persoonlijk" maar bevat normaal geen bijzondere categorieën. Wij vragen daar niet om. |
| 5 | Gegevens op grote schaal | Nee | Niet "op grote schaal" in de zin van WP29 (geen miljoenen profielen, geen real-time aggregatie). |
| 6 | Matching of combineren van datasets | Nee | Wij combineren geen externe datasets met gebruikers­profielen. Vacatures worden alleen op verzoek opgehaald. |
| 7 | Kwetsbare betrokkenen | Beperkt | Werkzoekenden kunnen zich in kwetsbare situatie bevinden (werkloos, financieel). We beperken misbruik via consumentvriendelijke voorwaarden. |
| 8 | Innovatief gebruik van nieuwe technologische oplossing | Ja | LLM-inzet (Anthropic Claude) is recente technologie. Daarom deze light-DPIA. |
| 9 | Wanneer de verwerking betrokkenen verhindert een recht uit te oefenen | Nee | Geen toegang tot dienst geblokkeerd zonder rechtsgrond. |

**Aantal "Ja"-criteria: 1 voltallig (8), 3 "beperkt" (1, 4, 7). De AP-richtlijn (WP248) geeft aan dat **minimaal twee criteria** doorgaans verplichten tot een volledige DPIA. We zitten daar net onder. We houden de light-DPIA aan, met expliciete monitoring of het beeld verandert.

## 3 · Noodzaak en evenredigheid

- **Noodzaak:** zonder AI is de service inhoudelijk waardeloos; gebruikers kiezen bewust voor AI-ondersteuning.
- **Evenredigheid:** de hoeveelheid data per gebruiker is beperkt tot wat nodig is voor een CV; we vragen niet om meer.
- **Doelbinding:** data wordt niet voor andere doelen gebruikt; geen verkoop aan derden; geen advertenties.
- **Dataminimalisatie:** veel velden zijn optioneel (geboortedatum, nationaliteit, foto). De gebruiker bepaalt.

## 4 · Risico's en mitigaties

| Risico | Waarschijnlijkheid | Impact | Mitigatie |
|---|---|---|---|
| AI hallucineert valse werkervaring → misleidende CV bij werkgever | Middel | Middel | Strikte anti-hallucinatie-prompts (`src/lib/ai/cv-generator.ts`); dispute-flow; expliciete user-verantwoordelijkheid in voorwaarden en `/ai-transparency`. |
| Data-doorgifte naar VS (Anthropic) → minder bescherming dan EER | Middel | Middel | SCC's module 2, TIA uitgevoerd (`transfer-impact-assessment.md`), zero retention bij Anthropic, geen training op API-data. |
| Datalek bij Firebase | Laag | Hoog | Google Cloud security, AES-256 at rest, scoped Security Rules, MFA voor admins, 72u meldplicht-procedure (`incident-response.md`). |
| Misbruik van AI om frauduleus CV te genereren | Middel | Laag-Middel | Prompts verbieden verzinnen; gebruikersvoorwaarden verbieden fraude; geen mogelijkheid tot bulk-generatie. |
| Bias in AI-output (gendered taal, leeftijdsdiscriminatie) | Middel | Middel | Generieke prompts zonder demografische sturing; user reviewt zelf; dispute-knop voor correctie. |
| API-sleutel-diefstal (BYOK) | Laag | Hoog (voor gebruiker, niet voor CVeetje) | AES-256-GCM voor opslag, sleutel nooit teruggegeven aan client, alleen server-side decrypt op gebruik. |
| Account-takeover via phishing | Middel | Hoog | Firebase Auth incl. e-mail-verificatie; reCAPTCHA v3; password-reset flow; geen wachtwoord-resets per chat. |
| Onbedoelde publicatie van CV-data | Laag | Hoog | Firestore Security Rules per `users/{uid}/...`; geen publieke shares zonder expliciete share-link (niet geïmplementeerd). |
| Schending recht van betrokkene (vergetelheid, inzage) | Laag | Middel | DSR-procedure (`dsr-procedure.md`); self-service deletion + JSON-export. |

## 5 · Toezicht

We monitoren periodiek (minimaal jaarlijks):

- Nieuwe AI-modellen / providers → her-classificatie onder AI Act.
- Nieuwe subverwerkers → herziening RoPA + sub-processors-pagina + 14-dagen notificatie aan gebruikers.
- Audit logs op admin-acties.
- Incidenten en near-misses (`incident-response.md`).

## 6 · Conclusie

De verwerkingen van CVeetje vormen **geen hoog risico** voor rechten en vrijheden van betrokkenen, mits de bovenstaande maatregelen blijven gelden. Een volledige DPIA is op dit moment niet verplicht. Een herbeoordeling vindt jaarlijks plaats of zodra (a) de schaal significant toeneemt, (b) er high-risk Annex III AI-features aan worden toegevoegd, of (c) wij bijzondere persoonsgegevens gaan verwerken.

Eerstvolgende review: **2027-05-14** (jaarlijks).
