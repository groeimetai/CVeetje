"""
Cloud Build + Cloud Run MCP server voor cveetje.

Wrapt `gcloud` CLI commands voor read-only inspectie van builds en deployed
revisions van het cveetje project (`groeimetai/CVeetje` → Cloud Run service
`cveetje` in `europe-west4`).

Geen credentials in deze server. `gcloud` gebruikt zijn eigen application-default
credentials uit de gebruikersconfig (`~/.config/gcloud/`). De LLM ziet ze nooit.
"""

from __future__ import annotations

import json
import subprocess
from typing import Any

from mcp.server.fastmcp import FastMCP


# ----------------------------------------------------------------------------
# Configuratie
# ----------------------------------------------------------------------------

GCLOUD = "/opt/homebrew/share/google-cloud-sdk/bin/gcloud"
DEFAULT_REGION = "europe-west4"
DEFAULT_SERVICE = "cveetje"


# ----------------------------------------------------------------------------
# Subprocess helper
# ----------------------------------------------------------------------------

def _run_gcloud(args: list[str], timeout: int = 30) -> tuple[int, str, str]:
    """Run een gcloud subcommand. Returned (returncode, stdout, stderr).

    Geen exceptions naar de LLM — bij errors wordt de stderr in de tool-output
    teruggegeven als string.
    """
    try:
        proc = subprocess.run(
            [GCLOUD, *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired:
        return 124, "", f"gcloud command timed out after {timeout}s"
    except FileNotFoundError:
        return 127, "", f"gcloud niet gevonden op {GCLOUD}"


def _parse_json_or_error(stdout: str, stderr: str, returncode: int) -> Any:
    """Parse JSON output of geef een leesbare error-string terug."""
    if returncode != 0:
        return {"error": f"gcloud exit {returncode}", "stderr": stderr.strip()[:500]}
    if not stdout.strip():
        return {"error": "Lege gcloud-output", "stderr": stderr.strip()[:500]}
    try:
        return json.loads(stdout)
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse failed: {e}", "raw": stdout[:500]}


# ----------------------------------------------------------------------------
# MCP server
# ----------------------------------------------------------------------------

mcp_server = FastMCP(
    "cloudbuild",
    instructions=(
        "Read-only Cloud Build en Cloud Run inspectie voor cveetje. "
        "Gebruik om deploy-status te checken, build-failures te diagnosticeren, "
        "en de live revisie te bevestigen. Trigger geen deploys vanuit deze tools."
    ),
)


@mcp_server.tool()
def list_recent_builds(limit: int = 5) -> str:
    """Lijst de N meest recente Cloud Build runs voor het project.

    Returned per build: id, status (SUCCESS/FAILURE/WORKING/CANCELLED),
    createTime, source-info (commit SHA + repo).
    """
    limit = max(1, min(limit, 50))
    code, out, err = _run_gcloud([
        "builds", "list",
        f"--limit={limit}",
        "--format=json",
    ])
    parsed = _parse_json_or_error(out, err, code)
    if isinstance(parsed, dict) and "error" in parsed:
        return json.dumps(parsed, indent=2)

    # Trim payload — gcloud builds list is verbose
    summary = []
    for build in parsed:
        summary.append({
            "id": build.get("id"),
            "status": build.get("status"),
            "createTime": build.get("createTime"),
            "duration": build.get("timing", {}).get("BUILD", {}).get("startTime"),
            "source": {
                "repoSource": build.get("source", {}).get("repoSource"),
                "storageSource": build.get("source", {}).get("storageSource"),
            },
            "substitutions": {
                k: v for k, v in (build.get("substitutions") or {}).items()
                if k in ("COMMIT_SHA", "SHORT_SHA", "BRANCH_NAME", "REPO_NAME", "TRIGGER_NAME")
            },
            "logUrl": build.get("logUrl"),
        })
    return json.dumps(summary, indent=2)


@mcp_server.tool()
def describe_build(build_id: str) -> str:
    """Geef details van één specifieke Cloud Build run.

    Bevat: status, alle steps, timing, image-tags, en logUrl. Bij FAILURE is
    de stderr van de gefaalde step belangrijk — die staat in de log (niet
    inline hier; gebruik logUrl).
    """
    code, out, err = _run_gcloud([
        "builds", "describe", build_id,
        "--format=json",
    ])
    parsed = _parse_json_or_error(out, err, code)
    if isinstance(parsed, dict) and "error" in parsed:
        return json.dumps(parsed, indent=2)

    summary = {
        "id": parsed.get("id"),
        "status": parsed.get("status"),
        "createTime": parsed.get("createTime"),
        "finishTime": parsed.get("finishTime"),
        "logUrl": parsed.get("logUrl"),
        "steps": [
            {
                "name": s.get("name"),
                "status": s.get("status"),
                "timing": s.get("timing"),
            }
            for s in (parsed.get("steps") or [])
        ],
        "substitutions": parsed.get("substitutions"),
        "images": parsed.get("images"),
        "artifacts": parsed.get("artifacts"),
    }
    return json.dumps(summary, indent=2)


@mcp_server.tool()
def describe_run_service(service: str = DEFAULT_SERVICE, region: str = DEFAULT_REGION) -> str:
    """Beschrijf een Cloud Run service: actieve revisie, traffic split, image, env-key-namen.

    Default: service=cveetje, region=europe-west4. Toont GEEN waardes van
    environment variabelen of secrets — alleen de keys.
    """
    code, out, err = _run_gcloud([
        "run", "services", "describe", service,
        f"--region={region}",
        "--format=json",
    ])
    parsed = _parse_json_or_error(out, err, code)
    if isinstance(parsed, dict) and "error" in parsed:
        return json.dumps(parsed, indent=2)

    spec = parsed.get("spec", {})
    template = spec.get("template", {})
    template_spec = template.get("spec", {})
    containers = template_spec.get("containers", []) or []
    first_container = containers[0] if containers else {}

    env_keys = [e.get("name") for e in (first_container.get("env") or []) if e.get("name")]

    summary = {
        "name": parsed.get("metadata", {}).get("name"),
        "url": parsed.get("status", {}).get("url"),
        "latestReadyRevision": parsed.get("status", {}).get("latestReadyRevisionName"),
        "latestCreatedRevision": parsed.get("status", {}).get("latestCreatedRevisionName"),
        "traffic": [
            {
                "revisionName": t.get("revisionName"),
                "percent": t.get("percent"),
                "tag": t.get("tag"),
                "latestRevision": t.get("latestRevision"),
            }
            for t in (parsed.get("status", {}).get("traffic") or [])
        ],
        "image": first_container.get("image"),
        "resources": first_container.get("resources"),
        "envKeys": sorted(env_keys),  # alleen namen, geen waardes
        "containerConcurrency": template_spec.get("containerConcurrency"),
        "timeoutSeconds": template_spec.get("timeoutSeconds"),
    }
    return json.dumps(summary, indent=2)


@mcp_server.tool()
def list_run_revisions(service: str = DEFAULT_SERVICE, region: str = DEFAULT_REGION, limit: int = 10) -> str:
    """Lijst recente Cloud Run revisies voor een service. Default: cveetje, europe-west4."""
    limit = max(1, min(limit, 50))
    code, out, err = _run_gcloud([
        "run", "revisions", "list",
        f"--service={service}",
        f"--region={region}",
        f"--limit={limit}",
        "--format=json",
    ])
    parsed = _parse_json_or_error(out, err, code)
    if isinstance(parsed, dict) and "error" in parsed:
        return json.dumps(parsed, indent=2)

    summary = [
        {
            "name": r.get("metadata", {}).get("name"),
            "creationTimestamp": r.get("metadata", {}).get("creationTimestamp"),
            "image": (r.get("spec", {}).get("containers") or [{}])[0].get("image"),
            "ready": next(
                (c.get("status") for c in (r.get("status", {}).get("conditions") or []) if c.get("type") == "Ready"),
                None,
            ),
        }
        for r in parsed
    ]
    return json.dumps(summary, indent=2)


# ----------------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------------

if __name__ == "__main__":
    mcp_server.run()
