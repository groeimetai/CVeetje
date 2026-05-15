# Register van Verwerkingsactiviteiten (RoPA)

> AVG art. 30 lid 1. Verplicht voor elke verwerkingsverantwoordelijke. Onder de uitzondering van art. 30 lid 5 zou GroeimetAI vrijgesteld kunnen zijn (< 250 medewerkers), maar omdat wij CV's en sollicitatiedata verwerken — categorieën die "risico voor rechten en vrijheden" met zich kunnen brengen — voeren wij wél een register.

**Verwerkingsverantwoordelijke**
GroeimetAI (handelend onder CVeetje)
Fabriekstraat 20, 7311GP Apeldoorn
KvK 90102304 · BTW NL004787305B79
Contact: info@groeimetai.io · Verantwoordelijke: Niels van der Werf

Geen Functionaris Gegevensbescherming (FG) verplicht — wij verwerken geen bijzondere persoonsgegevens op grote schaal en monitoren niet stelselmatig publieke ruimtes (AVG art. 37).

---

## VA-1 · Accountbeheer

| Veld | Waarde |
|---|---|
| Doel | Een gebruikersaccount aanmaken, inloggen, factureren. |
| Rechtsgrond | Art. 6 lid 1 sub b (uitvoering overeenkomst). |
| Categorieën betrokkenen | Geregistreerde gebruikers (volwassenen, 16+). |
| Categorieën gegevens | E-mailadres, naam, profielfoto (optioneel), wachtwoord (gehasht door Firebase), createdAt, llmMode, credits, isAdmin-flag, `ageConfirmed` + `ageConfirmedAt` (AVG art. 8 audit trail). |
| Bijzondere categorieën | Geen. |
| Ontvangers | Google Cloud (Firebase Auth, Firestore) — sub-processor. |
| Doorgifte buiten EER | Geen primaire opslag buiten EER; supportgegevens kunnen door Google-engineers in de VS ingezien worden onder EU-US DPF + SCC's. |
| Bewaartermijn | Zolang account actief; verwijdering binnen 30 dagen na deletion request. |
| Beveiliging | TLS in transit, AES-256 at rest, Firebase Security Rules, MFA voor admin. |
| Leeftijdscheck | Email/password registratie: required checkbox "16+" → opgeslagen in user-doc. OAuth (Google/Apple): leeftijdsverificatie via OAuth-provider, geen eigen check. |

## VA-2 · Profielen & CV's

