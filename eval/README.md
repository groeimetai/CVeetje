# Documentgeneratie-evaluatie

Harnas om de kwaliteit van de gegenereerde documenten (CV-content, stijl, PDF, motivatiebrief) reproduceerbaar te meten. Het roept de bibliotheekfuncties direct aan, zonder Firebase en zonder credits.

```bash
# Echte AI (Anthropic). De key niet committen; zet hem als environment-secret.
ANTHROPIC_API_KEY=sk-ant-... npm run eval:docgen
npm run eval:docgen -- --judge                # + LLM-judge per case
npm run eval:docgen -- --case junior-zorg     # één case
npm run eval:docgen -- --model claude-opus-4-7

# Plumbing-check zonder kosten (gebruikt de e2e mock-AI)
npm run eval:docgen -- --mock
```

Output: `eval/output/<run>/` (gitignored). Per case vind je daar `cv.html`, `cv-a4.pdf`, `cv-single.pdf`, `brief.pdf`, `brief.docx` en `trace.json` (vacature, fit, tokens, content, brief, checks, logs). Op het hoogste niveau staan `summary.md` en `summary.json`.

## Fixtures

- `fixtures/profiles.ts`: vier fictieve profielen, elk gericht op een ander risico:
  - een rijk profiel (verzonnen cijfers?);
  - een dun profiel zonder beschrijvingen (verzonnen taken?);
  - een carrièreswitcher met Engelse output (overdrijving?);
  - een cv met een gat (data correct?).
- `fixtures/vacancies.ts`: vier vacatures (tech, zorg, data, sales) en de matrix `CASES`, inclusief één case zonder vacature.

## Automatische checks (`checks.ts`)

| Check | Wat |
|---|---|
| `volledigheid` | samenvatting, headline, aantal rollen, opleiding, skills en talen t.o.v. het profiel |
| `taalconsistentie` | geen Engelse "Present"/"Native"/maanden in NL-cv's en omgekeerd |
| `bullets` | aantal bullets per rol, lengte per bullet |
| `verzonnen-getallen` | getallen en percentages in de output die niet in het profiel staan |
| `keyword-dekking` | vacature-keywords die in het profiel staan, moeten ook in het CV staan |
| `ai-tells` | clichés ("results-driven", "gepassioneerd", em-dashes …) |
| `claim-validator-strips` | wat de claim-validator na generatie heeft weggegooid |
| `pdf-cv-a4` / `pdf-cv-single` | aantal pagina's |
| `brief-docx` | dubbele datum, dubbele onderwerpregel, afsluiting in de juiste taal, lengte |

## LLM-judge (`judge.ts`)

Een rubric met scores van 1 tot 5 op eerlijkheid, relevantie, leesbaarheid, ATS en de brief, met citaten als onderbouwing en de top-3 verbeterpunten. Een verzonnen claim betekent maximaal 2 punten op eerlijkheid.
