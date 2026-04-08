/**
 * Industry-specifieke content guidance voor CV-generatie.
 *
 * Geëxtraheerd uit cv-generator.ts (was hardcoded switch tot v1 van de
 * agentic transitie). Wordt gedeeld door cv-generator en kan straks ook
 * door de motivation-generator en fit-analyzer worden gebruikt om
 * sector-specifieke framing toe te passen.
 *
 * Een onbekende industrie krijgt een generieke fallback. Geen exception.
 */

/**
 * Geef sector-specifieke schrijftips voor een CV op basis van de vacature-industrie.
 *
 * @param industry — vrije-tekst industry-string uit de geparseerde JobVacancy
 * @returns markdown-fragment dat in de prompt kan worden ingevoegd, of een lege string als geen industry is opgegeven
 */
export function getIndustryGuidance(industry: string | undefined): string {
  if (!industry) return '';

  const industryLower = industry.toLowerCase();

  if (industryLower.includes('tech') || industryLower.includes('software') || industryLower.includes('it')) {
    return `
**Industry Focus (Technology):**
- Emphasize technical skills, programming languages, frameworks, and tools
- Highlight innovation, problem-solving, and measurable technical impact
- Include specific technologies and methodologies used
- Quantify performance improvements, scale, or efficiency gains`;
  }

  if (industryLower.includes('finance') || industryLower.includes('bank') || industryLower.includes('accounting')) {
    return `
**Industry Focus (Finance/Banking):**
- Emphasize compliance, accuracy, and attention to detail
- Highlight risk management and regulatory knowledge
- Focus on financial metrics and business impact
- Include relevant certifications and regulatory experience`;
  }

  if (industryLower.includes('health') || industryLower.includes('medical') || industryLower.includes('pharma')) {
    return `
**Industry Focus (Healthcare/Medical):**
- Emphasize patient care, safety protocols, and quality standards
- Highlight certifications, licenses, and compliance experience
- Focus on healthcare-specific methodologies and systems
- Include regulatory knowledge (HIPAA, FDA, etc.)`;
  }

  if (industryLower.includes('consult')) {
    return `
**Industry Focus (Consulting):**
- Emphasize problem-solving, client management, and project delivery
- Highlight methodologies, frameworks, and strategic thinking
- Focus on business impact and client outcomes
- Include stakeholder management and presentation skills`;
  }

  if (industryLower.includes('marketing') || industryLower.includes('creative') || industryLower.includes('design')) {
    return `
**Industry Focus (Marketing/Creative):**
- Emphasize campaign results, creative achievements, and brand impact
- Highlight metrics like engagement, conversion, and ROI
- Focus on tools, platforms, and creative processes
- Include portfolio-worthy projects and awards`;
  }

  if (industryLower.includes('retail') || industryLower.includes('sales')) {
    return `
**Industry Focus (Retail/Sales):**
- Emphasize revenue generation, customer relationships, and targets achieved
- Highlight sales metrics, conversion rates, and customer satisfaction
- Focus on negotiation, relationship building, and market knowledge
- Include CRM experience and customer success stories`;
  }

  return `
**Industry Focus (${industry}):**
- Tailor language and terminology to this specific industry
- Highlight relevant experience and transferable skills
- Focus on achievements that resonate with this sector`;
}
