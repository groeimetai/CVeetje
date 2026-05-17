# PDF rendering — `src/lib/pdf/`

Puppeteer + `@sparticuz/chromium` voor Cloud Run compatibility. Gebruikt **dezelfde HTML als preview** voor WYSIWYG fidelity.

## Files

| File | Doel |
|---|---|
| `generator.ts` | Main HTML → PDF via Puppeteer (hoofd-entry voor `/api/cv/[id]/pdf`). Rendert dezelfde HTML als preview (via `generateCVHTML` uit `src/lib/cv/html-generator.ts`). |
| `motivation-letter-generator.ts` | PDF voor motivatiebrieven |
| `template-filler.ts` | PDF-side template fill helpers (AcroForm auto-fill + coordinate-based fallback). Gratis-pad voor PDFs mét form-velden. |
| `pdf-to-image.ts` | Server-side PDF → PNG render via `pdfjs-dist` (v3, legacy build) + `@napi-rs/canvas`. Lazy-loaded. Output: per pagina een base64 PNG data URL + page dimensions in points. Gebruikt door AI-vision flows. |
| `smart-pdf-filler.ts` | **Hybrid AI PDF filler** (entry: `smartFillPDF`). Render → AI blueprint → AI fill → fit-check per veld → overlay (`pdf-lib drawText` op originele PDF) of fallback naar HTML-reconstructie. Drempel: ≥75% velden moeten passen (met shrink-to-fit tot 7pt) voor overlay-pad. |
| `add-watermark.ts` | Adds preview watermark via `pdf-lib` |

## PDF template fill — flow

Zie ook `src/app/api/templates/[id]/fill/route.ts` voor de orchestratie.

```
templateBytes
   │
   ├── hasFormFields()? ── ja → fillFormFieldsAuto() (AcroForm, gratis)
   │                              │
   │                              └── 0 velden gevuld? → val terug op AI-flow ↓
   │
   ├── pre-configured coords? ── ja → fillPDFTemplate() (gratis, legacy)
   │
   └── flat PDF → smartFillPDF() (AI-vision):
         1. renderPdfToImages()           [pdf-to-image.ts]
         2. analyzePDFTemplate()          [src/lib/ai/pdf-template-analyzer.ts]
         3. fillPDFFields()               [src/lib/ai/pdf-content-replacer.ts]
         4. measureFit() — shrink-to-fit per veld
         5. ≥75% past → drawOverlay() (pdf-lib op originele PDF, behoudt design)
            anders   → reconstructPDFFromBlueprint() (AI → HTML+Tailwind → Puppeteer)
         6. avatarUrl + photoSlot → page.drawImage()
```

Method op het CV-record: `pdf-acroform` | `coordinates` | `pdf-overlay` | `pdf-html-reconstruct`.

## Belangrijke patronen

- PDF gebruikt **dezelfde HTML als preview** — niet apart renderen, anders mismatch
- Print CSS in renderers vermijdt transforms, clip-path, hover effects (zie `src/lib/cv/CLAUDE.md`)
- `print-color-adjust: exact` zorgt dat saturated colors overleven Puppeteer export
- Google Fonts via `<link>` tags in HTML (niet via Next.js font loader voor PDF)
- Watermark voor preview-mode wordt via `pdf-lib` als post-processing toegevoegd
- **PDF→image lazy load**: `pdfjs-dist` en `@napi-rs/canvas` zijn als `serverExternalPackages` in `next.config.ts` gemarkeerd zodat Turbopack ze niet probeert te bundelen. Asset-resolving (standard_fonts / cmaps) gebeurt lazy in `getPdfjsAssetUrls()` — niet op module-eval (anders breekt Next.js page-data collection).
- **pdfjs v3 i.p.v. v4**: v4's legacy build heeft een Node loopback-worker die `structuredClone` doet op canvas-objects; faalt op `@napi-rs/canvas`'s Skia-bindings. v3 werkt vanilla.
- **NapiCanvasFactory.destroy** zet **geen** `canvas.width = 0` — @napi-rs/canvas gooit "Failed to unwrap exclusive reference" na `toBuffer()`. Drop refs en laat GC het regelen.
- **Overlay coords**: blueprint gebruikt TOP-LEFT origin (intuïtiever voor AI); `drawOverlay` converteert naar pdf-lib's bottom-left via `pageHeight - yTop`.

## Coordinate-systemen — pas op

| Layer | Origin | Eenheid |
|---|---|---|
| AI blueprint (`PDFField`) | top-left | PDF points (1/72in) |
| `pdf-lib drawText` | bottom-left | PDF points |
| `pdfjs` viewport | top-left | px (na scale) |

## Related

- HTML generator: `src/lib/cv/CLAUDE.md`
- AI vision modules: `src/lib/ai/pdf-template-analyzer.ts`, `pdf-content-replacer.ts`, `pdf-html-reconstructor.ts` (zie `src/lib/ai/CLAUDE.md`)
- API route: `src/app/api/cv/[id]/pdf/route.ts` (zie `src/app/api/CLAUDE.md`) — credit-aftrekpunt (1 credit per download)
- DOCX → PDF flow: `src/lib/docx/docx-to-pdf.ts`
- DOCX template-fill: `src/lib/docx/CLAUDE.md` (5-fase AI-pipeline)
