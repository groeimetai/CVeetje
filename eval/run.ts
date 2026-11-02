/**
 * Documentgeneratie-evaluatie.
 *
 *   npm run eval:docgen                 # echte AI (ANTHROPIC_API_KEY of ANTHROPIC_PLATFORM_API_KEY)
 *   npm run eval:docgen -- --mock       # plumbing-check tegen de e2e-mock (geen kosten)
 *   npm run eval:docgen -- --judge      # + LLM-judge (rubric) per case
 *   npm run eval:docgen -- --case senior-dev-nl
 *
 * Roept de bibliotheekfuncties direct aan (geen Firebase): vacature-parse →
 * fit-analyse → stijl (v2) → CV-content → PDF (a4 + single) → motivatiebrief
 * (PDF + DOCX). Per case worden artefacten + een trace weggeschreven naar
 * eval/output/<run>/ en een samenvatting (summary.md / summary.json).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PROFILES } from './fixtures/profiles';
import { CASES, VACANCIES } from './fixtures/vacancies';
import {
  checkAiTells,
  checkBullets,
  checkCompleteness,
  checkFabricatedNumbers,
  checkKeywordCoverage,
  checkLanguage,
  checkLetterDocx,
  checkPdf,
  contentText,
  type CheckResult,
} from './checks';

const args = process.argv.slice(2);
const MOCK = args.includes('--mock');
const JUDGE = args.includes('--judge');
const onlyCase = args.includes('--case') ? args[args.indexOf('--case') + 1] : null;
const MODEL = args.includes('--model') ? args[args.indexOf('--model') + 1] : 'claude-opus-4-7';

async function main() {
  // Echte runs: de sessie-proxy (ANTHROPIC_BASE_URL) niet gebruiken.
  if (!MOCK) delete process.env.ANTHROPIC_BASE_URL;
  let mockServer: { close: () => void } | null = null;
  if (MOCK) {
    const { startMockAiServer } = await import('../e2e/mock-ai/server');
    mockServer = await startMockAiServer(4011);
    process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:4011/v1';
  }
  const apiKey = MOCK ? 'mock' : process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_PLATFORM_API_KEY;
  if (!apiKey) {
    console.error('Zet ANTHROPIC_API_KEY (of ANTHROPIC_PLATFORM_API_KEY), of gebruik --mock.');
    process.exit(1);
  }

  const { parseJobVacancy } = await import('../src/lib/ai/job-parser');
  const { analyzeFit } = await import('../src/lib/ai/fit-analyzer');
  const { generateCV } = await import('../src/lib/ai/cv-generator');
  const { generateStyleTokensV2 } = await import('../src/lib/cv-engine/ai/orchestrator');
  const { createLinkedInSummaryV2 } = await import('../src/lib/ai/style-experts/shared/linkedin-summary');
  const { renderCV } = await import('../src/lib/cv-engine/dispatch');
  const { generatePDF } = await import('../src/lib/pdf/generator');
  const { generateMotivationLetter } = await import('../src/lib/ai/motivation-generator');
  const { generateMotivationLetterPDF, generateMotivationLetterDOCX } = await import('../src/lib/pdf/motivation-letter-generator');
  const { getDefaultTokens } = await import('../src/lib/cv/html-generator');
  const { judgeCase } = await import('./judge');

  const runId = new Date().toISOString().replace(/[:.]/g, '-') + (MOCK ? '-mock' : '');
  const outRoot = path.join(__dirname, 'output', runId);
  mkdirSync(outRoot, { recursive: true });

  // console.log van de generators afvangen (o.a. claim-validator-strips)
  const logs: string[] = [];
  const origLog = console.log;
  const origWarn = console.warn;
  console.log = (...a: unknown[]) => {
    logs.push(a.map(String).join(' '));
  };
  console.warn = (...a: unknown[]) => {
    logs.push('WARN ' + a.map(String).join(' '));
  };
  const say = (...a: unknown[]) => origLog(...a);

  const summary: Array<Record<string, unknown>> = [];

  for (const c of CASES) {
    const caseId = `${c.profile}__${c.vacancy ?? 'geen-vacature'}__${c.creativity}`;
    if (onlyCase && !caseId.includes(onlyCase)) continue;
    const dir = path.join(outRoot, caseId);
    mkdirSync(dir, { recursive: true });
    const fx = PROFILES.find((p) => p.id === c.profile)!;
    const vfx = c.vacancy ? VACANCIES.find((v) => v.id === c.vacancy)! : null;
    const lang = vfx?.language ?? 'nl';
    const checks: CheckResult[] = [];
    const trace: Record<string, unknown> = { case: caseId, risk: fx.risk, model: MODEL };
    const t0 = Date.now();
    logs.length = 0;
    say(`\n▶ ${caseId}`);

    try {
      const vacancy = vfx ? (await parseJobVacancy(vfx.text, 'anthropic', apiKey, MODEL)).vacancy : null;
      trace.vacancy = vacancy;
      const fit = vacancy ? (await analyzeFit(fx.profile, vacancy, 'anthropic', apiKey, MODEL)).analysis : null;
      trace.fit = fit;

      const style = await generateStyleTokensV2({
        linkedInSummary: createLinkedInSummaryV2(fx.profile),
        jobVacancy: vacancy,
        creativityLevel: c.creativity,
        provider: 'anthropic',
        apiKey,
        model: MODEL,
        hasPhoto: false,
      });
      trace.tokens = style.tokens;

      const gen = await generateCV(fx.profile, vacancy, 'anthropic', apiKey, MODEL, style.tokens as never, lang, 'bullets', fit);
      const content = gen.content;
      trace.content = content;
      trace.usage = gen.usage;

      checks.push(checkCompleteness(content, fx.profile));
      checks.push(checkLanguage(content, lang));
      checks.push(checkBullets(content));
      checks.push(checkFabricatedNumbers(content, fx.profile));
      checks.push(checkKeywordCoverage(content, vacancy, fx.profile));
      checks.push(checkAiTells(contentText(content)));
      const stripped = logs.filter((l) => /Stripped|stripped|fabricated/i.test(l));
      checks.push({ name: 'claim-validator-strips', ok: stripped.length === 0, findings: stripped.map((s) => s.slice(0, 300)) });

      const html = renderCV(content, style.tokens as never, { fullName: fx.profile.fullName, locale: lang, pageMode: 'a4-paged' });
      writeFileSync(path.join(dir, 'cv.html'), html);
      const pdf = await generatePDF(content, fx.profile.fullName, style.tokens as never, null, fx.profile.headline, null, { email: fx.profile.email }, 'multi-page', lang);
      writeFileSync(path.join(dir, 'cv-a4.pdf'), pdf);
      checks.push(await checkPdf(pdf, 'cv-a4', 2));
      const pdfLong = await generatePDF(content, fx.profile.fullName, style.tokens as never, null, fx.profile.headline, null, { email: fx.profile.email }, 'single-page', lang);
      writeFileSync(path.join(dir, 'cv-single.pdf'), pdfLong);
      checks.push(await checkPdf(pdfLong, 'cv-single', 1));

      if (vacancy) {
        const ml = await generateMotivationLetter(fx.profile, vacancy, content, 'anthropic', apiKey, MODEL, lang);
        trace.letter = ml.letter;
        const data = {
          fullText: ml.letter.fullText,
          recipientCompany: vacancy.company ?? undefined,
          senderName: fx.profile.fullName,
          senderEmail: fx.profile.email,
          senderLocation: fx.profile.location ?? undefined,
          language: lang,
        };
        const letterPdf = await generateMotivationLetterPDF(data, getDefaultTokens());
        writeFileSync(path.join(dir, 'brief.pdf'), letterPdf);
        const letterDocx = await generateMotivationLetterDOCX(data, getDefaultTokens());
        writeFileSync(path.join(dir, 'brief.docx'), letterDocx);
        checks.push(await checkLetterDocx(letterDocx, lang));
        checks.push({ ...checkAiTells(ml.letter.fullText), name: 'ai-tells-brief' });
      }

      if (JUDGE && !MOCK) {
        trace.judge = await judgeCase({ apiKey, model: MODEL, profile: fx.profile, vacancyText: vfx?.text ?? null, content, letter: (trace.letter as { fullText?: string } | undefined)?.fullText ?? null, lang });
      }
    } catch (err) {
      checks.push({ name: 'pipeline', ok: false, findings: [String(err instanceof Error ? err.stack ?? err.message : err).slice(0, 800)] });
    }

    trace.checks = checks;
    trace.logs = logs.slice();
    trace.durationMs = Date.now() - t0;
    writeFileSync(path.join(dir, 'trace.json'), JSON.stringify(trace, null, 2));
    const failed = checks.filter((x) => !x.ok);
    say(`  ${failed.length === 0 ? '✓' : '✗'} ${checks.length - failed.length}/${checks.length} checks OK (${Math.round((Date.now() - t0) / 1000)}s)`);
    for (const f of failed) say(`    - ${f.name}: ${f.findings.slice(0, 3).join(' | ')}`);
    summary.push({ case: caseId, checks: checks.map((x) => ({ name: x.name, ok: x.ok, metric: x.metric, findings: x.findings })), judge: trace.judge ?? null });
  }

  writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(path.join(outRoot, 'summary.md'), renderMarkdown(summary, runId));
  console.log = origLog;
  console.warn = origWarn;
  say(`\nOutput: ${outRoot}`);
  mockServer?.close();
  process.exit(0);
}

function renderMarkdown(summary: Array<Record<string, unknown>>, runId: string): string {
  const lines = [`# Docgen-eval ${runId}`, '', `Model: ${MODEL}${MOCK ? ' (mock)' : ''}`, ''];
  for (const s of summary) {
    const checks = s.checks as Array<{ name: string; ok: boolean; metric?: number; findings: string[] }>;
    lines.push(`## ${s.case}`, '', '| Check | OK | Metric | Bevindingen |', '|---|---|---|---|');
    for (const c of checks) {
      lines.push(`| ${c.name} | ${c.ok ? '✓' : '✗'} | ${c.metric ?? ''} | ${c.findings.slice(0, 4).join('<br>').replace(/\|/g, '\\|')} |`);
    }
    if (s.judge) lines.push('', '```json', JSON.stringify(s.judge, null, 2), '```');
    lines.push('');
  }
  return lines.join('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
