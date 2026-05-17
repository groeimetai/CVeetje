/**
 * composeCV — public entry to the cv-engine render pipeline.
 *
 * Mirrors the legacy `generateCVHTML` signature shape so cv-preview.tsx
 * can dispatch on `engineVersion` and pass identical inputs.
 *
 * Returns one HTML document string (with inline <style> + Google Font
 * <link> tags), browser-safe — no Node deps.
 */

import type { GeneratedCVContent } from '@/types';
import type { CVStyleTokensV2 } from '../tokens';
import { getRecipeById } from '../recipes/registry';
import { resolve } from './resolve';
import type { ContactInfo } from './primitives/header';
import { renderSingleColumn } from './shapes/single-column';
import { renderSidebarShape } from './shapes/sidebar';
import { renderEditorialGrid } from './shapes/editorial-grid';
import { renderPoster } from './shapes/poster';
import { resetCSS, type PageMode } from './css/reset.css';
import { tokensCSS } from './css/tokens.css';
import { primitivesCSS } from './css/primitives.css';
import { decoratorCSS } from './primitives/decorators';
import { getFontLinkTags } from './css/fonts';
import type { Locale } from './labels';

export interface ComposeOptions {
  fullName: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale?: Locale;
  /** 'a4-paged' (default) paginates as standard A4; 'single-long' renders
   *  one continuous tall page (no page breaks) — see project memory. */
  pageMode?: PageMode;
}

export type { PageMode } from './css/reset.css';

export interface ComposeResult {
  /** Complete HTML document, ready to drop into an iframe `srcDoc` or
   *  serve to puppeteer. */
  html: string;
  /** Just the CSS, for callers (e.g. PDF) that prefer to compose their
   *  own document scaffolding. */
  css: string;
}

export function composeCV(
  content: GeneratedCVContent,
  tokens: CVStyleTokensV2,
  opts: ComposeOptions,
): ComposeResult {
  const recipe = getRecipeById(tokens.recipeId);
  if (!recipe) {
    throw new Error(`cv-engine: unknown recipeId "${tokens.recipeId}". Registered: see recipes/registry.ts`);
  }

  const rs = resolve(recipe, tokens);
  const locale: Locale = opts.locale ?? 'nl';
  const pageMode: PageMode = opts.pageMode ?? 'a4-paged';

  // CSS: tokens (CSS vars) + reset (page-mode aware) + primitive variants
  // + decorator-specific CSS only for the decorators this recipe enables.
  const css = [
    tokensCSS(rs),
    resetCSS(pageMode),
    primitivesCSS(rs),
    decoratorCSS(rs.spec.decorators),
  ].join('\n');

  // HTML body: shape dispatch
  let body: string;
  switch (rs.spec.layoutShape) {
    case 'single-column':
      body = renderSingleColumn(rs, {
        content,
        fullName: opts.fullName,
        contact: opts.contact,
        avatarUrl: opts.avatarUrl,
        locale,
      });
      break;
    case 'sidebar':
      body = renderSidebarShape(rs, {
        content,
        fullName: opts.fullName,
        contact: opts.contact,
        avatarUrl: opts.avatarUrl,
        locale,
      });
      break;
    case 'editorial-grid':
      body = renderEditorialGrid(rs, {
        content,
        fullName: opts.fullName,
        contact: opts.contact,
        avatarUrl: opts.avatarUrl,
        locale,
      });
      break;
    case 'poster':
      body = renderPoster(rs, {
        content,
        fullName: opts.fullName,
        contact: opts.contact,
        avatarUrl: opts.avatarUrl,
        locale,
      });
      break;
  }

  const fontLinks = getFontLinkTags(rs.fontPairing);
  const docTitle = `${opts.fullName} — CV`;

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle}</title>
${fontLinks}
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;

  return { html, css };
}
