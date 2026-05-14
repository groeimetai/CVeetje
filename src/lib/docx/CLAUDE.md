# DOCX template system — `src/lib/docx/`

5-fasen AI-driven fill, **fully universal** (geen hardcoded patterns). Vervangen van legacy hardcoded approach (SECTION_PATTERNS, splitLabelValue, detectTabSeparatedParagraph) die te rigide was voor table-based templates.

## Phases

| Phase | File | Functie | Wat |
|---|---|---|---|
| 1 | `structure-extractor.ts` | `extractStructuredSegments()` | XML-aware extractie met table/row/cell context, bouwt template-map |
| 2 | `src/lib/ai/template-analyzer.ts` | `analyzeTemplateBlueprint()` | **AI Phase 1**: identifies sections + repeating blocks (Zod-validated) |
| 3 | `block-duplicator.ts` | `duplicateBlocksInXml()` | Cloned `<w:tr>` of `<w:p>` groups (universeel) |
| 4 | `src/lib/ai/docx-content-replacer.ts` | `fillStructuredSegments()` | **AI Phase 2**: fills segment IDs met profile data |
| 5 | `smart-template-filler.ts` | `fillSmartTemplate()` | Orchestrator — past `<w:t>` replacements toe in **reverse XML order** |
| 6 | `image-replacer.ts` | `replaceProfileImage()` | Post-processing: vindt best portrait-shaped embedded image (EMU dimension check >1cm) en swap met user avatar |

## Alternative paths

| File | Doel |
|---|---|
| `s4y-template-filler.ts` | `fillS4YTemplate(buffer, options)` — alternative filler voor S4Y-stijl templates |
| `template-filler.ts` | Basic placeholder detectie (`{{name}}`, `[NAME]`, `Label: _____`) |
| `docx-to-pdf.ts` | DOCX → PDF via Puppeteer |

## Supported template types

- **Table-based** (Together Abroad EN): `<w:tbl>` met `<w:tr>` rows, `<w:tc>` cells
- **Tab-separated** (John Doe): `<w:tab/>` tussen label en value runs
- **Label:value paragraphs** (S4Y): `"Label : "` format in single `<w:t>`
- **Mixed layouts**: AI handelt elke combinatie aan

## Segment ID format

- `"s0"`, `"s1"`, etc. — assigned na sorting op XML position
- Template map toont segments grouped per body paragraphs en table rows
- AI ontvangt **compact text representation**, niet raw XML

## Belangrijke patronen

- **Always process XML replacements in reverse position order** — anders schuiven eerder vervangen segments de indexen van latere segments op
- `fillSmartTemplate()` public interface is stable — API route hoeft niet aangepast bij interne wijzigingen
- `customValues` (nationality, birthDate fallback) flow: `TemplateSelector` → `onFill` → `CVWizard` → fill API → `fillSmartTemplate` → `buildProfileSummary`
- `ParsedLinkedIn.birthDate` (en `CVContactInfo.birthDate`) bestaan sinds issue #5 (2026-04-09); profile parser extraheert deze uit PDF/image input. DOCX template flow gebruikt nog steeds `customValues.birthDate` maar pre-fillt vanuit `profileData.birthDate`. `nationality` zit niet op `ParsedLinkedIn` en blijft via `customValues`.
- Image picker (Phase 6): kiest niet de eerste maar de **best portrait candidate** via EMU dimensions (>1cm minimum, hoogte > breedte). Zie `image-replacer.ts`.

## Related

- AI phases zelf: `src/lib/ai/CLAUDE.md`
- Template-side PDF helpers: `src/lib/pdf/CLAUDE.md`
- Template preview (rendering bestaand DOCX): `docx-preview` v0.3.7 — replaces mammoth.js, rendert full OOXML met backgrounds/fonts/tabs
- API routes: `src/app/api/CLAUDE.md` → `templates/[id]/analyze` + `templates/[id]/fill`

## Nieuwe fill-fase toevoegen

1. Implementatie in `src/lib/docx/` of `src/lib/ai/` afhankelijk van AI-need
2. Wire in `smart-template-filler.ts` orchestrator (of `s4y-template-filler.ts`)
3. Phase 6 (`image-replacer.ts`) is goed voorbeeld van post-processing fase
