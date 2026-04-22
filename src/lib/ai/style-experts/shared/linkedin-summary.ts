/**
 * Concise LinkedIn summary for LLM prompts.
 * Moved from the old style-generator-v2.ts and re-exported for the orchestrator.
 */

export function createLinkedInSummaryV2(linkedIn: {
  fullName: string;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: Array<{ title: string; company: string; isCurrentRole: boolean }>;
  education: Array<{ school: string; degree: string | null; fieldOfStudy: string | null }>;
  skills: Array<{ name: string }>;
}): string {
  const lines: string[] = [];

  lines.push(`Name: ${linkedIn.fullName}`);

  if (linkedIn.headline) {
    lines.push(`Headline: ${linkedIn.headline}`);
  }

  if (linkedIn.location) {
    lines.push(`Location: ${linkedIn.location}`);
  }

  if (linkedIn.about) {
    const about = linkedIn.about.length > 300
      ? linkedIn.about.slice(0, 300) + '...'
      : linkedIn.about;
    lines.push(`About: ${about}`);
  }

  const recentRoles = linkedIn.experience.slice(0, 3);
  if (recentRoles.length > 0) {
    lines.push('Recent Experience:');
    recentRoles.forEach(exp => {
      const current = exp.isCurrentRole ? ' (current)' : '';
      lines.push(`  - ${exp.title} at ${exp.company}${current}`);
    });
  }

  const education = linkedIn.education.slice(0, 2);
  if (education.length > 0) {
    lines.push('Education:');
    education.forEach(edu => {
      const degree = edu.degree ? `${edu.degree}` : '';
      const field = edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : '';
      lines.push(`  - ${edu.school}${degree ? `: ${degree}` : ''}${field}`);
    });
  }

  const topSkills = linkedIn.skills.slice(0, 10).map(s => s.name);
  if (topSkills.length > 0) {
    lines.push(`Key Skills: ${topSkills.join(', ')}`);
  }

  return lines.join('\n');
}
