/** Section-title labels for NL/EN. Mirrors the legacy renderer's titles. */

export type Locale = 'nl' | 'en';

export const SECTION_LABELS: Record<Locale, Record<string, string>> = {
  nl: {
    summary: 'Profiel',
    experience: 'Werkervaring',
    education: 'Opleiding',
    skills: 'Vaardigheden',
    languages: 'Talen',
    certifications: 'Certificaten',
    projects: 'Projecten',
    interests: 'Interesses',
  },
  en: {
    summary: 'Profile',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Projects',
    interests: 'Interests',
  },
};

export function labelFor(locale: Locale, section: string): string {
  return SECTION_LABELS[locale]?.[section] ?? section;
}
