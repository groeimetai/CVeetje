/**
 * Sidebar shape — two-column layout: sidebar (35%) + main column (65%).
 *
 * Sidebar (auto-filled by `renderSidebar`): contact + skills + languages +
 * certifications + optional photo. Main column: name+headline header,
 * summary, experience, education, projects, interests.
 *
 * The recipe controls sidebar styling via `primitives.sidebar`
 * (solid / transparent / gradient / photo-hero).
 */

import type { GeneratedCVContent } from '@/types';
import type { ResolvedSpec } from '../resolve';
import { applyAccentHighlights, escHtml } from '../html';
import { labelFor, type Locale } from '../labels';
import { renderSection } from '../primitives/section';
import { renderExperienceItem } from '../primitives/experience-item';
import { renderSidebar } from '../primitives/sidebar';
import { applyDropCap, renderPullQuote } from '../primitives/decorators';
import type { ContactInfo } from '../primitives/header';

export interface SidebarShapeInput {
  content: GeneratedCVContent;
  fullName: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale: Locale;
}

function renderMainHeader(fullName: string, headline: string, nameTagline?: string): string {
  const tagline = nameTagline
    ? `<div class="cv-name-tagline">${escHtml(nameTagline)}</div>`
    : '';
  return `<header class="cv-main-header">
  <h1 class="cv-name">${escHtml(fullName)}</h1>
  ${headline ? `<div class="cv-headline">${escHtml(headline)}</div>` : ''}
  ${tagline}
</header>`;
}

function renderSummary(
  summary: string,
  accentKeywords?: string[],
  decorators?: { dropCap: boolean },
  dropCapLetter?: string,
): string {
  let body = applyAccentHighlights(escHtml(summary), accentKeywords);
  if (decorators?.dropCap) body = applyDropCap(body, dropCapLetter);
  return `<p class="cv-summary">${body}</p>`;
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

export function renderSidebarShape(rs: ResolvedSpec, input: SidebarShapeInput): string {
  const { content, fullName, contact, avatarUrl, locale } = input;
  const accentKeywords = rs.emphasis.accentKeywords;

  // Sidebar variant defaults to 'solid' if missing.
  const sidebarVariant = rs.spec.primitives.sidebar ?? 'solid';
  const sidebarHtml = renderSidebar(sidebarVariant, {
    content,
    contact,
    avatarUrl,
    locale,
    accentKeywords,
  });

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

  // Main column — only the sections that belong in the main column.
  const mainSections: string[] = [
    renderMainHeader(fullName, content.headline, rs.emphasis.nameTagline),
  ];

  for (const section of rs.sectionOrder) {
    if (rs.hiddenSections.has(section)) continue;

    switch (section) {
      case 'summary':
        mainSections.push(renderSummary(content.summary, accentKeywords, rs.spec.decorators, rs.emphasis.dropCapLetter));
        break;
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
      case 'interests':
        if (!content.interests?.length) break;
        mainSections.push(renderSection(rs.spec.primitives.section, labelFor(locale, 'interests'), renderInterests(content.interests)));
        break;
      // skills, languages, certifications live in the sidebar — skip here.
      case 'skills':
      case 'languages':
      case 'certifications':
      case 'projects': // Projects → main if Phase 2 wants it
        break;
      default:
        break;
    }
  }

  const mainHtml = `<main class="cv-main">${mainSections.join('\n')}</main>`;

  return `<div class="cv-page cv-shape-sidebar" data-sidebar-variant="${sidebarVariant}">
${sidebarHtml}
${mainHtml}
</div>`;
}
