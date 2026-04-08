# /deploy-status

Toon de meest recente Cloud Build run en Cloud Run revisie voor cveetje. Helpt bij het diagnosticeren van deploy-problemen of bevestigen dat een push live staat.

## Stappen

1. **Roep de `cloudbuild` MCP server aan** voor de meest recente builds:
   - Tool: `list_recent_builds`
   - Argument: `limit=5`
   - Output: laatste 5 builds met `id`, `status` (SUCCESS/FAILURE/WORKING), `createTime`, `source` (commit SHA + branch).

2. **Identificeer de meest recente succesvolle build.** Als de allerlaatste FAILURE is: roep `describe_build` aan met dat ID en toon de eerste error-regels uit de logs (max 30 regels).

3. **Roep `describe_service`** aan voor `cveetje` in `europe-west4`:
   - Tool: `describe_run_service`
   - Argument: `service=cveetje`, `region=europe-west4`
   - Output: actieve revisie, traffic split, latest deployed image, environment variabelen die geset zijn (zonder waarden te tonen — alleen sleutels).

4. **Vergelijk** de actieve revisie met de laatste SUCCESS build:
   - Match: alles is in sync. Rapporteer "✅ Live: <commit-sha-short> on revision <name>".
   - Mismatch: rapporteer "⚠️ Drift: laatste build SUCCESS is <sha>, maar live revisie is <sha>". Mogelijke oorzaken: deployment heeft gefaald, manuele revisie-pin, traffic split.

5. **Optioneel: roep de `github-cveetje` MCP** aan om de commit-message van de live revisie te tonen voor extra context:
   - Tool: `get_commit`
   - Argument: `sha=<short-sha>`

## Regels

- **Geen secrets in de output.** Environment-variabelen alleen op naam, nooit waardes.
- **Bij MCP errors**: meld het aan de gebruiker en stop. Geen fallback naar `gcloud`-CLI calls vanuit Bash — dat omzeilt de credential-isolatie.
- **Lees-only.** Geen `gcloud run deploy`, geen `gcloud builds submit`. Deze command leest status, hij triggert geen acties.
- **Tijd-gevoelig.** Als de meest recente build > 24h oud is, vermeld dat expliciet — dan is er waarschijnlijk niet recent gepushed.
