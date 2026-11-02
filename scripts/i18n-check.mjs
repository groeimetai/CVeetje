#!/usr/bin/env node
/**
 * i18n-check — draai met `npm run i18n:check`.
 *
 * 1. nl.json en en.json moeten exact dezelfde keys hebben.
 * 2. Heuristiek voor hardcoded UI-tekst in het ingelogde deel: letterlijke
 *    JSX-tekst (tussen tags) en hardcoded string-props (placeholder, title,
 *    aria-label, alt) in src/components en src/app/[locale]/(dashboard).
 *
 * Exit-code 1 bij key-mismatch; hardcoded tekst wordt gerapporteerd (met
 * --strict ook exit 1). Gebruik `// i18n-ignore` op een regel om die over te
 * slaan (bv. merknamen of technische labels).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const strict = process.argv.includes('--strict');

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

const nl = flatten(JSON.parse(readFileSync(path.join(root, 'src/i18n/messages/nl.json'), 'utf8')));
const en = flatten(JSON.parse(readFileSync(path.join(root, 'src/i18n/messages/en.json'), 'utf8')));
const onlyNl = [...nl].filter((k) => !en.has(k));
const onlyEn = [...en].filter((k) => !nl.has(k));
let failed = false;
if (onlyNl.length || onlyEn.length) {
  failed = true;
  console.log(`✗ Key-mismatch: ${onlyNl.length} alleen in nl, ${onlyEn.length} alleen in en`);
  for (const k of onlyNl.slice(0, 30)) console.log(`  nl-only: ${k}`);
  for (const k of onlyEn.slice(0, 30)) console.log(`  en-only: ${k}`);
} else {
  console.log(`✓ nl/en hebben dezelfde ${nl.size} keys`);
}

const DIRS = ['src/components', 'src/app/[locale]/(dashboard)'];
const SKIP_DIRS = ['src/components/ui', 'src/components/landing', 'src/components/seo'];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const rel = path.relative(root, p);
    if (SKIP_DIRS.some((d) => rel.startsWith(d))) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.tsx')) files.push(p);
  }
}
for (const d of DIRS) walk(path.join(root, d));

const JSX_TEXT = />\s*([A-Za-zÀ-ÿ][^<>{}`]*[A-Za-zÀ-ÿ.!?:)])\s*</g;
const STRING_PROP = /\b(placeholder|title|aria-label|alt)="([^"{}]*[A-Za-zÀ-ÿ]{3,}[^"{}]*)"/g;
const IGNORE_TEXT = /^(CV|CVeetje|PDF|DOCX|AI|API|LinkedIn|GitHub|Google|Mollie|URL|HTML|OK|ATS|BYOK|Ctrl K|⌘K|esc|E-mail)$/;

let hardcoded = 0;
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('i18n-ignore') || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
    for (const m of line.matchAll(JSX_TEXT)) {
      const text = m[1].trim();
      if (text.length < 3 || IGNORE_TEXT.test(text) || /^[\d\s.,:%€$+-]+$/.test(text)) continue;
      if (/=>|&&|\|\||===|\(\)/.test(text)) continue; // code, geen tekst
      hardcoded++;
      if (hardcoded <= 200) console.log(`  ${path.relative(root, f)}:${i + 1}  "${text.slice(0, 60)}"`);
    }
    for (const m of line.matchAll(STRING_PROP)) {
      if (IGNORE_TEXT.test(m[2])) continue;
      hardcoded++;
      if (hardcoded <= 200) console.log(`  ${path.relative(root, f)}:${i + 1}  ${m[1]}="${m[2].slice(0, 50)}"`);
    }
  });
}
console.log(hardcoded ? `${strict ? '✗' : '!'} ${hardcoded} mogelijke hardcoded UI-teksten` : '✓ geen hardcoded UI-tekst gevonden');
if (failed || (strict && hardcoded)) process.exit(1);
