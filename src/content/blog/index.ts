import type { Article, Locale } from '../types';

import * as cvOpMaatNl from './nl/cv-op-maat-in-2-minuten';
import * as atsCv2026Nl from './nl/ats-cv-2026';
import * as chatgptVsCveetjeNl from './nl/chatgpt-vs-cveetje';
import * as recruiterAanHetWoordNl from './nl/recruiter-aan-het-woord';
import * as motivatiebriefAITellsNl from './nl/motivatiebrief-zonder-ai-tells';
import * as docentNaarDeveloperNl from './nl/docent-naar-developer-cv';
import * as productOwnerWorkflowNl from './nl/product-owner-team-cvs';
import * as studentEersteCvNl from './nl/student-eerste-cv';
import * as zzpAcquisitieNl from './nl/zzp-acquisitie-cv-per-klant';
import * as linkedinNaarCvNl from './nl/linkedin-naar-cv-30-seconden';
import * as docxTemplateAlsBureauNl from './nl/docx-template-als-bureau';
import * as gatekeeperEerlijkheidNl from './nl/gatekeeper-eerlijkheid';
import * as creditsVsAbonnementNl from './nl/credits-vs-abonnement';
import * as byokUitlegNl from './nl/byok-eigen-ai-key';
import * as recruiterValkuilenNl from './nl/recruiter-valkuilen-cv';
import * as eigenStijlKiezenNl from './nl/welke-stijl-kies-je';
import * as ouderArbeidsmarktNl from './nl/55-plus-arbeidsmarkt-cv';
import * as internationalNederlandsCvNl from './nl/international-nederlands-cv';
import * as herintredersNl from './nl/herintreden-na-pauze';
import * as zijInstromerVerhaalNl from './nl/zij-instromer-cv-vertelt-verhaal';

import * as atsCv2026En from './en/ats-cv-2026';
import * as chatgptVsCveetjeEn from './en/chatgpt-vs-cveetje';
import * as cvInTwoMinutesEn from './en/cv-tailored-in-two-minutes';
import * as recruiterPerspectiveEn from './en/recruiter-perspective';
import * as coverLetterAITellsEn from './en/cover-letter-without-ai-tells';
import * as linkedinToCvEn from './en/linkedin-to-cv-30-seconds';

const NL_POSTS: Article[] = [
  cvOpMaatNl,
  atsCv2026Nl,
  chatgptVsCveetjeNl,
  recruiterAanHetWoordNl,
  motivatiebriefAITellsNl,
  docentNaarDeveloperNl,
  productOwnerWorkflowNl,
  studentEersteCvNl,
  zzpAcquisitieNl,
  linkedinNaarCvNl,
  docxTemplateAlsBureauNl,
  gatekeeperEerlijkheidNl,
  creditsVsAbonnementNl,
  byokUitlegNl,
  recruiterValkuilenNl,
  eigenStijlKiezenNl,
  ouderArbeidsmarktNl,
  internationalNederlandsCvNl,
  herintredersNl,
  zijInstromerVerhaalNl,
] as unknown as Article[];

const EN_POSTS: Article[] = [
  atsCv2026En,
  chatgptVsCveetjeEn,
  cvInTwoMinutesEn,
  recruiterPerspectiveEn,
  coverLetterAITellsEn,
  linkedinToCvEn,
] as unknown as Article[];

export function listArticles(locale: Locale): Article[] {
  const list = locale === 'nl' ? NL_POSTS : EN_POSTS;
  return [...list].sort(
    (a, b) => new Date(b.meta.publishedAt).getTime() - new Date(a.meta.publishedAt).getTime(),
  );
}

export function getArticle(locale: Locale, slug: string): Article | null {
  return listArticles(locale).find((a) => a.meta.slug === slug) ?? null;
}

export function listAllSlugs(): { locale: Locale; slug: string; updatedAt: string }[] {
  const all: { locale: Locale; slug: string; updatedAt: string }[] = [];
  for (const a of NL_POSTS) {
    all.push({ locale: 'nl', slug: a.meta.slug, updatedAt: a.meta.updatedAt ?? a.meta.publishedAt });
  }
  for (const a of EN_POSTS) {
    all.push({ locale: 'en', slug: a.meta.slug, updatedAt: a.meta.updatedAt ?? a.meta.publishedAt });
  }
  return all;
}

export function relatedArticles(locale: Locale, slug: string, limit = 3): Article[] {
  const current = getArticle(locale, slug);
  if (!current) return [];
  const others = listArticles(locale).filter((a) => a.meta.slug !== slug);
  const scored = others.map((a) => {
    let score = 0;
    if (a.meta.category === current.meta.category) score += 2;
    for (const p of a.meta.personas ?? []) {
      if (current.meta.personas?.includes(p)) score += 2;
    }
    for (const k of a.meta.keywords) {
      if (current.meta.keywords.includes(k)) score += 1;
    }
    return { a, score };
  });
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, limit).map((s) => s.a);
}
