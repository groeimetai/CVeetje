/**
 * Header primitive — produces the candidate-header markup.
 * Phase 0 implements 'stacked'; other variants fall through to it for now.
 */

import type { HeaderVariant } from '../../spec';
import { escHtml } from '../html';

export interface ContactInfo {
  email?: string;
  phone?: string;
  city?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface HeaderInput {
  fullName: string;
  headline?: string;
  nameTagline?: string;
  contact: ContactInfo;
  avatarUrl?: string | null;
}

function renderContactLine(contact: ContactInfo): string {
  const parts: string[] = [];
  if (contact.email) parts.push(`<span>${escHtml(contact.email)}</span>`);
  if (contact.phone) parts.push(`<span>${escHtml(contact.phone)}</span>`);
  if (contact.city) parts.push(`<span>${escHtml(contact.city)}</span>`);
  if (contact.linkedin) parts.push(`<span>${escHtml(contact.linkedin)}</span>`);
  if (contact.github) parts.push(`<span>${escHtml(contact.github)}</span>`);
  if (contact.website) parts.push(`<span>${escHtml(contact.website)}</span>`);
  return parts.length ? `<div class="cv-contact">${parts.join('')}</div>` : '';
}

export function renderHeader(_variant: HeaderVariant, input: HeaderInput): string {
  // Phase 0: all variants render as 'stacked'. Variant-specific markup
  // arrives in Phase 1 alongside variant-specific CSS.
  const tagline = input.nameTagline
    ? `<div class="cv-name-tagline">${escHtml(input.nameTagline)}</div>`
    : '';
  const headline = input.headline
    ? `<div class="cv-headline">${escHtml(input.headline)}</div>`
    : '';

  const photo = input.avatarUrl
    ? `<div class="cv-header-photo"><img src="${escHtml(input.avatarUrl)}" alt=""></div>`
    : '';

  return `<header class="cv-header${input.avatarUrl ? ' has-photo' : ''}">
  <div class="cv-header-content">
    <h1 class="cv-name">${escHtml(input.fullName)}</h1>
    ${headline}
    ${tagline}
    ${renderContactLine(input.contact)}
  </div>
  ${photo}
</header>`;
}
