# Retention Policy — Bewaartermijnen

> AVG art. 5 lid 1 sub e: persoonsgegevens niet langer bewaren dan noodzakelijk voor de doeleinden waarvoor ze worden verwerkt.

| Datacategorie | Bewaartermijn | Rechtsgrond | Verwijderingsmechanisme |
|---|---|---|---|
| Account-document (`users/{uid}`) | Zolang account actief; max. 30 dagen na deletion request | Uitvoering overeenkomst | `DELETE /api/settings/account` — synchroon. |
| Profielen (`users/{uid}/profiles/*`) | Tot user verwijdert; bij account-deletion automatisch | Uitvoering overeenkomst | Self-service UI + cascading delete in API. |
| CV's (`users/{uid}/cvs/*`) | Tot user verwijdert; bij account-deletion automatisch | Uitvoering overeenkomst | Self-service UI + cascading delete in API. |
| Sollicitaties (`users/{uid}/applications/*`) | Tot user verwijdert; bij account-deletion automatisch | Uitvoering overeenkomst | Self-service UI + cascading delete in API. |
| Templates (admin) | Onbeperkt voor admin-uploaded; user-uploaded volgt account | Uitvoering overeenkomst | Handmatig admin-beheer. |
| Transacties (`users/{uid}/transactions/*`) | 7 jaar (Algemene wet rijksbelastingen art. 52) | Wettelijke verplichting | Na 7 jaar geanonimiseerd via Cloud Function (toekomstig — handmatig tot dan). |
| Mail queue (`mail/*`) | Tot succesvolle verzending + 30 dagen status logs | Uitvoering overeenkomst | Firebase extension TTL. |
| Feedback → GitHub issues | Zolang issue open + 2 jaar na sluiting | Gerechtvaardigd belang | Handmatige cleanup; eerder verwijderbaar op verzoek. |
| Application logs (Cloud Logging) | 30 dagen | Gerechtvaardigd belang (debugging) | Cloud Logging retention policy. |
| Security/audit logs | 90 dagen geïdentificeerd, daarna geanonimiseerd | Gerechtvaardigd belang | Cloud Logging retention + automatische anonimisatie. |
| Anthropic-side prompt logs | Zero retention waar mogelijk; anders 30 dagen | Verwerkers­overeenkomst | Anthropic-side; we kunnen niet zelf wissen. |
| Adzuna search queries | Geen permanent persisted aan onze kant | NVT | NVT. |
| Cookie `_ga` (na consent) | 13 maanden | Toestemming | Auto-expiry door browser. |
| Cookie `firebase-token` | Sessie / 1 uur (auto-refresh) | Uitvoering overeenkomst | Auto-expiry. |
| `cveetje-cookie-consent` (localStorage) | Onbeperkt totdat user clear | Toestemming | User clears localStorage of intrekt via banner. |

## Backup-overweging

Google Firestore PITR (point-in-time recovery) bewaart writes 7 dagen terug. Verwijderingsverzoek-data kan binnen die 7 dagen via PITR herstelbaar zijn — dit is een **acceptable risk** in de AP-handreiking voor backup-retentie (mits niet gebruikt voor doeleinden buiten DR). We zullen géén actieve restore uitvoeren van verwijderde user-data, behalve voor disaster recovery na catastrofale uitval.

## Periodieke schoonmaak

- **Maandelijks:** check op niet-meer-actieve accounts met 0 logins in 18 maanden → e-mail "we verwijderen je account binnen 90 dagen, log in om te behouden". Na 90 dagen → automatische deletion (toekomstig — handmatig tot dan).
- **Jaarlijks:** review van deze policy.
- **Maandelijks (handmatig):** Firestore `mail` collectie schoongemaakt door extension.

## TODO

- Schedule Cloud Function "expire-stale-accounts" (target Q3 2026).
- Schedule Cloud Function "anonymize-old-transactions" (target Q4 2026 — na 7-jaar-archief check).
- Implementeer log-anonymisatie voor security logs > 90 dagen (target Q3 2026).
