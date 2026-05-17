/**
 * renderCV — single dispatcher for the legacy and v2 CV renderers.
 *
 * Callers (cv-preview, pdf/generator, dispute regen) check the tokens'
 * `engineVersion`. Without an explicit field the doc is treated as legacy
 * (v1) and the legacy `generateCVHTML` is called. With `engineVersion: 'v2'`
 * the cv-engine `composeCV` is used.
 *
 * Pure / browser-safe — the dispatcher imports the legacy renderer and the
 * v2 renderer; both are client-bundle-safe modules.
 */

import type { GeneratedCVContent, CVContactInfo, CVElementOverrides } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { generateCVHTML } from '@/lib/cv/html-generator';
import type { CVStyleTokensV2 } from './tokens';
import { composeCV } from './render/compose';
import type { ContactInfo } from './render/primitives/header';
import type { PageMode } from './render/css/reset.css';

export type AnyCVTokens = CVDesignTokens | CVStyleTokensV2 | null | undefined;

export function isV2Tokens(t: AnyCVTokens): t is CVStyleTokensV2 {
  return !!t && (t as CVStyleTokensV2).engineVersion === 'v2';
}

function toV2Contact(c: CVContactInfo | null | undefined): ContactInfo {
  return {
    email: c?.email,
    phone: c?.phone,
    city: c?.location,
    linkedin: c?.linkedinUrl,
    github: c?.github,
    website: c?.website,
  };
}

export interface RenderCVOptions {
  fullName: string;
  avatarUrl?: string | null;
  headline?: string | null;
  overrides?: CVElementOverrides | null;
  contactInfo?: CVContactInfo | null;
  /** Legacy options passed to generateCVHTML (preview protection, watermark, forPdf). */
  legacyOptions?: Parameters<typeof generateCVHTML>[7];
  /** v2 page-output mode. Defaults to 'a4-paged'. */
  pageMode?: PageMode;
  /** v2 locale. Defaults to 'nl'. */
  locale?: 'nl' | 'en';
}

export function renderCV(
  content: GeneratedCVContent,
  tokens: AnyCVTokens,
  opts: RenderCVOptions,
): string {
  if (isV2Tokens(tokens)) {
    const { html } = composeCV(content, tokens, {
      fullName: opts.fullName,
      contact: toV2Contact(opts.contactInfo),
      avatarUrl: opts.avatarUrl,
      locale: opts.locale ?? 'nl',
      // Per-render override beats token-stored pageMode; default 'a4-paged'.
      pageMode: opts.pageMode ?? tokens.pageMode ?? 'a4-paged',
    });
    return html;
  }

  // Legacy path — generateCVHTML expects a CVDesignTokens (may be null).
  return generateCVHTML(
    content,
    (tokens as CVDesignTokens) ?? undefined as unknown as CVDesignTokens,
    opts.fullName,
    opts.avatarUrl,
    opts.headline,
    opts.overrides,
    opts.contactInfo,
    opts.legacyOptions,
  );
}