| Veld | Waarde |
|---|---|
| Doel | Opslag van profielgegevens en gegenereerde CV's voor hergebruik door de gebruiker. |
| Rechtsgrond | Art. 6 lid 1 sub b (uitvoering overeenkomst). |
| Categorieën betrokkenen | Geregistreerde gebruikers + door hen genoemde referenties (alleen contactgegevens). |
| Categorieën gegevens | Werkervaring, opleiding, certificeringen, vaardigheden, hobby's, foto, geboortedatum (optioneel), nationaliteit (optioneel), linkedinURL. |
| Bijzondere categorieën | Mogelijk indirect (bijv. uit hobby's politieke voorkeur). Gebruikers worden gewaarschuwd dergelijke info niet op te nemen. |
| Ontvangers | Google Cloud (Firestore, Storage), Anthropic (Platform AI) of gekozen BYOK-provider. |
| Doorgifte buiten EER | Anthropic (VS) onder SCC + TIA bij Platform AI; geen training op data. BYOK = onder eigen overeenkomst gebruiker. |
| Bewaartermijn | Tot gebruiker profielen/CV's of account verwijdert. |
| Beveiliging | Firestore Security Rules per user-uid, encryption at rest, geen multi-tenant data-mixing. |

## VA-3 · Betaling & Credits

| Veld | Waarde |
|---|---|
| Doel | Verwerken van credit-aankopen, beheer credit-saldo, maandelijkse reset gratis credits. |
| Rechtsgrond | Art. 6 lid 1 sub b (uitvoering overeenkomst) + art. 6 lid 1 sub c (wettelijke fiscale verplichting). |
| Categorieën betrokkenen | Betalende gebruikers. |
| Categorieën gegevens | E-mail, naam, transactie-ID, bedrag, datum, status. Géén PAN (creditcardnummer) — blijft bij Mollie. |
| Ontvangers | Mollie (PSP), Google Cloud (Firestore). |
| Doorgifte buiten EER | Geen (Mollie in NL, Firestore in NL). |
| Bewaartermijn | 7 jaar (Algemene wet rijksbelastingen art. 52). |
| Beveiliging | Webhook HMAC-verificatie, idempotency keys, server-side authorization checks. |

## VA-4 · Sollicitaties (Applications tracker)

| Veld | Waarde |
|---|---|
| Doel | Persoonlijke sollicitatie-pijplijn van de gebruiker bijhouden. |
| Rechtsgrond | Art. 6 lid 1 sub b. |
| Categorieën gegevens | Naam bedrijf, functietitel, status, notities, gekoppeld CV, deadline. |
| Bijzondere categorieën | Geen. |
| Ontvangers | Google Cloud (Firestore). |
| Bewaartermijn | Tot gebruiker entry verwijdert of account beëindigt. |

## VA-5 · Jobs board zoekopdrachten

| Veld | Waarde |
|---|---|
| Doel | Vacatures aggregeren en tonen via Adzuna + Greenhouse/Lever/Recruitee. |
| Rechtsgrond | Art. 6 lid 1 sub f (gerechtvaardigd belang — dienstverlening). |
| Categorieën betrokkenen | Bezoekers, ingelogde gebruikers. |
| Categorieën gegevens | Zoekquery (keywords, locatie). Géén persoonsgegevens worden naar Adzuna gestuurd. |
| Ontvangers | Adzuna (UK), Greenhouse/Lever/Recruitee (variabel). |
| Doorgifte buiten EER | UK onder adequacy decision. ATS providers verschillen — afgebakend tot anonieme HTTP-calls. |
| Bewaartermijn | Geen permanent persisted aan onze kant. |

## VA-6 · Feedback → GitHub Issues

| Veld | Waarde |
|---|---|
| Doel | Productverbetering door gebruikersfeedback. |
| Rechtsgrond | Art. 6 lid 1 sub a (toestemming — knop "verstuur") + sub f (gerechtvaardigd belang). |
| Categorieën gegevens | Vrije tekst, categorie, optionele screenshot, e-mail (alleen indien expliciet meegegeven). |
| Ontvangers | GitHub (privé-repo `groeimetai/CVeetje`). |
| Doorgifte buiten EER | VS onder EU-US DPF + Microsoft DPA. |
| Bewaartermijn | Zolang issue open + 2 jaar nadat gesloten (zacht beleid; gebruiker kan om eerdere verwijdering vragen). |

## VA-7 · Transactionele e-mail

| Veld | Waarde |
|---|---|
| Doel | Verificatie-mail, wachtwoord-reset, credits-laag waarschuwing, account-deletion bevestiging. |
| Rechtsgrond | Art. 6 lid 1 sub b. |
| Categorieën gegevens | E-mailadres, naam, inhoud van mail. |
| Ontvangers | Firebase Trigger Email extension → SMTP-provider (zie `vendor-review.md`). |
| Doorgifte buiten EER | Verzendwachtrij draait in us-central1 (Cloud Run, Google) — bron-data staat in EU Firestore. Onder Google Cloud DPA + SCC's. |
| Bewaartermijn | Mail-document in Firestore wordt na succesvolle verzending verwijderd door de extensie (status 'SUCCESS' → cleanup TTL 30 dagen). |

## VA-8 · Logging & Security

| Veld | Waarde |
|---|---|
| Doel | Foutopsporing, misbruikdetectie, beveiliging. |
| Rechtsgrond | Art. 6 lid 1 sub f (gerechtvaardigd belang). |
| Categorieën gegevens | IP-adres, user-uid, endpoint, statuscode, timestamp, evt. error stack. |
| Ontvangers | Google Cloud Logging. |
| Bewaartermijn | 30 dagen application logs, 90 dagen security logs, daarna geanonimiseerd of verwijderd. |
| Beveiliging | Toegang beperkt tot IAM-geautoriseerd personeel. |

## VA-10 · Admin Audit Log

| Veld | Waarde |
|---|---|
| Doel | Accountability voor admin-acties op persoonsgegevens (AVG art. 32 lid 1 sub b/d). |
| Rechtsgrond | Art. 6 lid 1 sub c (wettelijke verplichting AVG art. 32) + sub f (gerechtvaardigd belang misbruikdetectie). |
| Categorieën gegevens | adminUid, action, targetUid, metadata (vóór/na waardes bij credit-mutaties), IP, user-agent, timestamp. |
| Ontvangers | Google Cloud (Firestore — collectie `admin_audit_log`). |
| Bewaartermijn | 5 jaar (verantwoordingsbewijs onder AVG art. 5 lid 2 + AP-aanbeveling). |
| Beveiliging | Immutable (Firestore Security Rules: alleen Admin SDK kan schrijven, geen update/delete). |
| Implementatie | `src/lib/admin/audit-log.ts` — gebruikt door `/api/admin/impersonate` (start/stop), `/api/admin/users/[userId]` (role/disable/enable/delete), `/api/admin/users/[userId]/credits` (PATCH). |

## VA-9 · Cookies / Analytics

Zie `/cookies` voor de publieke cookie-lijst. Alleen `_ga` en `_ga_<id>` zijn niet-essentieel en worden uitsluitend na expliciete toestemming geladen, met `anonymize_ip`.

---

## Vrijgestelde categorieën

CVeetje verwerkt **niet**:

- Bijzondere persoonsgegevens (ras, religie, politieke voorkeur, gezondheid, seksuele oriëntatie, biometrie, lidmaatschap vakbond) bewust of structureel.
- Persoonsgegevens van minderjarigen onder 16.
- Strafrechtelijke persoonsgegevens.
- Persoonsgegevens van personen zonder hun toestemming of een andere rechtsgrond.

Indien een gebruiker tóch dergelijke informatie aan zijn profiel toevoegt, geldt dat als zijn eigen keuze en wordt het binnen zijn eigen account opgeslagen onder dezelfde technische maatregelen (encrypted at rest, scoped Security Rules).
