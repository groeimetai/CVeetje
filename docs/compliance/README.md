# Compliance Dossier — CVeetje

> **Doel:** intern dossier dat aantoont hoe CVeetje voldoet aan de AVG en de EU AI Act. Bewaar dit dossier minimaal zo lang als CVeetje operationeel is plus 5 jaar daarna. Bij audit door de Autoriteit Persoonsgegevens of een AI Act-toezichthouder is dit dossier het startpunt.

Laatst bijgewerkt: 2026-05-15
Versie: 1.0
Verantwoordelijke: Niels van der Werf (GroeimetAI) — niels@groeimetai.io

## Inhoud

| Document | Wettelijke basis | Status |
|---|---|---|
| [`record-of-processing.md`](./record-of-processing.md) | AVG art. 30 (Register van verwerkingsactiviteiten) | Actief |
| [`dpia.md`](./dpia.md) | AVG art. 35 (light DPIA / pre-DPIA) | Actief |
| [`ai-act-classification.md`](./ai-act-classification.md) | Verordening (EU) 2024/1689 art. 6 + 50 | Actief |
| [`fria.md`](./fria.md) | AI Act art. 27 (FRIA — vrijwillig voor limited risk) | Actief |
| [`sub-processors.md`](./sub-processors.md) | AVG art. 28 | Actief |
| [`transfer-impact-assessment.md`](./transfer-impact-assessment.md) | AVG hoofdstuk V (Schrems II / EDPB Recommendations 01/2020) | Actief |
| [`dsr-procedure.md`](./dsr-procedure.md) | AVG art. 12-23 (rechten betrokkenen) | Actief |
| [`incident-response.md`](./incident-response.md) | AVG art. 33-34 | Actief |
| [`retention-policy.md`](./retention-policy.md) | AVG art. 5 lid 1 sub e | Actief |
| [`vendor-review.md`](./vendor-review.md) | AVG art. 28 lid 1 + ISO 27701 | Actief |

## Publieke kant

Wat hier intern staat, wordt samengevat en publiek gemaakt op:

- `/privacy` — privacybeleid (AVG art. 13)
- `/terms` — algemene voorwaarden + AI-disclaimer (AI Act art. 50)
- `/ai-transparency` — AI-modellen, doel, dataflow, classificatie
- `/cookies` — cookie-overzicht
- `/sub-processors` — publieke subverwerkers-lijst (AVG art. 28 lid 2)
- `/compliance` — overkoepelend overzicht

## Wijzigingsbeheer

Elke wijziging in:

- toegevoegde of beëindigde subverwerker → update `sub-processors.md` + `/sub-processors`-pagina, informeer gebruikers via e-mail (14 dagen vóór wijziging).
- nieuw AI-model of provider → update `ai-act-classification.md` + `/ai-transparency`.
- bewaartermijn-wijziging → update `retention-policy.md` + `/privacy`.
- nieuwe verwerkingsactiviteit → update `record-of-processing.md`.

Commit hash en datum vormen het audit trail. Géén separate ondertekening nodig — versiebeheer in git is voldoende voor administratieve doeleinden (AP-handreiking 2023 "RvA voor MKB").
