import type { RolePage } from '../types';

export const slug = 'marketing-manager';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'marketing manager';
export const title = 'CV-voorbeeld voor marketing manager — brand, growth, performance of content';
export const description =
  'Een marketing manager-CV dat het verschil tussen brand-, growth-, performance- en content-rollen niet vervlakt. Cijfers waar mogelijk, framing waar zinvol.';
export const keywords = [
  'CV marketing manager',
  'CV brand manager',
  'CV growth marketer',
  'CV performance marketing',
  'CV content manager',
  'voorbeeld CV marketing',
];
export const hero =
  '"Marketing" is een te brede koepel om sterk te zijn. Een goed marketing-CV plaatst zich direct in een van vier subgenres: brand, growth, performance, of content. Daarna komen cijfers waar de discipline ze toelaat. Voor brand-managers is impact lastiger te meten — gebruik dan duidelijke positionerings-cases.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: welk type marketing',
    body: 'Twee zinnen profielsamenvatting met je marketing-genre, je sector, en het type product (B2C / B2B SaaS / e-commerce / retail / non-profit). "B2B SaaS growth marketer met focus op MQL-to-SQL conversie en outbound channels voor scale-ups van 20 tot 200 FTE" is honderd keer sterker dan "ervaren marketing professional".',
  },
  {
    heading: 'Werkervaring per genre verschillend',
    body: 'Growth en performance: harde cijfers (CAC, LTV, CAC payback, ROAS, conversie op funnel-stappen). Brand: positionerings-projecten, awareness-onderzoek, herkenbare campagnes. Content: outputvolume, distributiebereik, conversie van content-naar-pipeline. Houd consistent één meet-systeem aan zodat een lezer niet hoeft te switchen.\n\nWees voorzichtig met overclaim. "+340% growth" zonder context (welke basis, welke periode, welke spend) is een AI-tell.',
  },
  {
    heading: 'Tooling per genre',
    body: 'Brand: positionerings-frameworks, klantonderzoek-tools (User Interviews, Dscout). Growth: HubSpot, Marketo, Segment, Mixpanel, Amplitude. Performance: Google Ads, Meta Ads Manager, LinkedIn Ads, Looker Studio. Content: CMS (Webflow, Contentful, WordPress), SEO-tools (Ahrefs, Semrush), planning (Notion, Trello). Vermeld er drie tot zes — de tools die je nu echt dagelijks gebruikt.',
  },
];
export const exampleBullets = [
  'Growth lead voor B2B SaaS van Series A naar Series B (24 maanden); MQL-volume 6× en CAC payback van 14 naar 9 maanden.',
  'Launched paid-LinkedIn programma voor account-based marketing op 80 target-accounts; pipeline contribution €1.4M in 12 maanden.',
  'Brand-repositionering scale-up; nieuwe website + messaging-framework; +42% inbound-leads in zes maanden post-launch.',
  'Co-built content-engine met 14 articles/maand; organic traffic van 5k naar 38k MAU in 18 maanden.',
  'Tools dagelijks: HubSpot, Segment, Mixpanel, Google Ads, LinkedIn Ads, Ahrefs.',
  'MSc Marketing (RuG, 2018); Reforge Growth Series (2022).',
];
export const pitfalls = [
  '"Marketing manager" zonder genre. Brand en performance zijn structureel andere rollen — gooi ze niet op één hoop.',
  'Cijfers zonder denominator. "+200%" zonder basis is moeilijk te interpreteren en wordt sceptisch gelezen.',
  'Te lange tools-lijst. Twaalf tools = vermoedelijk geen specialist in iets.',
  'Brand-cases zonder uitkomst-meting. Awareness-research erbij of klantonderzoek-cijfers maakt verschil.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Creative',
  reason: 'Voor marketing-rollen mag je laten zien dat je oog voor design hebt. Creative levert dat zonder over-the-top.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior marketing manager €40–55k, medior €55–75k, senior €75–100k, Head of Marketing €100–140k. Scale-ups zitten met equity-component soms hoger dan corporates.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'welke-stijl-kies-je',
  'recruiter-aan-het-woord',
];
export const relatedPersonas = ['werkzoekenden'];
