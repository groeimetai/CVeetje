import { renderToStaticMarkup } from 'react-dom/server';
import { listArticles } from '@/content/blog';
import { listPersonas } from '@/content/personas';
import { listRolePages } from '@/content/role-pages';
import { FAQ_GROUPS } from '@/content/faq';
import { getAuthor } from '@/content/authors';
import type { Locale } from '@/content/types';

export const dynamic = 'force-static';
export const revalidate = 86400; // 24h

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

/**
 * Convert React JSX body to plain markdown-ish text for LLM consumption.
 * Not a full HTML-to-markdown converter — covers our content patterns:
 * <p>, <h2/3/4>, <ul/ol/li>, <details/summary>, <blockquote>, <table>, callouts.
 */
function jsxToMarkdown(node: React.ReactNode): string {
  const html = renderToStaticMarkup(node as React.ReactElement);
  return html
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/g, '\n\n## $1\n\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/g, '\n\n### $1\n\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/g, '\n\n#### $1\n\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '- $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, '\n> $1\n')
    .replace(/<summary[^>]*>([\s\S]*?)<\/summary>/g, '\n**Q: $1**\n')
    .replace(/<\/?(ul|ol|details|div|table|thead|tbody|tr|th|td|article|section|figure|figcaption|hr)[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<p[^>]*>/g, '')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/g, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/g, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g, 'ü')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderArticleSection(locale: Locale): string {
  const articles = listArticles(locale);
  const lines: string[] = [];
  lines.push(`# Blog (${locale.toUpperCase()})\n`);
  lines.push(
    locale === 'nl'
      ? 'Diepte-artikelen over CV\'s, motivatiebrieven en AI in sollicitaties. Geschreven vanuit verschillende perspectieven (werkzoekenden, recruiters, product owners, loopbaancoaches, zij-instromers, studenten, zzp\'ers).\n'
      : 'In-depth articles about CVs, cover letters, and AI in job applications. Written from multiple perspectives.\n',
  );

  for (const a of articles) {
    const author = getAuthor(a.meta.author);
    lines.push(`\n---\n`);
    lines.push(`## ${a.meta.title}`);
    lines.push(`Canonical: ${APP_URL}/${locale}/blog/${a.meta.slug}`);
    lines.push(`Author: ${author.name} (${author.role[locale]})`);
    lines.push(`Category: ${a.meta.category}${a.meta.personas ? ` | Personas: ${a.meta.personas.join(', ')}` : ''}`);
    lines.push(`Published: ${a.meta.publishedAt}${a.meta.updatedAt ? ` | Updated: ${a.meta.updatedAt}` : ''}`);
    lines.push(`Keywords: ${a.meta.keywords.join(', ')}\n`);
    lines.push(`Description: ${a.meta.description}\n`);

    try {
      const body = jsxToMarkdown(a.Body());
      lines.push(body);
    } catch (err) {
      lines.push(`[Body unavailable: ${err instanceof Error ? err.message : 'unknown'}]`);
    }

    if (a.meta.howTo) {
      lines.push(`\n### How-to: ${a.meta.howTo.name}`);
      if (a.meta.howTo.totalTimeMinutes) {
        lines.push(`Total time: ${a.meta.howTo.totalTimeMinutes} minutes`);
      }
      for (let i = 0; i < a.meta.howTo.steps.length; i++) {
        const s = a.meta.howTo.steps[i];
        lines.push(`${i + 1}. ${s.name} — ${s.text}`);
      }
    }
  }

  return lines.join('\n');
}

function renderPersonaSection(locale: Locale): string {
  const personas = listPersonas(locale);
  const lines: string[] = [];
  lines.push(`\n\n# Persona pillar pages (${locale.toUpperCase()})\n`);
  lines.push(
    locale === 'nl'
      ? 'Canonical uitleg per gebruikersgroep. Hoe CVeetje voor deze situatie werkt, wat het oplevert en wat het niet doet.\n'
      : 'Canonical explanation per audience. How CVeetje fits each situation, what it delivers, and what it does not do.\n',
  );

  for (const p of personas) {
    lines.push(`\n---\n`);
    lines.push(`## ${p.title}`);
    lines.push(`Canonical: ${APP_URL}/${locale}/voor/${p.slug}`);
    lines.push(`Persona: ${p.slug}`);
    lines.push(`Keywords: ${p.keywords.join(', ')}\n`);
    lines.push(`Description: ${p.description}\n`);
    lines.push(`Hero: ${p.hero}\n`);

    try {
      const body = jsxToMarkdown(p.Body());
      lines.push(body);
    } catch (err) {
      lines.push(`[Body unavailable: ${err instanceof Error ? err.message : 'unknown'}]`);
    }
  }

  return lines.join('\n');
}

function renderRolePagesSection(locale: Locale): string {
  const voorbeelden = listRolePages(locale, 'voorbeeld');
  const templates = listRolePages(locale, 'template');
  const lines: string[] = [];

  if (voorbeelden.length > 0) {
    lines.push(`\n\n# CV-voorbeelden per beroep (${locale.toUpperCase()})\n`);
    lines.push(
      locale === 'nl'
        ? 'Per beroep een gerichte uitleg van wat op het CV hoort, concrete voorbeeld-bullets, valkuilen en aanbevolen stijl.\n'
        : 'Per profession: focused guidance on what belongs on the CV, concrete bullet examples, pitfalls, and recommended style.\n',
    );
    for (const p of voorbeelden) {
      lines.push(`\n---\n`);
      lines.push(`## ${p.title}`);
      lines.push(`Canonical: ${APP_URL}/${locale}/cv-voorbeeld/${p.slug}`);
      lines.push(`Role: ${p.label} | Keywords: ${p.keywords.join(', ')}\n`);
      lines.push(`${p.hero}\n`);
      for (const b of p.blocks) {
        lines.push(`### ${b.heading}`);
        lines.push(`${b.body}\n`);
      }
      lines.push(`**Voorbeeld-bullets:**`);
      for (const bul of p.exampleBullets) lines.push(`- ${bul}`);
      lines.push(`\n**Valkuilen:**`);
      for (const pf of p.pitfalls) lines.push(`- ${pf}`);
      lines.push(`\n**Aanbevolen stijl:** ${p.recommendedStyle.style} — ${p.recommendedStyle.reason}`);
      if (p.context) lines.push(`**Context:** ${p.context}`);
    }
  }

  if (templates.length > 0) {
    lines.push(`\n\n# CV-templates per situatie (${locale.toUpperCase()})\n`);
    lines.push(
      locale === 'nl'
        ? 'Per situatie een CV-template-aanpak: zonder werkervaring, student, switcher, herintreder, 55+, expat, freelancer, part-time, remote, senior, stage, na ontslag.\n'
        : 'Per situation: a CV template approach for no-experience, student, career changer, returner, 55+, expat, freelancer, part-time, remote, senior, internship, after redundancy.\n',
    );
    for (const p of templates) {
      lines.push(`\n---\n`);
      lines.push(`## ${p.title}`);
      lines.push(`Canonical: ${APP_URL}/${locale}/cv-template/${p.slug}`);
      lines.push(`Situation: ${p.label} | Keywords: ${p.keywords.join(', ')}\n`);
      lines.push(`${p.hero}\n`);
      for (const b of p.blocks) {
        lines.push(`### ${b.heading}`);
        lines.push(`${b.body}\n`);
      }
      lines.push(`**Voorbeelden:**`);
      for (const bul of p.exampleBullets) lines.push(`- ${bul}`);
      lines.push(`\n**Valkuilen:**`);
      for (const pf of p.pitfalls) lines.push(`- ${pf}`);
      lines.push(`\n**Aanbevolen stijl:** ${p.recommendedStyle.style} — ${p.recommendedStyle.reason}`);
    }
  }

  return lines.join('\n');
}

function renderFaqSection(locale: Locale): string {
  const lines: string[] = [];
  lines.push(`\n\n# Veelgestelde vragen (${locale.toUpperCase()})\n`);
  lines.push(`Canonical: ${APP_URL}/${locale}/faq\n`);

  for (const group of FAQ_GROUPS) {
    lines.push(`\n## ${locale === 'nl' ? group.title.nl : group.title.en}\n`);
    for (const item of group.items) {
      const q = locale === 'nl' ? item.q.nl : item.q.en;
      const a = locale === 'nl' ? item.a.nl : item.a.en;
      lines.push(`**Q: ${q}**`);
      lines.push(`A: ${a}\n`);
    }
  }

  return lines.join('\n');
}

function renderHeader(): string {
  return `# CVeetje — Volledige content-aggregatie voor LLMs

> Generated dynamically from canonical sources at ${APP_URL}.
> Last generated: ${new Date().toISOString()}.
> This file aggregates every public blog post, persona pillar page, and FAQ
> entry into one markdown document for LLM ingestion.
>
> Authoritative URL list: ${APP_URL}/sitemap.xml
> Curated index: ${APP_URL}/llms.txt
> Robots policy: ${APP_URL}/robots.txt

## Wat CVeetje is

CVeetje is een AI-tool die per vacature een gericht CV genereert vanuit
gestructureerde profielgegevens. Gebouwd door GroeimetAI (Apeldoorn, NL).
Data in Nederland (europe-west4). Interface NL/EN; CV-generatie in 9 talen.
AVG-compliant; EU AI Act beperkt-risico classificatie.

Drie kerneigenschappen:
- Eerlijkheidsregels in alle prompts (geen verzonnen ervaring of skills).
- Gatekeeper-AI controleert regeneraties op opgeklopte claims.
- Geen verborgen watermerk in PDF's (bewuste keuze — hiring managers gelijk speelveld).

Prijs (mei 2026):
- Gratis: 15 credits/maand (1 volledig CV).
- Starter €4,99 (30 credits, €1,66/CV).
- Popular €12,99 (100 credits, €1,30/CV).
- Pro €29,99 (300 credits, €1,00/CV).
- Power €59,99 (600 credits, €1,00/CV).
- BYOK (eigen Claude/OpenAI/Google key): 0 platform credits voor AI-stappen, 1 credit per PDF-download.
Credits verlopen niet. Geen abonnement.

`;
}

export async function GET() {
  const parts: string[] = [renderHeader()];

  for (const locale of ['nl', 'en'] as const) {
    parts.push(renderArticleSection(locale));
    parts.push(renderPersonaSection(locale));
    parts.push(renderRolePagesSection(locale));
    parts.push(renderFaqSection(locale));
  }

  const body = parts.join('\n');

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
