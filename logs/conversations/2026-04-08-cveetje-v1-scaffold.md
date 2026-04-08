# 2026-04-08 — Cveetje v1: Dev-companion + Tools-laag scaffold

## Wat is gedaan

Eerste fase van de **agentic transitie** voor cveetje uitgevoerd, conform plan `~/.claude/plans/jaunty-honking-otter.md` (Laag 0 + Laag 1). Geen UI-wijziging, geen breaking changes voor de wizard, geen aanpassing aan de productie-runtime.

### Laag 0 — Dev-companion (Claude Code-omgeving in cveetje)

- **CLAUDE.md herschreven** in meta-agent stijl. Behoudt alle feitelijke project-info (tech stack, architecture flow, types, env vars, routing) maar nu compacter en met een expliciete sectie "Werkregels" (8 niet-onderhandelbare regels) en "Dev-companion conventies".
- **`.claude/commands/`** met vier slash commands:
  - `audit-prompts.md` — vind ingebedde AI-prompts in `src/lib/ai/*` en groepeer per gedeeld concept
  - `audit-auth.md` — lijst de ~51 API-routes die de 8-liner Firebase-token-check herhalen
  - `scaffold-tool.md` — voeg een nieuwe AI-tool toe volgens het uniforme `tool()`-pattern in `src/lib/ai/tools/`
  - `deploy-status.md` — laatste Cloud Build run + Cloud Run revisie via de `cloudbuild` MCP
- **`mcp-servers/cloudbuild/`** — Python FastMCP server die `gcloud` CLI wrapt:
  - `list_recent_builds(limit)` — recente Cloud Build runs
  - `describe_build(build_id)` — details van één build
  - `describe_run_service(service, region)` — actieve Cloud Run revisie + traffic split + env-key-namen (geen waardes)
  - `list_run_revisions(service, region, limit)` — recente revisies
- **`mcp-servers/github-cveetje/`** — Python FastMCP server die `gh` CLI wrapt voor `groeimetai/CVeetje`:
  - `list_pull_requests(state, limit)`
  - `list_issues(state, limit)`
  - `list_recent_commits(branch, limit)`
  - `get_commit(sha)`
  - `list_workflow_runs(limit)`
- **`logs/conversations/`** aangemaakt (met `.gitkeep`)
- Beide MCP servers geregistreerd via `claude mcp add` en geverifieerd met `claude mcp list`:
  - `cloudbuild — ✓ Connected`
  - `github-cveetje — ✓ Connected`

### Laag 1 — Tools-laag refactor

- **`src/lib/ai/prompts/`** — vier herbruikbare prompt-fragmenten geëxtraheerd uit `cv-generator.ts`:
  - `honesty-rules.ts` — de FORBIDDEN/ALLOWED safeguards tegen fabricatie
  - `language-instructions.ts` — gedeelde EN/NL `intro` + `outputNote`
  - `industry-guidance.ts` — sector-specifieke schrijftips (Tech/Finance/Healthcare/Consulting/Marketing/Retail + fallback)
  - `power-words.ts` — power verbs per categorie (Achievement/Leadership/Improvement/Creation/Analysis/Growth) als zowel structured object als markdown-fragment
- **`src/lib/ai/schemas/`** — drie gedeelde Zod-primitieven als fundament voor toekomstige tools (NIET ter vervanging van bestaande generator-schemas, die zijn shaped per use case):
  - `experience.ts` — `periodSchema`, `relevanceScoreSchema`, `baseExperienceSchema`
  - `skills.ts` — `skillSetSchema`, `skillMatchSchema`
  - `job-requirements.ts` — `skillRequirementsSchema`, `experienceRequirementsSchema`
- **`src/lib/ai/tools/`** — zeven tool-wrappers met factory-pattern (closure over `ToolContext`, geen `experimental_context`):
  - `_context.ts` — gedeelde `ToolContext` interface (`provider`, `apiKey`, `model`)
  - `parse-job.ts` — wrapt `parseJobVacancy()`
  - `analyze-fit.ts` — wrapt `analyzeFit()`
  - `generate-cv-content.ts` — wrapt `generateCV()`
  - `generate-design-tokens.ts` — wrapt `generateDesignTokens()`
  - `generate-motivation.ts` — wrapt `generateMotivationLetter()`
  - `analyze-template.ts` — wrapt `analyzeTemplateBlueprint()`
  - `fill-docx.ts` — wrapt `fillStructuredSegments()`
- **`src/lib/ai/agent/`**:
  - `tools-index.ts` — `createAgentTools(ctx)` factory die alle 7 tools als `agentTools` object retourneert (snake_case keys voor de LLM)
  - `system-prompt.md` — draft system prompt voor de toekomstige productie-agent. Beschrijft rol, strikte regels (HONESTY FIRST, geen export-tools in v1), werkstroom, alle 7 tools met one-liners, edge cases, en een NIET-doen lijst
