# PDF rendering — `src/lib/pdf/`

Puppeteer + `@sparticuz/chromium` voor Cloud Run compatibility. Gebruikt **dezelfde HTML als preview** voor WYSIWYG fidelity.

## Files

| File | Doel |
|---|---|
| `generator.ts` | Main HTML → PDF via Puppeteer (hoofd-entry voor `/api/cv/[id]/pdf`). Rendert dezelfde HTML als preview (via `generateCVHTML` uit `src/lib/cv/html-generator.ts`). |
| `motivation-letter-generator.ts` | PDF voor motivatiebrieven |
| `template-filler.ts` | PDF-side template fill helpers |
| `add-watermark.ts` | Adds preview watermark via `pdf-lib` |

## Belangrijke patronen

- PDF gebruikt **dezelfde HTML als preview** — niet apart renderen, anders mismatch
- Print CSS in renderers vermijdt transforms, clip-path, hover effects (zie `src/lib/cv/CLAUDE.md`)
- `print-color-adjust: exact` zorgt dat saturated colors overleven Puppeteer export
- Google Fonts via `<link>` tags in HTML (niet via Next.js font loader voor PDF)
- Watermark voor preview-mode wordt via `pdf-lib` als post-processing toegevoegd

## Related

- HTML generator: `src/lib/cv/CLAUDE.md`
- API route: `src/app/api/cv/[id]/pdf/route.ts` (zie `src/app/api/CLAUDE.md`) — credit-aftrekpunt (1 credit per download)
- DOCX → PDF flow: `src/lib/docx/docx-to-pdf.ts`
