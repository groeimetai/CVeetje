/**
 * poster shape — type-only protest-poster layout.
 *
 * Upper zone (≈45% of the page): the candidate's name fills the area,
 * optionally with a poster-line statement below (from emphasis.posterLine
 * or content.headline as fallback). Lower zone: dense 2-column small
 * print carrying summary + experience + skills + languages credits.
 *
 * Used by experimental/manifesto.
 */

import type { GeneratedCVContent } from '@/types';
import type { ResolvedSpec } from '../resolve';
import { applyAccentHighlights, escHtml } from '../html';
import { labelFor, type Locale } from '../labels';
import type { ContactInfo } from '../primitives/header';

export interface PosterInput {
  content: GeneratedCVContent;
  fullName: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
  locale: Locale;
}

function renderHeroBlock(fullName: string, posterLine: string | undefined, tagline: string | undefined, avatarUrl?: string | null): string {
  const tag = tagline ? `<div class="cv-poster-tagline">${escHtml(tagline)}</div>` : '';
  const line = posterLine ? `<div class="cv-poster-line">${escHtml(posterLine)}</div>` : '';
  const photo = avatarUrl
    ? `<div class="cv-poster-photo"><img src="${escHtml(avatarUrl)}" alt=""></div>`
    : '';
  return `<header class="cv-poster-hero${avatarUrl ? ' has-photo' : ''}">
  ${photo}
  ${tag}
  <h1 class="cv-poster-name">${escHtml(fullName)}</h1>
  ${line}
</header>`;
}

function renderCreditsBlock(title: string, items: string[]): string {
  if (!items.length) return '';
  return `<section class="cv-poster-credits">
  <h3 class="cv-poster-credits-title">${escHtml(title)}</h3>
  <ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>
</section>`;
}

export function renderPoster(rs: ResolvedSpec, input: PosterInput): string {
  const { content, fullName, contact, locale } = input;
  const accentKeywords = rs.emphasis.accentKeywords;

  const posterLine = rs.spec.decorators.posterLine
    ? (rs.emphasis.posterLine ?? content.headline)
    : undefined;

  // Credits-style entries: compact rows, dense small print.
  const experienceCredits = (content.experience ?? []).map(e => {
    const meta = [e.company, e.location].filter(Boolean).join(', ');
    return `<span class="cv-credit-period">${escHtml(e.period)}</span> <span class="cv-credit-role">${escHtml(e.title)}</span> <span class="cv-credit-where">${escHtml(meta)}</span>`;
  });
  const educationCredits = (content.education ?? []).map(e => {
    return `<span class="cv-credit-period">${escHtml(e.year)}</span> <span class="cv-credit-role">${escHtml(e.degree)}</span> <span class="cv-credit-where">${escHtml(e.institution)}</span>`;
  });
  const skillsCredits = content.skills
    ? [...content.skills.technical, ...content.skills.soft].map(s => escHtml(s))
    : [];
  const languagesCredits = (content.languages ?? []).map(
    l => `${escHtml(l.language)}${l.level ? ` <span style="opacity:0.6">(${escHtml(l.level)})</span>` : ''}`,
  );
  const contactCredits = [contact.email, contact.phone, contact.city, contact.linkedin, contact.github, contact.website]
    .filter(Boolean)
    .map(s => escHtml(String(s)));

  const sections = [
    `<section class="cv-poster-summary"><p>${applyAccentHighlights(escHtml(content.summary), accentKeywords)}</p></section>`,
    renderCreditsBlock(labelFor(locale, 'experience'), experienceCredits),
    renderCreditsBlock(labelFor(locale, 'education'), educationCredits),
    renderCreditsBlock(labelFor(locale, 'skills'), skillsCredits),
    renderCreditsBlock(labelFor(locale, 'languages'), languagesCredits),
    renderCreditsBlock(locale === 'en' ? 'Contact' : 'Contact', contactCredits),
  ].join('\n');

  return `<div class="cv-page cv-shape-poster">
${renderHeroBlock(fullName, posterLine, rs.emphasis.nameTagline, input.avatarUrl)}
<div class="cv-poster-body">${sections}</div>
</div>`;
}