- **`cv-generator.ts` gemigreerd** naar gedeelde `prompts/`. Inline `getIndustryGuidance()`, `honestyRules` en `languageInstructions` verwijderd, vervangen door imports. Zero behavior change — `buildPrompt()` body referenceert dezelfde namen.

### Verificatie

- `npm run build` slaagt na elke incrementele wijziging (3× gedraaid)
- `npm run lint` geeft 96 problems maar **geen** in files die ik heb aangemaakt of aangeraakt — allemaal pre-existing
- Beide MCP servers booten en registreren correct in Claude Code

## Beslissingen

1. **Vercel AI SDK uitbreiden, niet Claude Agent SDK ernaast.** Cveetje gebruikt al `streamText()` + tools van `ai` v6.0.38 in `src/app/api/cv/chat/route.ts`. Tweede SDK = duplicatie zonder voordeel. Bevestigd door inspectie van het bestaande `tool()`-patroon in `chat/route.ts:222-228`.

2. **Tools gebruiken factory-pattern met closure, geen `experimental_context`.** Reden: type-veiligheid en expliciete bind-stap. Elke tool exporteert `createXxxTool(ctx)` die een tool met de provider/apiKey/model in closure retourneert. Cleaner dan runtime context-passing.

3. **MCP servers wrappen `gcloud` en `gh` CLIs via subprocess, geen REST APIs.** Reden: geen `.env` credentials nodig — beide CLIs hebben hun eigen system-level auth (`gcloud auth login`, `gh auth login`). Pragmatisch en veilig.

4. **Schemas/ blijft fundament, vervangt niets.** De bestaande generator-schemas (cv-generator's `cvContentSchema`, fit-analyzer's `fitAnalysisSchema`, etc.) zijn shaped per use case en niet veilig om te consolideren zonder behavior-change. De `schemas/` directory bevat alleen primitieven voor nieuwe tools. Bestaande generators raken we niet aan.

5. **Alleen cv-generator was een schone migratie-target voor `prompts/`.** Onderzoek tijdens de migratie-fase liet zien dat `motivation-generator`, `style-generator-v2`, `template-analyzer` en `docx-content-replacer` elk **bespoke language-handling patterns** hebben:
   - `motivation-generator.ts:36-40` — ternary inline met `u-form` + "business letter conventions"
   - `template-analyzer.ts:138` — `isEn` boolean → `buildCombinedSystemPromptEN/NL` functie-switch
   - `docx-content-replacer.ts:57` — `isEn` boolean voor inline format-hints
   - `style-generator-v2.ts` — taal verweven door massive system prompts, geen herkenbaar pattern

   Geen van deze matcht structureel het simpele `languageInstructions[language].outputNote`-pattern uit `prompts/language-instructions.ts`. Forceren zou een **behavior-changing rewrite** zijn, niet een no-op refactor — exact wat de plan-regel "voorzichtig migreren, geen breaking changes" verbiedt. **Geflagged voor v2.**

## Openstaande acties (v2)

Volgens het plan in `~/.claude/plans/jaunty-honking-otter.md`:

- **Laag 2 — Auth-helper**: bouw `src/lib/auth/with-user.ts` en migreer de ~51 API-routes in batches (`cv/`, `profile/`, `settings/`, `admin/`). Begin met 2-3 pilot routes.
- **Laag 3 — Agent runtime**: nieuwe API-route `src/app/api/cv/agent/route.ts` die `system-prompt.md` laadt en `createAgentTools(ctx)` aanroept. Streaming via `streamText()` met `maxSteps`.
- **Laag 4 — Dashboard mode toggle**: wizard-mode + agent-mode toggle in dashboard, beide gebruikend dezelfde tools.
- **Bespoke language-patterns consolideren** (uit beslissing 5 hierboven). Aparte sub-taak per generator, elke met handmatige rooktest:
  - `motivation-generator.ts` — herstructureer `buildSystemPrompt()` om `prompts/language-instructions.ts` te kunnen gebruiken naast de domain-specifieke u-form/letter-conventions
  - `template-analyzer.ts` — kijk of de twee `buildCombinedSystemPromptEN/NL` functies samengevoegd kunnen worden met taal-parameter en gedeelde fragmenten
  - `docx-content-replacer.ts` — extraheer de format-hints naar een aparte helper, hergebruik gedeelde language-instructions waar mogelijk
  - `style-generator-v2.ts` — grootste werk; mogelijk niet de moeite waard

## Niet gewijzigd in deze sessie

- `cloudbuild.yaml`, `Dockerfile`, `next.config.ts` — Cloud Run deploy ongewijzigd
- `src/middleware.ts` — auth-strategie onveranderd
- `src/components/cv/cv-wizard.tsx` en alle wizard-stappen — UI exact zoals voorheen
- `src/app/api/cv/chat/route.ts` — bestaande chat-route ongewijzigd
- 51 API-routes met de 8-liner auth-check — komt in v2 (Laag 2)
- Bestaande Zod-schemas in generators — bewust niet geconsolideerd
