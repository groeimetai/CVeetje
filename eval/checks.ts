/**
 * Deterministische kwaliteitschecks op gegenereerde documenten. Elke check
 * geeft een lijst bevindingen; leeg = OK.
 */
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import type { GeneratedCVContent, JobVacancy, ParsedLinkedIn } from '../src/types';

export interface CheckResult {
  name: string;
  ok: boolean;
  findings: string[];
  metric?: number;
}

const EN_LEAKS_IN_NL = /\b(Present|Current|Native|Fluent|Proficient|January|February|March|April|May|June|July|August|September|October|November|December|Responsible for|Skills|Experience)\b/;
const NL_LEAKS_IN_EN = /\b(heden|Moedertaal|Vloeiend|januari|februari|maart|mei|juni|juli|augustus|oktober|verantwoordelijk voor|Werkervaring)\b/i;

export function contentText(c: GeneratedCVContent): string {
  return JSON.stringify(c);
}

function profileText(p: ParsedLinkedIn): string {
  return JSON.stringify(p).toLowerCase();
}

export function checkLanguage(c: GeneratedCVContent, lang: 'nl' | 'en'): CheckResult {
  const findings: string[] = [];
  const re = lang === 'nl' ? EN_LEAKS_IN_NL : NL_LEAKS_IN_EN;
  const fields: Array<[string, string | undefined | null]> = [
    ['headline', c.headline],
    ['summary', c.summary],
    ...(c.experience ?? []).flatMap((e, i) => [
      [`experience[${i}].period`, e.period] as [string, string],
      [`experience[${i}].title`, e.title] as [string, string],
      ...(e.highlights ?? []).map((h, j) => [`experience[${i}].highlights[${j}]`, h] as [string, string]),
    ]),
    ...(c.languages ?? []).map((l, i) => [`languages[${i}].level`, (l as { level?: string }).level] as [string, string]),
  ];
  for (const [path, v] of fields) {
    const m = v?.match(re);
    if (m) findings.push(`${path}: "${m[0]}" in ${lang.toUpperCase()}-CV ("${v!.slice(0, 80)}")`);
  }
  return { name: 'taalconsistentie', ok: findings.length === 0, findings };
}

export function checkBullets(c: GeneratedCVContent): CheckResult {
  const findings: string[] = [];
  let total = 0;
  for (const [i, e] of (c.experience ?? []).entries()) {
    const n = e.highlights?.length ?? 0;
    total += n;
    if (n === 0 && !(e as { description?: string }).description) findings.push(`experience[${i}] (${e.title}): geen bullets/beschrijving`);
    if (n > 6) findings.push(`experience[${i}] (${e.title}): ${n} bullets (te veel)`);
    for (const [j, h] of (e.highlights ?? []).entries()) {
      const words = h.trim().split(/\s+/).length;
      if (words > 32) findings.push(`experience[${i}].highlights[${j}]: ${words} woorden (te lang)`);
    }
  }
  return { name: 'bullets', ok: findings.length === 0, findings, metric: total };
}

/** Getallen/percentages in de output die nergens in het profiel staan. */
export function checkFabricatedNumbers(c: GeneratedCVContent, p: ParsedLinkedIn): CheckResult {
  const src = profileText(p);
  const findings: string[] = [];
  const texts = [c.summary ?? '', c.headline ?? '', ...(c.experience ?? []).flatMap((e) => e.highlights ?? [])];
  for (const t of texts) {
    for (const m of t.matchAll(/(\d+[.,]?\d*\s?%|\b\d{2,}(?:[.,]\d+)?\b)/g)) {
      const num = m[1].replace(/\s/g, '');
      const bare = num.replace('%', '');
      // jaartallen uit periodes/jaren ervaring negeren als ze in het profiel voorkomen
      if (src.includes(bare.toLowerCase())) continue;
      if (/^(19|20)\d{2}$/.test(bare)) continue;
      findings.push(`"${num}" in: "${t.slice(0, 90)}"`);
    }
  }
  return { name: 'verzonnen-getallen', ok: findings.length === 0, findings };
}

