# github-cveetje MCP server

Read-only GitHub context voor `groeimetai/CVeetje`. Wrapt `gh` CLI.

## Tools

- `list_pull_requests(state='open', limit=10)` — PRs filteren op state
- `list_issues(state='open', limit=10)` — issues filteren op state
- `list_recent_commits(branch='main', limit=10)` — commit history
- `get_commit(sha)` — details van één commit (files, stats, message)
- `list_workflow_runs(limit=10)` — GitHub Actions runs (cveetje gebruikt hoofdzakelijk Cloud Build, dus mogelijk leeg)

## Auth

Geen `.env` nodig. `gh` gebruikt zijn eigen credentials uit `gh auth login`. Verifieer:

```bash
gh auth status
```

## Running

Wordt automatisch geboot door Claude Code. Lokaal testen:

```bash
uv run --with "mcp[cli]" python mcp-servers/github-cveetje/server.py
```

## Veiligheid

- Read-only — geen `gh pr merge`, geen `gh issue close`, geen `gh pr comment`
- Subprocess timeout: 20 seconden per gh-call
- Repo is hardcoded op `groeimetai/CVeetje` — server kan niet per ongeluk andere repos bevragen
