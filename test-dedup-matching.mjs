// Ad-hoc verificatie van de matching/dedup fixes in cv-generator.ts.
// Tested matching paths (norm, projectTitlesLikelyMatch, experience-dedup).
// Run: `node test-dedup-matching.mjs`

import assert from 'node:assert/strict';

// Re-implement the helpers verbatim from cv-generator.ts so we can test
// without spinning up the whole module (which pulls Firebase Admin etc).
function norm(s) {
  return (s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s) {
  return new Set(
    (s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

function normPeriod(p) {
  return (p ?? '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function periodsOverlap(a, b) {
  const na = normPeriod(a);
  const nb = normPeriod(b);
  if (na.length === 0 || nb.length === 0) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function projectTitlesLikelyMatch(titleA, titleB, periodA, periodB) {
  const setA = tokenSet(titleA);
  const setB = tokenSet(titleB);
  if (setA.size === 0 || setB.size === 0) return false;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;
  if (shared === 0) return false;
  const shortest = Math.min(setA.size, setB.size);
  if (shortest === 1) {
    if (periodsOverlap(periodA, periodB)) return true;
    return norm(titleA) === norm(titleB);
  }
  if (shared < 2) return false;
  if (shared / shortest < 0.5) return false;
  if (shortest > 3) return shared >= 3;
  if (periodsOverlap(periodA, periodB)) return true;
  if (!normPeriod(periodA) || !normPeriod(periodB)) {
    return setA.size === setB.size && shared === setA.size;
  }
  return false;
}

// --- norm() ---
assert.equal(norm('Big Tech Inc.'), 'big tech inc',
  'norm: trailing period must be stripped');
assert.equal(norm('Big Tech, B.V.'), 'big tech b v',
  'norm: commas + periods stripped, whitespace collapsed');
assert.equal(norm('Acmé Corp'), 'acme corp',
  'norm: diacritics stripped');
assert.equal(norm('  Hello   World  '), 'hello world',
  'norm: whitespace collapsed');

// --- projectTitlesLikelyMatch: single-token cases ---
// Same single-word title, no period info → match via title equality fallback
assert.equal(projectTitlesLikelyMatch('Phoenix', 'Phoenix', '', ''), true,
  'single-token exact match without period should match');
// Same single-word title with same period → match
assert.equal(projectTitlesLikelyMatch('Phoenix', 'Phoenix', '2024', '2024'), true,
  'single-token same title same period should match');
// Same single-word title, different periods → still match (title equality wins)
assert.equal(projectTitlesLikelyMatch('Phoenix', 'Phoenix', '2024', '2025'), true,
  'single-token same title even with different periods should match (title equal)');
// Different single-word titles with same period → no match
assert.equal(projectTitlesLikelyMatch('Phoenix', 'Apollo', '2024', '2024'), false,
  'single-token DIFFERENT titles should NOT match');
// Different single-word titles, different periods → no match
assert.equal(projectTitlesLikelyMatch('Marketing', 'Engineering', '', ''), false,
  'different single-word titles should NOT match');

// --- projectTitlesLikelyMatch: multi-token cases ---
// The exact case from the original comment — period overlap rescues it
assert.equal(projectTitlesLikelyMatch(
  'Serac — Multi-Agent Orchestration Platform',
  'Serac: Multi Agent Orchestration ServiceNow Development Platform',
  'Jul 2025', 'Jul 2025',
), true, 'multi-token reframed title with same period should match');

// Generic-word false-positive guard
assert.equal(projectTitlesLikelyMatch(
  'Social Media Strategy Agent',
  'Automated Social Media Comments',
  '2024', '2024',
), false, 'multi-token but only generic words shared, even with same period, should NOT match');

// 2-token title with no period → fallback to exact-set equality
assert.equal(projectTitlesLikelyMatch(
  'Website Redesign', 'Website Redesign', '', '',
), true, '2-token identical title without period should match via fallback');
assert.equal(projectTitlesLikelyMatch(
  'Website Redesign', 'Mobile Redesign', '', '',
), false, '2-token title sharing only one token, no period → no match');

// --- Experience dedup logic ---
function isExperienceDup(e, k) {
  const eCompany = norm(e.company);
  const eTitle = norm(e.title);
  const kCompany = norm(k.company);
  if (eCompany.length === 0 || kCompany.length === 0) return false;
  const sameCompany = eCompany.includes(kCompany) || kCompany.includes(eCompany);
  if (!sameCompany) return false;
  const kTitle = norm(k.title);
  const exactTitle = eTitle.length > 0 && eTitle === kTitle;
  if (exactTitle) return true;
  const titleOverlap = eTitle.length > 0 && kTitle.length > 0 && (eTitle.includes(kTitle) || kTitle.includes(eTitle));
  return titleOverlap && periodsOverlap(e.period, k.period);
}

// PROMOTION CASE — must NOT be deduped
assert.equal(isExperienceDup(
  { company: 'Acme', title: 'Software Engineer', period: '2018 – 2020' },
  { company: 'Acme', title: 'Senior Software Engineer', period: '2020 – Present' },
), false, 'promotion at same company should NOT be deduped');

// REFRAME CASE — should be deduped (titles overlap, same period)
assert.equal(isExperienceDup(
  { company: 'Acme', title: 'Software Engineer', period: '2020 – 2022' },
  { company: 'Acme', title: 'Software Engineer (Backend)', period: '2020 – 2022' },
), true, 'AI reframed title in same period should be deduped');

// FORMAT-DRIFT CASE — should be deduped (exact title, different period FORMAT)
assert.equal(isExperienceDup(
  { company: 'Acme', title: 'Software Engineer', period: 'Jan 2020 – Dec 2022' },
  { company: 'Acme', title: 'Software Engineer', period: '2020 – 2022' },
), true, 'exact title at same company should be deduped regardless of period format');

// COMPANY WITH PUNCTUATION — should match
assert.equal(isExperienceDup(
  { company: 'Big Tech Inc.', title: 'Engineer', period: '2020' },
  { company: 'Big Tech Inc', title: 'Engineer', period: '2020' },
), true, 'company name punctuation drift should still be deduped');

console.log('All assertions passed.');
