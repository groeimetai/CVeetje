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
  /** Index in content.experience — enables click-to-edit ids in the preview. */
  index?: number,
): string {
  const id = (field: string) => (typeof index === 'number' ? ` data-id="exp-${index}-${field}"` : '');
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
    ? `<p class="cv-experience-desc"${exp.description ? id('description') : ''}>${applyAccentHighlights(escHtml(descText), accentKeywords)}</p>`
    : '';

  const highlightItems = (exp.highlights ?? [])
    .map((h, j) => `<li${id(`highlight-${j}`)}>${applyAccentHighlights(escHtml(h), accentKeywords)}</li>`)
    .join('');

  return `<article class="cv-experience-item">
  <div class="cv-role-line">
    <span class="cv-role-title"${id('title')}>${escHtml(exp.title)}</span>
    <span class="cv-role-meta">${meta}</span>
    <span class="cv-role-period"${id('period')}>${escHtml(exp.period)}</span>
  </div>
  ${desc}
  ${highlightItems ? `<ul class="cv-highlights">${highlightItems}</ul>` : ''}
</article>`;
}
