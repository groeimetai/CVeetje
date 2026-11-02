/**
 * Skill-list primitive — renders the skills section body.
 * Phase 0 implements 'tags'.
 */

import type { SkillListVariant } from '../../spec';
import { escHtml } from '../html';

export interface SkillsInput {
  technical: string[];
  soft: string[];
}

export function renderSkillList(
  _variant: SkillListVariant,
  skills: SkillsInput,
  accentKeywords?: string[],
): string {
  const accentSet = new Set((accentKeywords ?? []).map(k => k.toLowerCase()));
  const renderOne = (s: string, id: string) => {
    const isAccent = accentSet.has(s.toLowerCase());
    const attr = isAccent ? ` data-tone="accent"` : '';
    return `<span class="cv-skill" data-id="${id}"${attr}>${escHtml(s)}</span>`;
  };
  const all = [
    ...skills.technical.map((s, i) => renderOne(s, `skill-tech-${i}`)),
    ...skills.soft.map((s, i) => renderOne(s, `skill-soft-${i}`)),
  ].join('');
  return `<div class="cv-skill-list">${all}</div>`;
}