export function checkCompleteness(c: GeneratedCVContent, p: ParsedLinkedIn): CheckResult {
  const findings: string[] = [];
  if (!c.summary || c.summary.length < 60) findings.push('samenvatting ontbreekt of is erg kort');
  if (!c.headline) findings.push('headline ontbreekt');
  const genExp = c.experience?.length ?? 0;
  if (genExp < Math.min(p.experience.length, 3)) findings.push(`ervaring: ${genExp} van ${p.experience.length} rollen in CV`);
  if ((c.education?.length ?? 0) < Math.min(p.education.length, 1)) findings.push('opleiding ontbreekt');
  const skills = (c.skills?.technical?.length ?? 0) + (c.skills?.soft?.length ?? 0);
  if (skills < Math.min(p.skills.length, 3)) findings.push(`vaardigheden: ${skills} (profiel heeft ${p.skills.length})`);
  if ((c.languages?.length ?? 0) < p.languages.length) findings.push(`talen: ${c.languages?.length ?? 0} van ${p.languages.length}`);
  return { name: 'volledigheid', ok: findings.length === 0, findings };
}

export function checkKeywordCoverage(c: GeneratedCVContent, v: JobVacancy | null, p: ParsedLinkedIn): CheckResult {
  if (!v) return { name: 'keyword-dekking', ok: true, findings: [], metric: 1 };
  const out = contentText(c).toLowerCase();
  const src = profileText(p);
  const relevant = (v.keywords ?? []).filter((k) => src.includes(k.toLowerCase()));
  const missing = relevant.filter((k) => !out.includes(k.toLowerCase()));
  const metric = relevant.length ? (relevant.length - missing.length) / relevant.length : 1;
  return {
    name: 'keyword-dekking',
    ok: metric >= 0.8,
    findings: missing.map((k) => `vacature-keyword "${k}" staat in het profiel maar niet in het CV`),
    metric,
  };
}

export async function checkPdf(bytes: Uint8Array, label: string, maxPages: number): Promise<CheckResult> {
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPageCount();
  const findings: string[] = [];
  if (pages > maxPages) findings.push(`${label}: ${pages} pagina's (verwacht ≤ ${maxPages})`);
  return { name: `pdf-${label}`, ok: findings.length === 0, findings, metric: pages };
}

export async function checkLetterDocx(bytes: Uint8Array, lang: 'nl' | 'en'): Promise<CheckResult> {
  const zip = await JSZip.loadAsync(bytes);
  const xml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  const text = xml.replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '').replace(/[ \t]+/g, ' ');
  const findings: string[] = [];
  const dates = text.match(/\b\d{1,2} (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/gi) ?? [];
  if (dates.length > 1) findings.push(`datum ${dates.length}x in de brief`);
  const subjects = text.match(/\b(Motivatiebrief|Betreft|Re:|Subject)\b/g) ?? [];
  if (subjects.length > 1) findings.push(`onderwerpregel ${subjects.length}x (${subjects.join(', ')})`);
  if (lang === 'en' && /Met vriendelijke groet/i.test(text)) findings.push('Engelse brief eindigt met "Met vriendelijke groet"');
  if (lang === 'nl' && /Kind regards|Best regards|Sincerely/i.test(text)) findings.push('Nederlandse brief eindigt met Engelse groet');
  const greetings = text.match(/(Met vriendelijke groet|Kind regards|Best regards)/gi) ?? [];
  if (greetings.length > 1) findings.push(`afsluiting ${greetings.length}x`);
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 200 || words > 520) findings.push(`lengte ${words} woorden (doel ~280-360 + aanhef/ondertekening)`);
  return { name: 'brief-docx', ok: findings.length === 0, findings, metric: words };
}

export function checkAiTells(text: string): CheckResult {
  const tells = [
    'resultaatgericht', 'results-driven', 'gepassioneerd', 'passionate', 'dynamische', 'dynamic',
    'synergie', 'synergy', 'leverage', 'cutting-edge', 'state-of-the-art', 'spearheaded', 'tapestry',
    'naadloos', 'seamless', '—',
  ];
  const lower = text.toLowerCase();
  const found = tells.filter((t) => lower.includes(t));
  return { name: 'ai-tells', ok: found.length <= 1, findings: found.map((t) => `"${t}"`), metric: found.length };
}
