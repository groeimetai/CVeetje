/**
 * Section primitive — wraps a section title + body.
 * Phase 0 implements 'kicker-rule'.
 */

import type { SectionVariant } from '../../spec';
import { escHtml } from '../html';

export function renderSection(_variant: SectionVariant, title: string, body: string): string {
  return `<section class="cv-section">
  <div class="cv-section-kicker" aria-hidden="true"></div>
  <h2 class="cv-section-title">${escHtml(title)}</h2>
  <div class="cv-section-body">${body}</div>
</section>`;
}
