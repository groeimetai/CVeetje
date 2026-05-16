import type { Locale } from '../types';

export type StyleSuggestion = 'Conservative' | 'Balanced' | 'Creative' | 'Experimental' | 'Editorial';

export interface RolePage {
  /** URL slug — used in /cv-voorbeeld/[slug] or /cv-template/[slug] */
  slug: string;
  /** kind decides the route prefix and framing */
  kind: 'voorbeeld' | 'template';
  locale: Locale;
  /** Human-readable role or situation, used in headings */
  label: string;
  title: string;
  description: string;
  keywords: string[];
  /** Hero paragraph, ~50-80 words, what makes this role/situation unique */
  hero: string;
  /** "Wat hoort erop" — main body content blocks */
  blocks: ContentBlock[];
  /** 5-8 concrete bullet-point examples a user can adapt */
  exampleBullets: string[];
  /** 3-5 common pitfalls specific to this role/situation */
  pitfalls: string[];
  /** Recommended CV style + one-line reason */
  recommendedStyle: { style: StyleSuggestion; reason: string };
  /** Salary indication or context if relevant (NL market) */
  context?: string;
  /** Related blog post slugs in same locale */
  relatedBlogSlugs?: string[];
  /** Related persona slugs */
  relatedPersonas?: string[];
  /** Optional FAQ section appended */
  faq?: { q: string; a: string }[];
}

export interface ContentBlock {
  heading: string;
  body: string; // prose, paragraphs separated by \n\n
}
