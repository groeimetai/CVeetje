/**
 * editorial-grid shape — asymmetric 65/35 layout with a marginalia column.
 *
 * Main column (65%) carries the editorial body: name + headline, summary,
 * experience as paragraph or bullets, education. Margin column (35%) carries
 * a column of small callouts — by default the experience periods + company
 * names, optionally overridden by the AI's marginNoteCopy (Phase 2).
 *
 * Used by creative/wallpaper and experimental/gallery.
 */

import type { GeneratedCVContent } from '@/types';
import type { ResolvedSpec } from '../resolve';
import { applyAccentHighlights, escHtml } from '../html';
import { labelFor, type Locale } from '../labels';
import { renderSection } from '../primitives/section';
import { renderExperienceItem } from '../primitives/experience-item';
import { renderSkillList } from '../primitives/skill-list';
import { applyDropCap, renderPullQuote } from '../primitives/decorators';
import type { ContactInfo } from '../primitives/header';

export interface EditorialGridInput {
  content: GeneratedCVContent;
  fullName: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale: Locale;
}

function renderEditorialHeader(fullName: string, headline: string, tagline?: string, contact?: ContactInfo, avatarUrl?: string | null): string {
  const t = tagline ? `<div class="cv-name-tagline">${escHtml(tagline)}</div>` : '';
  const contactLine = contact
    ? [contact.email, contact.phone, contact.city, contact.linkedin, contact.github]
        .filter(Boolean)
        .map(s => `<span>${escHtml(String(s))}</span>`)
        .join('')
    : '';
  const photo = avatarUrl
    ? `<div class="cv-editorial-photo"><img src="${escHtml(avatarUrl)}" alt=""></div>`
    : '';
  return `<header class="cv-editorial-header${avatarUrl ? ' has-photo' : ''}">
  <div class="cv-editorial-header-content">
    <h1 class="cv-name">${escHtml(fullName)}</h1>
    ${headline ? `<div class="cv-headline">${escHtml(headline)}</div>` : ''}
    ${t}
    ${contactLine ? `<div class="cv-contact">${contactLine}</div>` : ''}
  </div>
  ${photo}
</header>`;
}

function renderMarginalia(content: GeneratedCVContent): string {
  if (!content.experience?.length) return '';
  const items = content.experience.map(e => {
    return `<li class="cv-margin-note">
  <div class="cv-margin-period">${escHtml(e.period)}</div>
  <div class="cv-margin-where">${escHtml(e.company)}${e.location ? ` · ${escHtml(e.location)}` : ''}</div>
</li>`;
  }).join('');
  return `<aside class="cv-margin"><ul class="cv-margin-list">${items}</ul></aside>`;
}

function renderEducation(items: GeneratedCVContent['education']): string {
  return items
    .map(
      e => `<article class="cv-experience-item">
  <div class="cv-role-line">
    <span class="cv-role-title">${escHtml(e.degree)}</span>
    <span class="cv-role-meta">${escHtml(e.institution)}</span>
    <span class="cv-role-period">${escHtml(e.year)}</span>
  </div>
  ${e.details ? `<p class="cv-experience-desc">${escHtml(e.details)}</p>` : ''}
</article>`,
    )
    .join('');
}

function renderInterests(items: string[]): string {
  return `<div class="cv-skill-list">${items
    .map(i => `<span class="cv-skill">${escHtml(i)}</span>`)
    .join('')}</div>`;
}

function deriveDefaultPullQuote(content: GeneratedCVContent): { text: string; attribution?: string } | null {
  const first = content.experience?.[0];
  const firstHighlight = first?.highlights?.[0];
  if (!firstHighlight) return null;
  return { text: firstHighlight, attribution: first ? `— ${first.title}, ${first.company}` : undefined };
}

export function renderEditorialGrid(rs: ResolvedSpec, input: EditorialGridInput): string {
  const { content, fullName, contact, locale } = input;
  const accentKeywords = rs.emphasis.accentKeywords;

  let summaryBody = applyAccentHighlights(escHtml(content.summary), accentKeywords);
  if (rs.spec.decorators.dropCap) summaryBody = applyDropCap(summaryBody, rs.emphasis.dropCapLetter);

  let pullQuoteHtml = '';
  if (rs.spec.decorators.pullQuote) {
    const aiText = rs.emphasis.pullQuoteText;
    if (aiText) {
      pullQuoteHtml = renderPullQuote(aiText, rs.emphasis.pullQuoteAttribution, accentKeywords);
    } else {
      const derived = deriveDefaultPullQuote(content);
      if (derived) pullQuoteHtml = renderPullQuote(derived.text, derived.attribution, accentKeywords);
    }
  }

  const mainSections: string[] = [
    renderEditorialHeader(fullName, content.headline, rs.emphasis.nameTagline, contact, input.avatarUrl),
    `<p class="cv-summary">${summaryBody}</p>`,
  ];

  for (const section of rs.sectionOrder) {
    if (rs.hiddenSections.has(section)) continue;
    if (section === 'summary') continue; // already rendered above

    switch (section) {
      case 'experience':
        if (!content.experience?.length) break;
        mainSections.push(
          renderSection(
            rs.spec.primitives.section,
            labelFor(locale, 'experience'),
            content.experience.map(e => renderExperienceItem(rs.spec.primitives.experienceItem, e, accentKeywords)).join(''),
          ) + pullQuoteHtml,
        );
        break;
      case 'education':
        if (!content.education?.length) break;
        mainSections.push(renderSection(rs.spec.primitives.section, labelFor(locale, 'education'), renderEducation(content.education)));
        break;
      case 'skills':
        if (!content.skills) break;
        mainSections.push(renderSection(rs.spec.primitives.section, labelFor(locale, 'skills'), renderSkillList(rs.spec.primitives.skillList, content.skills, accentKeywords)));
        break;
      case 'interests':
        if (!content.interests?.length) break;
        mainSections.push(renderSection(rs.spec.primitives.section, labelFor(locale, 'interests'), renderInterests(content.interests)));
        break;
      case 'languages':
      case 'certifications':
      case 'projects':
        // Editorial grid puts these in the margin column / out-of-scope for Phase 1.
        break;
    }
  }

  const mainHtml = `<main class="cv-main">${mainSections.join('\n')}</main>`;
  const marginHtml = rs.spec.decorators.marginalia ? renderMarginalia(content) : '';

  return `<div class="cv-page cv-shape-editorial-grid">
${mainHtml}
${marginHtml}
</div>`;
}
