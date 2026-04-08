# /audit-prompts

Vind alle ingebedde AI-prompts in `src/lib/ai/*` en groepeer per gedeeld concept. Rapporteer wat naar `src/lib/ai/prompts/` gemigreerd kan worden.

## Doel

De AI-generators in deze repo bevatten historisch gezien prompts als string-literals binnen elk file (cv-generator alleen al heeft een ~274-regel `buildPrompt()`). Dat veroorzaakt drift: HONESTY RULES staan alleen in cv-generator, language-instructies zijn 4× gedupliceerd, industry-guidance is een hardcoded switch op één plek. Deze command brengt de versnippering in kaart en stelt consolidatie voor.

## Stappen

1. **Lees** alle generators in `src/lib/ai/*.ts` (negeer `providers.ts`, `platform-provider.ts`, `models-registry.ts`, `retry.ts` — die bevatten geen prompts):
   - `cv-generator.ts`
   - `style-generator-v2.ts`
   - `job-parser.ts`
   - `fit-analyzer.ts`
   - `motivation-generator.ts`
   - `template-analyzer.ts`
   - `template-style-extractor.ts`
   - `docx-content-replacer.ts`

2. **Identificeer per file** alle inline prompt-strings (template literals, `const X = \`...\``, multi-regel strings ingebed in `buildPrompt()`-achtige functies). Noteer:
   - File path
   - Regel-range (`file.ts:start-end`)
   - Welk concept de string vertegenwoordigt (honesty rules, language instructions, industry guidance, ATS rules, power words, ...)
   - Of de string al elders in een gedeelde plek bestaat (`src/lib/ai/prompts/*`)

3. **Groepeer per concept** over alle files. Bv.:
   - **honesty rules**: `cv-generator.ts:129-170` (origineel), `motivation-generator.ts:?-?` (kopie?), `docx-content-replacer.ts:?-?` (kopie?)
   - **language instructions (EN/NL)**: `cv-generator.ts:172-189`, `motivation-generator.ts:36-40`, `style-generator-v2.ts:243-379`, `template-analyzer.ts:140-143`, `docx-content-replacer.ts:63-72`
   - **industry guidance**: `cv-generator.ts:18-82`
   - **power words**: `cv-generator.ts:422-429`
   - **ATS optimization rules**: `cv-generator.ts:369-372`

4. **Check `src/lib/ai/prompts/`** om te zien welke fragmenten er al staan en welke inline-versie nog migratiekandidaat is.

5. **Rapporteer** als markdown-tabel:

   | Concept | Bron-file:lines | Al gemigreerd? | Aanbeveling |
   |---|---|---|---|
   | Honesty rules | cv-generator.ts:129-170 | ✅ in prompts/ | Migrate cv-generator.ts om import te gebruiken |
   | ... | ... | ... | ... |

6. **Bij twijfel: vraag bevestiging** voordat je een migratie voorstelt die schemas of function-signatures raakt. Pure prompt-extracties zijn veilig; structurele wijzigingen niet.

## Regels

- **Lees-only.** Deze command wijzigt geen code. Output is een rapport.
- **Geen aannames over equivalentie.** Twee strings die "ongeveer hetzelfde" zeggen zijn niet automatisch consolideerbaar — markeer ze als "review needed" en laat de mens beslissen.
- **Hou rekening met taal.** EN/NL varianten zijn aparte fragmenten, niet duplicates die geconsolideerd moeten worden.
- **Niet alle prompts horen in `prompts/`.** File-specifieke instructies (bv. de cv-generator's `buildPrompt()`-skeleton met variabele substitutie) blijven in het file. Alleen herbruikbare fragmenten verhuizen.
