import type { RolePage } from '../types';

export const slug = 'marketing-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'en';
export const label = 'marketing manager';
export const title = 'CV example for marketing manager — brand, growth, performance, or content';
export const description =
  'A marketing CV that doesn\'t flatten the difference between brand, growth, performance, and content roles. Numbers where the discipline allows; framing where it matters.';
export const keywords = ['marketing manager CV', 'growth marketer CV', 'brand manager CV', 'performance marketing CV'];
export const hero =
  '"Marketing" is too broad an umbrella to be strong. A good marketing CV places itself in one of four sub-genres: brand, growth, performance, or content. Then come the numbers each discipline allows. For brand managers, impact is harder to measure — use positioning case studies.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Top: which type of marketing',
    body: 'Two-sentence profile summary with your marketing genre, sector, and product type (B2C / B2B SaaS / e-commerce / retail / non-profit). "B2B SaaS growth marketer focused on MQL-to-SQL conversion and outbound channels for scale-ups of 20 to 200 FTE" is a hundred times stronger than "experienced marketing professional".',
  },
  {
    heading: 'Experience differs by genre',
    body: 'Growth/performance: hard numbers (CAC, LTV, CAC payback, ROAS, funnel conversion). Brand: positioning projects, awareness research, recognisable campaigns. Content: output volume, distribution reach, content-to-pipeline conversion. Keep one metric system consistent.\n\nBeware overclaim. "+340% growth" without context (base, period, spend) reads as an AI tell.',
  },
  {
    heading: 'Tooling per genre',
    body: 'Brand: positioning frameworks, research tools (User Interviews, Dscout). Growth: HubSpot, Marketo, Segment, Mixpanel, Amplitude. Performance: Google Ads, Meta Ads Manager, LinkedIn Ads, Looker Studio. Content: CMS, SEO tools (Ahrefs, Semrush). Mention three to six — the ones you really use daily.',
  },
];
export const exampleBullets = [
  'Growth lead for B2B SaaS from Series A to Series B (24 months); MQL volume 6× and CAC payback from 14 to 9 months.',
  'Launched paid-LinkedIn ABM programme targeting 80 accounts; €1.4M pipeline contribution in 12 months.',
  'Brand repositioning at scale-up; new website + messaging framework; +42% inbound leads six months post-launch.',
  'Co-built content engine producing 14 articles/month; organic traffic 5k → 38k MAU in 18 months.',
  'Daily tools: HubSpot, Segment, Mixpanel, Google Ads, LinkedIn Ads, Ahrefs.',
];
export const pitfalls = [
  '"Marketing manager" without genre. Brand and performance are structurally different roles.',
  'Numbers without denominator. "+200%" without base is hard to interpret and reads sceptical.',
  'Tools list of twelve. Likely no specialist in anything.',
  'Brand cases without outcome metrics. Awareness research or customer research adds proof.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Creative',
  reason: 'Marketing roles allow showing design sense without going overboard.',
};
export const context = 'Salary indication 2026 (NL): junior marketing manager €40–55k, mid €55–75k, senior €75–100k, Head of Marketing €100–140k.';
export const relatedBlogSlugs = ['cv-tailored-in-two-minutes', 'recruiter-perspective'];
export const relatedPersonas = ['werkzoekenden'];
