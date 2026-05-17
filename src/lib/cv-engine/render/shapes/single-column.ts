/**
 * single-column shape — renders the header at top, then all sections
 * stacked vertically. Used by `safe/*` and most `balanced/*` recipes.
 */

import type { GeneratedCVContent } from '@/types';
import type { ResolvedSpec } from '../resolve';
import { applyAccentHighlights, escHtml } from '../html';
import { labelFor, type Locale } from '../labels';
import { renderHeader, type ContactInfo } from '../primitives/header';
import { renderSection } from '../primitives/section';
import { renderExperienceItem } from '../primitives/experience-item';
import { renderSkillList } from '../primitives/skill-list';
import { applyDropCap, renderPullQuote } from '../primitives/decorators';

export interface SingleColumnInput {
  content: GeneratedCVContent;
  fullName: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale: Locale;
}

function renderSummary(
  summary: string,
  accentKeywords?: string[],
  decorators?: { dropCap: boolean },
  dropCapLetter?: string,
): string {
  let body = applyAccentHighlights(escHtml(summary), accentKeywords);
  if (decorators?.dropCap) {
    body = applyDropCap(body, dropCapLetter);
  }
  return `<p class="cv-summary">${body}</p>`;
}

/** Derive a pull-quote text from experience when the AI hasn't supplied one. */
function deriveDefaultPullQuote(content: GeneratedCVContent): { text: string; attribution?: string } | null {
  const first = content.experience?.[0];
  const firstHighlight = first?.highlights?.[0];
  if (!firstHighlight) return null;
  const attribution = first ? `— ${first.title}, ${first.company}` : undefined;
  return { text: firstHighlight, attribution };
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

function renderLanguages(items: GeneratedCVContent['languages']): string {
  return `<div class="cv-skill-list">${items
    .map(
      l =>
        `<span class="cv-skill">${escHtml(l.language)}${
          l.level ? ` <span style="opacity:0.6">(${escHtml(l.level)})</span>` : ''
        }</span>`,
    )
    .join('')}</div>`;
}

function renderCertifications(items: string[]): string {
  return `<div class="cv-skill-list">${items
    .map(c => `<span class="cv-skill">${escHtml(c)}</span>`)
    .join('')}</div>`;
}

function renderInterests(items: string[]): string {
  return `<div class="cv-skill-list">${items
    .map(i => `<span class="cv-skill">${escHtml(i)}</span>`)
    .join('')}</div>`;
}

function renderProjects(items: NonNullable<GeneratedCVContent['projects']>): string {
  return items
    .map(
      p => `<article class="cv-experience-item">
  <div class="cv-role-line">
    <span class="cv-role-title">${escHtml(p.title)}</span>
    <span class="cv-role-period">${escHtml(p.period)}</span>
  </div>
  <p class="cv-experience-desc">${escHtml(p.description)}</p>
  ${
    p.highlights && p.highlights.length
      ? `<ul class="cv-highlights">${p.highlights.map(h => `<li>${escHtml(h)}</li>`).join('')}</ul>`
      : ''
  }
</article>`,
    )
    .join('');
}

export function renderSingleColumn(rs: ResolvedSpec, input: SingleColumnInput): string {
  const { content, fullName, contact, locale } = input;
  const accentKeywords = rs.emphasis.accentKeywords;

  const headerHtml = renderHeader(rs.spec.primitives.header, {
    fullName,
    headline: content.headline,
    nameTagline: rs.emphasis.nameTagline,
    contact,
    avatarUrl: input.avatarUrl,
  });

  // Compute pull-quote markup once; insert it after the experience section
  // when the recipe enables it. AI-supplied text wins; otherwise derive from
  // experience[0].highlights[0].
  let pullQuoteHtml = '';
  if (rs.spec.decorators.pullQuote) {
    const aiText = rs.emphasis.pullQuoteText;
    const aiAttribution = rs.emphasis.pullQuoteAttribution;
    if (aiText) {
      pullQuoteHtml = renderPullQuote(aiText, aiAttribution, accentKeywords);
    } else {
      const derived = deriveDefaultPullQuote(content);
      if (derived) {
        pullQuoteHtml = renderPullQuote(derived.text, derived.attribution, accentKeywords);
      }
    }
  }

  const sectionsHtml = rs.sectionOrder
    .filter(s => !rs.hiddenSections.has(s))
    .map(section => {
      switch (section) {
        case 'summary':
          return renderSummary(
            content.summary,
            accentKeywords,
            rs.spec.decorators,
            rs.emphasis.dropCapLetter,
          );
        case 'experience':
          if (!content.experience?.length) return '';
          return renderSection(
            rs.spec.primitives.section,
            labelFor(locale, 'experience'),
            content.experience.map(e => renderExperienceItem(rs.spec.primitives.experienceItem, e, accentKeywords)).join(''),
          ) + pullQuoteHtml;
        case 'education':
          if (!content.education?.length) return '';
          return renderSection(rs.spec.primitives.section, labelFor(locale, 'education'), renderEducation(content.education));
        case 'skills':
          if (!content.skills) return '';
          return renderSection(
            rs.spec.primitives.section,
            labelFor(locale, 'skills'),
            renderSkillList(rs.spec.primitives.skillList, content.skills, accentKeywords),
          );
        case 'languages':
          if (!content.languages?.length) return '';
          return renderSection(rs.spec.primitives.section, labelFor(locale, 'languages'), renderLanguages(content.languages));
        case 'certifications':
          if (!content.certifications?.length) return '';
          return renderSection(rs.spec.primitives.section, labelFor(locale, 'certifications'), renderCertifications(content.certifications));
        case 'projects':
          if (!content.projects?.length) return '';
          return renderSection(rs.spec.primitives.section, labelFor(locale, 'projects'), renderProjects(content.projects));
        case 'interests':
          if (!content.interests?.length) return '';
          return renderSection(rs.spec.primitives.section, labelFor(locale, 'interests'), renderInterests(content.interests));
        default:
          return '';
      }
    })
    .join('\n');

  return `<div class="cv-page cv-shape-single-column">
${headerHtml}
${sectionsHtml}
</div>`;
}
