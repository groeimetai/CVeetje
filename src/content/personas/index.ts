import type { ReactNode } from 'react';
import type { Persona, Locale } from '../types';

import * as werkzoekendenNl from './nl/werkzoekenden';
import * as recruitersNl from './nl/recruiters';
import * as studentenNl from './nl/studenten';
import * as zijInstromersNl from './nl/zij-instromers';
import * as loopbaancoachesNl from './nl/loopbaancoaches';
import * as productOwnersNl from './nl/product-owners';
import * as hiringManagersNl from './nl/hiring-managers';
import * as zzpNl from './nl/zzp';
import * as internationalsNl from './nl/internationals';
import * as herintredersNl from './nl/herintreders';

import * as jobSeekersEn from './en/job-seekers';
import * as recruitersEn from './en/recruiters';
import * as careerSwitchersEn from './en/career-switchers';
import * as freelancersEn from './en/freelancers';

export interface PersonaPage {
  slug: Persona;
  locale: Locale;
  title: string;
  description: string;
  hero: string;
  keywords: string[];
  Body: () => ReactNode;
  relatedBlogSlugs?: string[];
}

const NL_PERSONAS: PersonaPage[] = [
  werkzoekendenNl,
  recruitersNl,
  studentenNl,
  zijInstromersNl,
  loopbaancoachesNl,
  productOwnersNl,
  hiringManagersNl,
  zzpNl,
  internationalsNl,
  herintredersNl,
] as unknown as PersonaPage[];

// Map EN slugs to the canonical Persona enum (we reuse NL slugs as the persona key)
const EN_PERSONAS: PersonaPage[] = [
  jobSeekersEn,
  recruitersEn,
  careerSwitchersEn,
  freelancersEn,
] as unknown as PersonaPage[];

export function listPersonas(locale: Locale): PersonaPage[] {
  return locale === 'nl' ? NL_PERSONAS : EN_PERSONAS;
}

export function getPersona(locale: Locale, slug: string): PersonaPage | null {
  return listPersonas(locale).find((p) => p.slug === slug) ?? null;
}

export function allPersonaSlugs(): { locale: Locale; slug: string }[] {
  return [
    ...NL_PERSONAS.map((p) => ({ locale: 'nl' as Locale, slug: p.slug })),
    ...EN_PERSONAS.map((p) => ({ locale: 'en' as Locale, slug: p.slug })),
  ];
}
