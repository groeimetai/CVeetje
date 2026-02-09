# Transfer Impact Assessment (TIA)

## Internationale doorgifte van persoonsgegevens aan Anthropic, PBC (VS)

**Verantwoordelijke:** GroeimetAI, Fabriekstraat 20, 7311GP Apeldoorn, Nederland
**KvK:** 90102304
**Datum:** 9 februari 2026
**Versie:** 1.0
**Status:** Intern compliance-document (niet publiek)

---

## 1. Inleiding

Dit document bevat de Transfer Impact Assessment (TIA) zoals vereist door de Standard Contractual Clauses (SCC's, clausule 14) voor de internationale doorgifte van persoonsgegevens vanuit de EU/EER naar de Verenigde Staten. De TIA beoordeelt of het rechtskader in het land van bestemming (VS) adequate bescherming biedt voor de doorgegeven persoonsgegevens, en of aanvullende maatregelen nodig zijn.

## 2. Beschrijving van de doorgifte

| Aspect | Details |
|--------|---------|
| **Data-exporteur** | GroeimetAI (handelend als CVeetje), Nederland |
| **Data-importeur** | Anthropic, PBC, San Francisco, VS |
| **Rol exporteur** | Verwerkingsverantwoordelijke |
| **Rol importeur** | Verwerker (data processor) |
| **Transfermechanisme** | Standard Contractual Clauses (SCC's), Module 2 (Controller to Processor) |
| **Toepasselijke SCC's** | Opgenomen in Anthropic Data Processing Addendum (DPA), automatisch geaccepteerd bij gebruik van Anthropic Commercial Terms |

### 2.1 Welke persoonsgegevens worden doorgegeven

Bij elke AI API-call worden de volgende categorieën persoonsgegevens naar Anthropic gestuurd:

- **Naam** van de gebruiker (voornaam, achternaam)
- **Contactgegevens** (e-mail, telefoonnummer, adres — voor zover in profiel)
- **Werkervaring** (functietitels, bedrijfsnamen, periodes, beschrijvingen)
- **Opleiding** (instituten, diploma's, periodes)
- **Vaardigheden en competenties**
- **Taalvaardigheden**
- **Vacaturetekst** (bevat mogelijk bedrijfsnaam, contactpersoon)

### 2.2 Welke gegevens worden NIET doorgegeven

- BSN of andere nationale identificatienummers
- Financiele gegevens (bankrekening, creditcard)
- Bijzondere persoonsgegevens (medisch, religie, etniciteit, politieke voorkeur, seksuele geaardheid)
- Wachtwoorden of authenticatiegegevens
- Betaalgegevens

### 2.3 Betrokkenen

Eindgebruikers van CVeetje die de "Platform AI" modus gebruiken. Dit zijn werkzoekenden in de EU/EER die vrijwillig hun profielgegevens invoeren om een CV te laten genereren.

### 2.4 Doel van de doorgifte

De persoonsgegevens worden uitsluitend doorgegeven om:
1. CV-content te genereren (samenvattingen, ervaringsbeschrijvingen, vaardigheidssecties)
2. Vacatureteksten te analyseren
3. Fit-analyses uit te voeren (profiel vs. vacature matching)
4. Motivatiebrieven te genereren
5. Stijlsuggesties te genereren

## 3. Beoordeling van het rechtskader in de VS

### 3.1 Relevante wetgeving in de VS

| Wetgeving | Relevantie | Risiconiveau |
|-----------|-----------|--------------|
| **FISA Section 702** | Staat surveillance toe van niet-VS personen via US-bedrijven | Theoretisch risico |
| **Executive Order 12333** | Staat bulk-surveillance toe buiten VS | Laag risico (betreft data in transit) |
| **Executive Order 14086** (okt 2022) | Beperkt surveillance tot "noodzakelijk en proportioneel", richt Privacy and Civil Liberties Oversight Board in | Mitigerend |
| **CLOUD Act** | Verplicht US-bedrijven data te verstrekken aan rechtshandhaving | Theoretisch risico |

### 3.2 EU-US Data Privacy Framework (DPF)

Anthropic is **niet gecertificeerd** onder het EU-US Data Privacy Framework (per februari 2026). Dit betekent dat we niet kunnen leunen op het DPF als transfermechanisme. De doorgifte is daarom gebaseerd op SCC's als alternatief transfermechanisme onder artikel 46(2)(c) AVG.

### 3.3 Beoordeling van het risico

**Factoren die het risico beperken:**

1. **Aard van de gegevens**: De doorgegeven gegevens zijn overwegend professionele CV-data (werkervaring, opleiding, vaardigheden). Dit zijn geen bijzondere persoonsgegevens (Art. 9 AVG) en geen gegevens met hoog risico voor de betrokkene bij ongeautoriseerde toegang.

2. **Geen interessegebied voor inlichtingendiensten**: CV-data van werkzoekende EU-burgers heeft geen plausibel verband met nationale veiligheid, terrorisme, of andere doelen waarvoor FISA 702 of EO 12333 worden ingezet.

3. **Transient verwerking**: Anthropic bewaart API-inputs en -outputs maximaal 30 dagen en verwijdert deze daarna automatisch. Er is geen permanente opslag van persoonsgegevens.

4. **Geen training op gebruikersdata**: Anthropic gebruikt data van commercial API-klanten niet voor het trainen van AI-modellen (conform hun API Terms of Service).

5. **Executive Order 14086**: Sinds oktober 2022 heeft de VS aanvullende waarborgen ingevoerd die surveillance beperken tot wat "noodzakelijk en proportioneel" is, met een klachtmechanisme voor EU-burgers via de Data Protection Review Court.

6. **Beperkt volume**: De doorgifte betreft individuele API-calls per gebruikerssessie, niet bulk-overdrachten van databases.

**Conclusie risicobeoordeling:** Het risico dat de doorgegeven persoonsgegevens worden opgevraagd door VS-autoriteiten is **zeer laag**, gezien de aard van de gegevens (professionele CV-informatie), het gebrek aan relevantie voor nationale veiligheids doeleinden, en de transiente aard van de verwerking.

## 4. Waarborgen en aanvullende maatregelen

### 4.1 Contractuele waarborgen

| Waarborg | Status |
|----------|--------|
| **Data Processing Addendum (DPA)** | Actief — automatisch opgenomen in Anthropic Commercial Terms |
| **Standard Contractual Clauses (Module 2)** | Opgenomen in DPA |
| **Geen verkoop/delen van persoonsgegevens** | Contractueel vastgelegd in DPA |
| **Data retention: max 30 dagen** | Conform Anthropic API-voorwaarden |
| **Geen gebruik voor AI-training** | Conform Anthropic Commercial API Terms |
| **Melding beveiligingsincidenten** | Binnen 48 uur, conform DPA |
| **Subverwerkers** | Anthropic informeert over wijzigingen in subverwerkers |

### 4.2 Technische waarborgen

| Maatregel | Details |
|-----------|---------|
| **Encryptie in transit** | TLS 1.2+ voor alle API-communicatie |
| **Encryptie at rest** | AES-256 voor opgeslagen data |
| **Toegangscontrole** | API key-gebaseerde authenticatie |
| **Minimalisatie** | Alleen noodzakelijke profielgegevens worden meegestuurd |

### 4.3 Organisatorische waarborgen bij Anthropic

| Maatregel | Details |
|-----------|---------|
| **SOC 2 Type II** | Onafhankelijk geauditeerd |
| **ISO 27001:2022** | Gecertificeerd |
| **ISO/IEC 42001:2023** | AI Management Systems gecertificeerd |
| **Jaarlijkse audits** | Door onafhankelijke derde partijen |

### 4.4 Aanvullende maatregelen door CVeetje

- Gebruikers worden vooraf geinformeerd dat data naar de VS wordt gestuurd (AI Transparantie pagina, Platform AI instellingen)
- Gebruikers hebben de keuze om hun eigen API key te gebruiken in plaats van Platform AI
- API keys van gebruikers worden versleuteld opgeslagen met AES-256
- Geen bijzondere persoonsgegevens worden doorgegeven aan Anthropic
- Data minimalisatie: alleen de voor de AI-functie noodzakelijke gegevens worden meegestuurd

## 5. Conclusie

Op basis van deze beoordeling concluderen wij dat:

1. **De doorgifte rechtmatig is** op basis van Standard Contractual Clauses (Module 2) als transfermechanisme onder artikel 46(2)(c) AVG.

2. **Het beschermingsniveau adequaat is** gezien:
   - De aard van de gegevens (professionele CV-data, geen bijzondere persoonsgegevens)
   - De contractuele waarborgen (DPA, SCC's, geen training op data)
   - De technische waarborgen (encryptie, access control, 30-dagen retention)
   - De organisatorische waarborgen bij Anthropic (SOC 2, ISO 27001, ISO 42001)
   - Het zeer lage risico op toegang door VS-autoriteiten

3. **Aanvullende maatregelen** zoals transparantie naar gebruikers, keuzevrijheid (eigen API key), en data minimalisatie zijn geimplementeerd.

4. **De doorgifte kan doorgaan** zonder dat aanvullende technische maatregelen (zoals pseudonimisering of lokale verwerking) noodzakelijk zijn, gezien het lage risicoprofiel van de data.

## 6. Herziening

Deze TIA wordt herzien:
- Jaarlijks (volgende herziening: februari 2027)
- Bij wijzigingen in Anthropic's verwerkerspraktijken of certificeringen
- Bij relevante juridische ontwikkelingen (bijv. ongeldigverklaring EU-US DPF, wijzigingen in FISA)
- Bij wijzigingen in de aard of omvang van de doorgegeven gegevens

---

**Opgesteld door:** GroeimetAI
**Datum:** 9 februari 2026
