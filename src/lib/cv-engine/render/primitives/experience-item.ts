/**
 * Experience item primitive — one job entry.
 * Phase 0 implements 'bullets'.
 */

import type { ExperienceItemVariant } from '../../spec';
import { applyAccentHighlights, escHtml } from '../html';

export interface ExperienceInput {
  title: string;
  company: string;
  location: string | null;
  period: string;
  highlights: string[];
  description?: string;
}

export function renderExperienceItem(
  variant: ExperienceItemVariant,
  exp: ExperienceInput,
  accentKeywords?: string[],
): string {
  const meta = [exp.company, exp.location].filter(Boolean).map(s => escHtml(String(s))).join(' · ');

  // Paragraph variant: fold highlights into a single prose paragraph if no
  // explicit description was supplied. CSS hides the <ul> in this variant.
  let descText = exp.description ?? '';
  if (variant === 'paragraph' && !descText && exp.highlights?.length) {
    descText = exp.highlights
      .map(h => h.trim().replace(/\.$/, ''))
      .join('. ') + '.';
  }
  const desc = descText
    ? `<p class="cv-experience-desc">${applyAccentHighlights(escHtml(descText), accentKeywords)}</p>`
    : '';

  const highlightItems = (exp.highlights ?? [])
    .map(h => `<li>${applyAccentHighlights(escHtml(h), accentKeywords)}</li>`)
    .join('');

  return `<article class="cv-experience-item">
  <div class="cv-role-line">
    <span class="cv-role-title">${escHtml(exp.title)}</span>
    <span class="cv-role-meta">${meta}</span>
    <span class="cv-role-period">${escHtml(exp.period)}</span>
  </div>
  ${desc}
  ${highlightItems ? `<ul class="cv-highlights">${highlightItems}</ul>` : ''}
</article>`;
}
