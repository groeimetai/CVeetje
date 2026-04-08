# cloudbuild MCP server

Read-only Cloud Build + Cloud Run inspectie voor cveetje. Wrapt `gcloud` CLI commands.

## Tools

- `list_recent_builds(limit=5)` — laatste N Cloud Build runs
- `describe_build(build_id)` — details + steps van één build
- `describe_run_service(service='cveetje', region='europe-west4')` — actieve revisie, traffic split, env-key-namen (geen waardes)
- `list_run_revisions(service='cveetje', region='europe-west4', limit=10)` — recente Cloud Run revisies

## Auth

Geen `.env` nodig. `gcloud` gebruikt application-default credentials uit `~/.config/gcloud/`. Zorg dat je geauthenticeerd bent:

```bash
gcloud auth login
gcloud config set project <jouw-project-id>
```

## Running

Wordt automatisch geboot door Claude Code. Lokaal testen:

```bash
uv run --with "mcp[cli]" python mcp-servers/cloudbuild/server.py
```

## Veiligheid

- Geen secrets in output (env-variabelen alleen op naam)
- Geen schrijf-acties (`gcloud run deploy`, `gcloud builds submit` zijn buiten scope)
- Subprocess timeout: 30 seconden per gcloud-call
