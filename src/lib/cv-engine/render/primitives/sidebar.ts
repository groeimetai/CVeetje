/**
 * Sidebar primitive — renders the sidebar block for `layoutShape === 'sidebar'`.
 *
 * Carries contact info, photo, skills, languages, certifications. The "main"
 * column carries name+headline header, summary, experience, education.
 *
 * Phase 1 implements 'solid' and 'transparent' variants. Phase 2 adds
 * 'gradient' + 'photo-hero'.
 */

import type { GeneratedCVContent } from '@/types';
import type { SidebarVariant } from '../../spec';
import { escHtml } from '../html';
import { labelFor, type Locale } from '../labels';
import type { ContactInfo } from './header';
import { renderSkillList } from './skill-list';

export interface SidebarInput {
  content: GeneratedCVContent;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale: Locale;
  accentKeywords?: string[];
}

function renderPhoto(url?: string | null): string {
  if (!url) return '';
  return `<div class="cv-sidebar-photo"><img src="${escHtml(url)}" alt=""></div>`;
}

function renderContactBlock(contact: ContactInfo, locale: Locale): string {
  const lines: string[] = [];
  if (contact.email) lines.push(`<li>${escHtml(contact.email)}</li>`);
  if (contact.phone) lines.push(`<li>${escHtml(contact.phone)}</li>`);
  if (contact.city) lines.push(`<li>${escHtml(contact.city)}</li>`);
  if (contact.linkedin) lines.push(`<li>${escHtml(contact.linkedin)}</li>`);
  if (contact.github) lines.push(`<li>${escHtml(contact.github)}</li>`);
  if (contact.website) lines.push(`<li>${escHtml(contact.website)}</li>`);
  if (!lines.length) return '';
  const title = locale === 'en' ? 'Contact' : 'Contact';
  return `<section class="cv-sidebar-section">
  <h3 class="cv-sidebar-title">${escHtml(title)}</h3>
  <ul class="cv-contact-block">${lines.join('')}</ul>
</section>`;
}

export function renderSidebar(
  _variant: SidebarVariant,
  input: SidebarInput,
): string {
  const { content, contact, avatarUrl, locale, accentKeywords } = input;

  const sections: string[] = [];

  // Photo first if present.
  const photo = renderPhoto(avatarUrl);
  if (photo) sections.push(photo);

  // Contact info.
  sections.push(renderContactBlock(contact, locale));

  // Skills.
  if (content.skills && (content.skills.technical?.length || content.skills.soft?.length)) {
    sections.push(`<section class="cv-sidebar-section">
  <h3 class="cv-sidebar-title">${escHtml(labelFor(locale, 'skills'))}</h3>
  ${renderSkillList('tags', content.skills, accentKeywords)}
</section>`);
  }

  // Languages.
  if (content.languages?.length) {
    const items = content.languages
      .map(l => `<li><span class="cv-lang-name">${escHtml(l.language)}</span>${l.level ? ` <span class="cv-lang-level">${escHtml(l.level)}</span>` : ''}</li>`)
      .join('');
    sections.push(`<section class="cv-sidebar-section">
  <h3 class="cv-sidebar-title">${escHtml(labelFor(locale, 'languages'))}</h3>
  <ul class="cv-lang-list">${items}</ul>
</section>`);
  }

  // Certifications.
  if (content.certifications?.length) {
    const items = content.certifications.map(c => `<li>${escHtml(c)}</li>`).join('');
    sections.push(`<section class="cv-sidebar-section">
  <h3 class="cv-sidebar-title">${escHtml(labelFor(locale, 'certifications'))}</h3>
  <ul class="cv-cert-list">${items}</ul>
</section>`);
  }

  return `<aside class="cv-sidebar">${sections.join('\n')}</aside>`;
}
