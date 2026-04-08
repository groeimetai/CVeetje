# /scaffold-tool

Voeg een nieuwe AI-tool toe aan `src/lib/ai/tools/` volgens het uniforme pattern. Tools zijn dunne wrappers rond generator-functies die door een toekomstige agent-runtime worden aangeroepen.

## Input

`$ARGUMENTS` — naam van de nieuwe tool in `kebab-case` (bv. `enrich-experience`, `summarize-portfolio`). Optioneel: het pad naar een bestaande generator-functie waar de tool omheen moet wrappen.

Als geen argumenten meegegeven: vraag de gebruiker.

## Stappen

1. **Vraag (als niet meegegeven):**
   - Wat is de naam van de tool? (kebab-case)
   - Wat doet hij in één zin? (wordt de `description` voor de LLM)
   - Wraps hij een bestaande functie in `src/lib/ai/*.ts`? Zo ja: welke?
   - Welke inputs heeft de tool nodig? (Zod-schema sketch)
   - Welke output? (Zod-schema sketch — of "wat de wrapped function teruggeeft")

2. **Verifieer** dat de tool nog niet bestaat in `src/lib/ai/tools/`. Zo ja: stop, vraag of ze hem willen overschrijven.

3. **Lees een bestaande tool als referentie** (bv. `src/lib/ai/tools/parse-job.ts`) zodat je het exacte pattern volgt:
   - Import `tool` van `'ai'` en `z` van `'zod'`
   - Import de wrapped function uit `'@/lib/ai/<file>'`
   - `description`: één zin, schreven voor een LLM-lezer (niet voor een dev)
   - `inputSchema`: alleen wat de LLM moet leveren (geen `provider`/`apiKey`/`model` — die komen uit context)
   - `execute({...input}, { experimental_context })`: cast `experimental_context` naar `ToolContext`, roep wrapped function aan, return raw output
   - Geen retry-logic, geen credit-deductie, geen logging — die zitten al in de wrapped function of in de hogere agent-runtime laag

4. **Schrijf** `src/lib/ai/tools/<naam>.ts` volgens het pattern. Export de tool als `<camelCaseName>Tool`.

5. **Voeg de tool toe** aan `src/lib/ai/agent/tools-index.ts`:
   ```typescript
   import { <name>Tool } from '../tools/<name>';
   export const agentTools = {
     // existing tools...
     <snake_case_name>: <name>Tool,
   };
   ```

6. **Update** `src/lib/ai/agent/system-prompt.md` met een nieuwe regel onder de "Available tools" sectie:
   ```
   - **<snake_case_name>** — <description>
   ```

7. **Run `npm run build`** vanuit de project root om TypeScript errors op te vangen. Bij errors: lees, fix, herhaal. Geen merge bij build-failures.

8. **Rapporteer**:
   - Pad van het nieuwe file
   - Welke andere files zijn aangepast (`tools-index.ts`, `system-prompt.md`)
   - Build-status

## Regels

- **Geen credentials in tool-signatures.** `provider`, `apiKey`, `model` komen via `experimental_context`, nooit via `inputSchema`.
- **Tools zijn pure wrappers.** Geen Firestore-writes, geen credit-deductie, geen logging in de tool zelf — die horen in de wrapped generator of in een hogere laag.
- **Eén tool = één file.** Geen tool-collecties in één file.
- **Description is voor de LLM.** Schrijf hem alsof een agent moet beslissen wanneer hij deze tool kiest. Vermijd interne jargon ("PT-2 schema", "fall-through case") — gebruik wat de tool doet voor de eindgebruiker.
- **Geen breaking changes** aan de wrapped function. Tools omhullen, ze passen niet aan.
