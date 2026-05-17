/**
 * Server-side PDF → PNG page renderer.
 *
 * Used to produce page images for AI-vision template analysis and
 * for the HTML-reconstruction fallback path.
 *
 * Uses pdfjs-dist (legacy build, no worker) + @napi-rs/canvas
 * (prebuilt musl binary works on Alpine).
 */

import path from 'node:path';
import { createRequire } from 'node:module';
import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';

// Lazy-resolved pdfjs asset paths. Resolving at top-level runs during Next.js
// page-data collection where module resolution can return numeric ids instead
// of paths; doing this lazily inside the render call keeps it purely runtime.
//
// IMPORTANT: pdfjs v3's NodeStandardFontDataFactory calls `fs.readFile(url)`
// directly — no file:// prefix may be added. Use plain absolute paths with
// trailing slash. With file:// the read silently fails and pdfjs renders
// glyph-less PDFs (only lines/shapes, no text).
let cachedAssets: { standardFontDataUrl: string; cMapUrl: string } | null = null;
function getPdfjsAssetUrls(): { standardFontDataUrl: string; cMapUrl: string } {
  if (cachedAssets) return cachedAssets;
  const nodeRequire = createRequire(import.meta.url);
  const root = path.dirname(nodeRequire.resolve('pdfjs-dist/package.json'));
  cachedAssets = {
    standardFontDataUrl: path.join(root, 'standard_fonts') + path.sep,
    cMapUrl: path.join(root, 'cmaps') + path.sep,
  };
  return cachedAssets;
}

// Lazy-load pdfjs to avoid loading the ~2MB module unless a PDF is actually rendered.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsModule: any | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfjs(): Promise<any> {
  if (!pdfjsModule) {
    // pdfjs-dist v3 ships only .js in legacy/. v4's .mjs has a Node loopback
    // issue with structuredClone on @napi-rs/canvas → we deliberately stay on v3.
    pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.js');
    // v3 emits a deprecation warning the first time getDocument is called
    // unless the worker is set. Use the bundled worker module path.
    if (pdfjsModule.GlobalWorkerOptions && !pdfjsModule.GlobalWorkerOptions.workerSrc) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      pdfjsModule.GlobalWorkerOptions.workerSrc = require.resolve(
        'pdfjs-dist/legacy/build/pdf.worker.js',
      );
    }
  }
  return pdfjsModule;
}

export interface RenderedPage {
  page: number; // 1-indexed
  width: number; // px at requested scale
  height: number; // px at requested scale
  pdfWidth: number; // points (1/72in) at scale=1
  pdfHeight: number; // points at scale=1
  dataUrl: string; // data:image/png;base64,...
}

export interface RenderOptions {
  /** Render scale. 2.0 ≈ 144 DPI — sweet spot for AI vision. */
  scale?: number;
  /** Cap pages to render. Useful for thumbnails / first-page-only flows. */
  maxPages?: number;
}

type CanvasAndContext = { canvas: Canvas | null; context: SKRSContext2D | null };

class NapiCanvasFactory {
  create(width: number, height: number): CanvasAndContext {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    const context = canvas.getContext('2d') as unknown as SKRSContext2D;
    return { canvas, context };
  }

  reset(c: CanvasAndContext, width: number, height: number): void {
    if (!c.canvas) throw new Error('Canvas is not initialized');
    c.canvas.width = Math.ceil(width);
    c.canvas.height = Math.ceil(height);
  }

  destroy(c: CanvasAndContext): void {
    if (!c.canvas) return;
    // @napi-rs/canvas throws "Failed to unwrap exclusive reference" if you
    // resize a canvas whose pixels were just read by toBuffer(). Skip the
    // resize-to-zero — drop the references and let GC reclaim.
    c.canvas = null;
    c.context = null;
  }
}

/**
 * Render every page (or up to maxPages) of a PDF to a PNG.
 * Returns one entry per page in document order.
 */
export async function renderPdfToImages(
  pdfBytes: Uint8Array,
  options: RenderOptions = {},
): Promise<RenderedPage[]> {
  const scale = options.scale ?? 2.0;
  const pdfjs = await loadPdfjs();
  const canvasFactory = new NapiCanvasFactory();
  const { standardFontDataUrl, cMapUrl } = getPdfjsAssetUrls();

  // pdfjs v3 needs the factory on getDocument so that internal cleanup paths
  // (mask/pattern temp canvases) also go through our @napi-rs implementation
  // and don't try to call document.createElement.
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl,
    cMapUrl,
    cMapPacked: true,
    canvasFactory,
  });

  const doc = await loadingTask.promise;
  const total = Math.min(doc.numPages, options.maxPages ?? doc.numPages);
  const results: RenderedPage[] = [];

  try {
    for (let i = 1; i <= total; i++) {
      const page = await doc.getPage(i);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
      const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

      await page.render({
        canvasContext: canvasAndContext.context!,
        viewport,
        canvasFactory,
      }).promise;

      const buffer = canvasAndContext.canvas!.toBuffer('image/png');
      results.push({
        page: i,
        width: Math.ceil(viewport.width),
        height: Math.ceil(viewport.height),
        pdfWidth: baseViewport.width,
        pdfHeight: baseViewport.height,
        dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      });

      page.cleanup();
      canvasFactory.destroy(canvasAndContext);
    }
  } finally {
    await doc.cleanup();
    await doc.destroy();
  }

  return results;
}

/**
 * Quick helper: page count + per-page dimensions (no rendering).
 */
export async function getPdfPageInfo(
  pdfBytes: Uint8Array,
): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
  const pdfjs = await loadPdfjs();
  const { standardFontDataUrl } = getPdfjsAssetUrls();
  const loadingTask = pdfjs.getDocument({
    data: pdfBytes,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl,
  });
  const doc = await loadingTask.promise;
  try {
    const pages: { width: number; height: number }[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      pages.push({ width: vp.width, height: vp.height });
      page.cleanup();
    }
    return { pageCount: doc.numPages, pages };
  } finally {
    await doc.cleanup();
    await doc.destroy();
  }
}
