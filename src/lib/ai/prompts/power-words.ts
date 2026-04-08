/**
 * Power words voor CV-bullet points, gegroepeerd per categorie.
 *
 * Geëxtraheerd uit cv-generator.ts (was inline string tot v1 van de
 * agentic transitie). Beschikbaar als zowel een markdown-fragment voor
 * directe injectie in prompts, als een gestructureerd object voor
 * eventuele andere toepassingen (UI hints, validators).
 */

export const powerWordsByCategory = {
  achievement: ['Achieved', 'Delivered', 'Generated', 'Exceeded', 'Surpassed', 'Attained', 'Won', 'Earned'],
  leadership: ['Led', 'Directed', 'Coordinated', 'Mentored', 'Supervised', 'Managed', 'Guided', 'Orchestrated'],
  improvement: ['Optimized', 'Streamlined', 'Enhanced', 'Transformed', 'Modernized', 'Revamped', 'Accelerated'],
  creation: ['Developed', 'Designed', 'Built', 'Launched', 'Established', 'Created', 'Pioneered', 'Initiated'],
  analysis: ['Analyzed', 'Evaluated', 'Assessed', 'Researched', 'Identified', 'Diagnosed', 'Investigated'],
  growth: ['Increased', 'Expanded', 'Grew', 'Boosted', 'Amplified', 'Scaled', 'Maximized'],
} as const;

/**
 * Markdown-fragment voor directe injectie in een prompt. Gebruikt door
 * cv-generator om de LLM te sturen naar sterke bullet-openings.
 */
export const powerWordsPromptFragment = `
**Achievement verbs:** ${powerWordsByCategory.achievement.join(', ')}
**Leadership verbs:** ${powerWordsByCategory.leadership.join(', ')}
**Improvement verbs:** ${powerWordsByCategory.improvement.join(', ')}
**Creation verbs:** ${powerWordsByCategory.creation.join(', ')}
**Analysis verbs:** ${powerWordsByCategory.analysis.join(', ')}
**Growth verbs:** ${powerWordsByCategory.growth.join(', ')}
`;
