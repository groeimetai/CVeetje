"""
GitHub MCP server voor groeimetai/CVeetje.

Wrapt `gh` CLI voor read-only context: PRs, issues, recente commits, run-status.
Gebruikt `gh` zijn eigen authentication (uit `gh auth login`). Geen credentials
in deze server, geen .env nodig.
"""

from __future__ import annotations

import json
import subprocess
from typing import Any

from mcp.server.fastmcp import FastMCP


# ----------------------------------------------------------------------------
# Configuratie
# ----------------------------------------------------------------------------

GH = "/opt/homebrew/bin/gh"
REPO = "groeimetai/CVeetje"


# ----------------------------------------------------------------------------
# Subprocess helper
# ----------------------------------------------------------------------------

def _run_gh(args: list[str], timeout: int = 20) -> tuple[int, str, str]:
    """Run een gh subcommand. Returned (returncode, stdout, stderr)."""
    try:
        proc = subprocess.run(
            [GH, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        return 124, "", f"gh command timed out after {timeout}s"
    except FileNotFoundError:
        return 127, "", f"gh niet gevonden op {GH}"


def _parse_json_or_error(stdout: str, stderr: str, returncode: int) -> Any:
    if returncode != 0:
        return {"error": f"gh exit {returncode}", "stderr": stderr.strip()[:500]}
    if not stdout.strip():
        return []
    try:
        return json.loads(stdout)
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse failed: {e}", "raw": stdout[:500]}


# ----------------------------------------------------------------------------
# MCP server
# ----------------------------------------------------------------------------

mcp_server = FastMCP(
    "github-cveetje",
    instructions=(
        f"Read-only GitHub context voor {REPO}. Gebruik om PR-status te checken, "
        "recent issues op te zoeken, en commit-history te bekijken. Trigger geen "
        "PR-merges of issue-comments vanuit deze tools."
    ),
)


@mcp_server.tool()
def list_pull_requests(state: str = "open", limit: int = 10) -> str:
    """Lijst pull requests voor groeimetai/CVeetje.

    state: 'open', 'closed', of 'all' (default 'open').
    limit: max aantal PRs (default 10, max 50).
    """
    if state not in ("open", "closed", "all"):
        return json.dumps({"error": f"state moet open|closed|all zijn, kreeg: {state}"})
    limit = max(1, min(limit, 50))

    code, out, err = _run_gh([
        "pr", "list",
        "--repo", REPO,
        "--state", state,
        "--limit", str(limit),
        "--json", "number,title,author,createdAt,updatedAt,state,isDraft,headRefName,baseRefName,url",
    ])
    parsed = _parse_json_or_error(out, err, code)
    return json.dumps(parsed, indent=2)


@mcp_server.tool()
def list_issues(state: str = "open", limit: int = 10) -> str:
    """Lijst issues voor groeimetai/CVeetje.

    state: 'open', 'closed', of 'all' (default 'open').
    limit: max aantal issues (default 10, max 50).
    """
    if state not in ("open", "closed", "all"):
        return json.dumps({"error": f"state moet open|closed|all zijn, kreeg: {state}"})
    limit = max(1, min(limit, 50))

    code, out, err = _run_gh([
        "issue", "list",
        "--repo", REPO,
        "--state", state,
        "--limit", str(limit),
        "--json", "number,title,author,createdAt,updatedAt,state,labels,url",
    ])
    parsed = _parse_json_or_error(out, err, code)
    return json.dumps(parsed, indent=2)


@mcp_server.tool()
def list_recent_commits(branch: str = "main", limit: int = 10) -> str:
    """Lijst recente commits op een branch van groeimetai/CVeetje.

    branch: branch-naam (default 'main').
    limit: max aantal commits (default 10, max 50).
    """
    limit = max(1, min(limit, 50))
    code, out, err = _run_gh([
        "api",
        f"repos/{REPO}/commits?sha={branch}&per_page={limit}",
        "--jq", "[.[] | {sha: .sha, shortSha: .sha[0:7], message: .commit.message, author: .commit.author.name, date: .commit.author.date, url: .html_url}]",
    ])
    parsed = _parse_json_or_error(out, err, code)
    return json.dumps(parsed, indent=2)


@mcp_server.tool()
def get_commit(sha: str) -> str:
    """Geef details van één commit (volledige SHA of korte SHA).

    Returned: commit message, author, date, files changed (max 30), additions/deletions.
    """
    if not sha or len(sha) < 4:
        return json.dumps({"error": "sha moet minimaal 4 karakters zijn"})

    code, out, err = _run_gh([
        "api",
        f"repos/{REPO}/commits/{sha}",
    ])
    parsed = _parse_json_or_error(out, err, code)
    if isinstance(parsed, dict) and "error" in parsed:
        return json.dumps(parsed, indent=2)

    summary = {
        "sha": parsed.get("sha"),
        "shortSha": (parsed.get("sha") or "")[:7],
        "message": parsed.get("commit", {}).get("message"),
        "author": parsed.get("commit", {}).get("author"),
        "url": parsed.get("html_url"),
        "stats": parsed.get("stats"),
        "files": [
            {
                "filename": f.get("filename"),
                "status": f.get("status"),
                "additions": f.get("additions"),
                "deletions": f.get("deletions"),
            }
            for f in (parsed.get("files") or [])[:30]
        ],
    }
    return json.dumps(summary, indent=2)


@mcp_server.tool()
def list_workflow_runs(limit: int = 10) -> str:
    """Lijst recente GitHub Actions workflow runs (indien aanwezig).

    Voor cveetje is de primaire CI Google Cloud Build, niet GitHub Actions, dus
    deze tool returned mogelijk een lege lijst — dat is normaal.
    """
    limit = max(1, min(limit, 50))
    code, out, err = _run_gh([
        "run", "list",
        "--repo", REPO,
        "--limit", str(limit),
        "--json", "databaseId,name,status,conclusion,createdAt,headBranch,event,url",
    ])
    parsed = _parse_json_or_error(out, err, code)
    return json.dumps(parsed, indent=2)


# ----------------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    mcp_server.run()
