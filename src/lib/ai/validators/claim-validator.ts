/**
 * Deterministic claim validator.
 *
 * Cross-checks AI-generated CV content against the source profile and strips
 * any item that has zero evidence in the source. No LLM call — pure code.
 *
 * The AI may still try to invent a "AWS" skill when the profile only mentions
 * "Azure", or list a certification the candidate doesn't have, despite the
 * prompt explicitly forbidding it. Prompts are guidance; this validator is
 * the guarantee.
 *
 * Matching strategy is permissive enough to allow legitimate reframings
 * (e.g. profile "Kubernetes" → CV "Container orchestration (Kubernetes)"
 * still matches because the token "kubernetes" appears in both), but strict
 * enough to catch fully fabricated items.
 */

import type { ParsedLinkedIn, GeneratedCVContent } from '@/types';

// Common stopwords across NL + EN. Keep small — too many false stopwords kills
// matching for short skill names like "AI" or "PM".
const STOPWORDS = new Set([
  'and', 'or', 'the', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'as', 'by',
  'en', 'het', 'een', 'van', 'aan', 'voor', 'met', 'door', 'op', 'om',
]);

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation, keep alphanumerics
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensOf(s: string): string[] {
  return normalizeText(s)
    .split(' ')
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

export interface ProfileEvidence {
  /** All normalized profile text joined — used for substring/token matching. */
  evidenceText: string;
  /** Normalized skill names — for exact-match lookup. */
  skillSet: Set<string>;
  /** Normalized certification names — for exact-match lookup. */
  certificationSet: Set<string>;
  /** Normalized company names — for exact-match lookup. */
  companySet: Set<string>;
  /** Normalized school/institution names — for exact-match lookup. */
  schoolSet: Set<string>;
  /** Normalized project titles — for exact-match lookup. */
  projectTitleSet: Set<string>;
  /** Normalized language names — for exact-match lookup. */
  languageSet: Set<string>;
  /** Normalized interest/hobby strings — for exact-match lookup. */
  interestSet: Set<string>;
}

/**
 * Build a lookup structure from the candidate's profile. All text is normalized
 * (lowercase, no diacritics, no punctuation). Sets are for exact matches; the
 * evidenceText blob is for substring/token matches when an exact match misses.
 */
export function buildProfileEvidence(profile: ParsedLinkedIn): ProfileEvidence {
  const parts: string[] = [];

  parts.push(profile.fullName || '');
  parts.push(profile.headline || '');
  parts.push(profile.location || '');
  parts.push(profile.about || '');

  for (const exp of profile.experience) {
    parts.push(exp.title);
    parts.push(exp.company);
    parts.push(exp.description || '');
  }

  for (const edu of profile.education) {
    parts.push(edu.school);
    parts.push(edu.degree || '');
    parts.push(edu.fieldOfStudy || '');
  }

  for (const skill of profile.skills) parts.push(skill.name);
  for (const cert of profile.certifications) {
    parts.push(cert.name);
    parts.push(cert.issuer || '');
  }
  for (const lang of profile.languages) parts.push(lang.language);

  for (const proj of profile.projects || []) {
    parts.push(proj.title);
    parts.push(proj.description || '');
    for (const tech of proj.technologies) parts.push(tech);
  }

  for (const interest of profile.interests || []) parts.push(interest);

  const evidenceText = parts.map(normalizeText).filter(Boolean).join(' ');

  return {
    evidenceText,
    skillSet: new Set(profile.skills.map(s => normalizeText(s.name)).filter(Boolean)),
    certificationSet: new Set(profile.certifications.map(c => normalizeText(c.name)).filter(Boolean)),
    companySet: new Set(profile.experience.map(e => normalizeText(e.company)).filter(Boolean)),
    schoolSet: new Set(profile.education.map(e => normalizeText(e.school)).filter(Boolean)),
    projectTitleSet: new Set((profile.projects || []).map(p => normalizeText(p.title)).filter(Boolean)),
    languageSet: new Set(profile.languages.map(l => normalizeText(l.language)).filter(Boolean)),
    interestSet: new Set((profile.interests || []).map(i => normalizeText(i)).filter(Boolean)),
  };
}

/**
 * Check if a claim has any evidence in the profile.
 *
 * - Strict path (exact match in lookup set) handles direct mentions
 * - Permissive path (substring or all-key-tokens-in-evidence) handles
 *   legitimate reframings ("Container orchestration (Kubernetes)" still
 *   matches because the token "kubernetes" appears in profile evidence)
 */
function hasEvidence(claim: string, exactSet: Set<string>, evidenceText: string): boolean {
  if (!claim || !claim.trim()) return false;
  const normalized = normalizeText(claim);
  if (!normalized) return false;

  // 1. Exact match against curated set
  if (exactSet.has(normalized)) return true;

  // 2. Full normalized claim appears as substring in evidence
  if (evidenceText.includes(normalized)) return true;

  // 3. All key tokens of the claim appear individually in evidence
  const claimTokens = tokensOf(claim);
  if (claimTokens.length === 0) {
    // Claim was only stopwords — treat as unverifiable, strip it
    return false;
  }
  return claimTokens.every(token => evidenceText.includes(token));
}

export interface ValidationResult<T> {
  kept: T[];
  stripped: T[];
}

function partition<T>(items: T[], predicate: (item: T) => boolean): ValidationResult<T> {
  const kept: T[] = [];
  const stripped: T[] = [];
  for (const item of items) {
    if (predicate(item)) kept.push(item);
    else stripped.push(item);
  }
  return { kept, stripped };
}

// ============ Individual validators ============

export function validateSkills(skills: string[], evidence: ProfileEvidence): ValidationResult<string> {
  return partition(skills, s => hasEvidence(s, evidence.skillSet, evidence.evidenceText));
}

export function validateCertifications(certs: string[], evidence: ProfileEvidence): ValidationResult<string> {
  return partition(certs, c => hasEvidence(c, evidence.certificationSet, evidence.evidenceText));
}

export function validateProjects<T extends { title: string }>(
  projects: T[],
  evidence: ProfileEvidence,
): ValidationResult<T> {
  return partition(projects, p => hasEvidence(p.title, evidence.projectTitleSet, evidence.evidenceText));
}

/**
 * Experience entries are validated by company name. Title reframings ARE
 * allowed (e.g. "IT Consultant" → "ServiceNow Consultant") so we don't check
 * the title — only that the company is real.
 */
export function validateExperience<T extends { company: string }>(
  experiences: T[],
  evidence: ProfileEvidence,
): ValidationResult<T> {
  return partition(experiences, e => hasEvidence(e.company, evidence.companySet, evidence.evidenceText));
}

/**
 * Education entries are validated by institution. Degree-string variations
 * (e.g. "Bachelor of Science" vs "BSc") are not checked at this layer.
 */
export function validateEducation<T extends { institution: string }>(
  educations: T[],
  evidence: ProfileEvidence,
): ValidationResult<T> {
  return partition(educations, e => hasEvidence(e.institution, evidence.schoolSet, evidence.evidenceText));
}

export function validateLanguages<T extends { language: string }>(
  langs: T[],
  evidence: ProfileEvidence,
): ValidationResult<T> {
  return partition(langs, l => hasEvidence(l.language, evidence.languageSet, evidence.evidenceText));
}

/**
 * Interests/hobbies are validated strictly against the profile's interests set.
 * No permissive matching — if the user listed "fotografie" in their profile
 * and the model returned "photography", we strip it. Interests are short free
 * strings; reframing creates fabrication risk without any upside.
 */
export function validateInterests(interests: string[], evidence: ProfileEvidence): ValidationResult<string> {
  return partition(interests, (i) => {
    const normalized = normalizeText(i);
    if (!normalized) return false;
    return evidence.interestSet.has(normalized);
  });
}

// ============ Top-level: validate a whole GeneratedCVContent ============

export interface CVContentValidationLog {
  strippedSkillsTechnical: string[];
  strippedSkillsSoft: string[];
  strippedCertifications: string[];
  strippedProjects: string[];
  strippedExperience: Array<{ title: string; company: string }>;
  strippedEducation: Array<{ degree: string; institution: string }>;
  strippedLanguages: Array<{ language: string; level: string }>;
  strippedInterests: string[];
}

export interface CVContentValidationResult {
  cleaned: GeneratedCVContent;
  log: CVContentValidationLog;
  hasAnyStripped: boolean;
}

/**
 * Run all validators against the generated CV content. Returns the content
 * with fabricated items removed, plus a log of what was stripped.
 *
 * This is the deterministic counterpart to the prompt's "do not fabricate"
 * instructions. The prompt asks the model to behave; this function enforces.
 */
export function validateCVContent(
  content: GeneratedCVContent,
  profile: ParsedLinkedIn,
): CVContentValidationResult {
  const evidence = buildProfileEvidence(profile);

  const technical = validateSkills(content.skills.technical || [], evidence);
  const soft = validateSkills(content.skills.soft || [], evidence);
  const certs = validateCertifications(content.certifications || [], evidence);
  const projects = validateProjects(content.projects || [], evidence);
  const experience = validateExperience(content.experience || [], evidence);
  const education = validateEducation(content.education || [], evidence);
  const languages = validateLanguages(content.languages || [], evidence);
  const interests = validateInterests(content.interests || [], evidence);

  const log: CVContentValidationLog = {
    strippedSkillsTechnical: technical.stripped,
    strippedSkillsSoft: soft.stripped,
    strippedCertifications: certs.stripped,
    strippedProjects: projects.stripped.map(p => p.title),
    strippedExperience: experience.stripped.map(e => ({ title: e.title, company: e.company })),
    strippedEducation: education.stripped.map(e => ({ degree: e.degree, institution: e.institution })),
    strippedLanguages: languages.stripped.map(l => ({ language: l.language, level: l.level })),
    strippedInterests: interests.stripped,
  };

  const cleaned: GeneratedCVContent = {
    ...content,
    skills: { technical: technical.kept, soft: soft.kept },
    certifications: certs.kept,
    projects: projects.kept,
    experience: experience.kept,
    education: education.kept,
    languages: languages.kept,
    interests: interests.kept,
  };

  const hasAnyStripped =
    technical.stripped.length > 0 ||
    soft.stripped.length > 0 ||
    certs.stripped.length > 0 ||
    projects.stripped.length > 0 ||
    experience.stripped.length > 0 ||
    education.stripped.length > 0 ||
    languages.stripped.length > 0 ||
    interests.stripped.length > 0;

  return { cleaned, log, hasAnyStripped };
}
