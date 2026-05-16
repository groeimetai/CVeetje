import type { RolePage } from '../types';

export const slug = 'recruiter';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'recruiter';
export const title = 'CV-voorbeeld voor recruiter — corporate, agency of in-house';
export const description =
  'Een recruiter-CV dat in time-to-hire, pipeline-conversie en quality-of-hire spreekt. Plus de juiste tooling en je sourcing-stijl.';
export const keywords = [
  'CV recruiter',
  'CV corporate recruiter',
  'CV agency recruiter',
  'CV talent acquisition',
  'CV intercedent',
  'voorbeeld CV recruitment',
];
export const hero =
  'Recruiter-CV\'s zijn een aparte categorie: jij weet hoe een goed CV oogt en daar word je extra streng op getoetst. Verwarrend daarom dat zoveel recruiter-CV\'s op hetzelfde "ervaren talent acquisition professional" beginnen. Eigen vak — eigen bewijslast.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: wat voor recruiter ben je',
    body: 'Corporate / in-house / agency / executive search / volume-staffing — kies wat je bent. Plus: welk domein (tech, finance, healthcare, retail), welk seniority-segment (junior tot C-level), welke geografie. Een sterke openingszin: "In-house tech recruiter — backend en data engineering — voor scale-ups van 50 tot 500 FTE in NL/DE."',
  },
  {
    heading: 'Werkervaring in funnel-getallen',
    body: 'Recruiters worden beoordeeld op pijplijn-metingen. Time-to-hire, sourcing-conversie, offer-accept-rate, quality-of-hire (eerste-jaar-retentie van placements). Per rol: hoeveel hires per jaar, welk seniority-mix, gemiddelde time-to-hire, eventueel jouw bijdrage aan de hiring-cultuur.\n\nAgency-recruiters: omzet/marge, retentie van klanten, eigen klantenontwikkeling.',
  },
  {
    heading: 'Tooling en sourcing-methodieken',
    body: 'ATS (Greenhouse, Lever, Workday, SmartRecruiters, Recruitee), sourcing-tools (LinkedIn Recruiter, AmazingHiring, hireEZ, Loxo), assessment-platforms (HackerRank, Codility). Je sourcing-stijl mag erin: cold outreach met meting van conversie, gepersonaliseerde InMails, employee referral programma\'s opgezet.',
  },
];
export const exampleBullets = [
  'In-house corporate recruiter Backend + DevOps voor scale-up van 80 → 240 FTE (2022–2025); 64 hires in periode.',
  'Time-to-hire teruggebracht van 52 naar 31 dagen door inrichten gestructureerd intake-proces met hiring managers.',
  'Quality-of-hire (12-maands retentie van placements) op 89% — boven sector-gemiddelde 78%.',
  'Bouwde employer brand-aanwezigheid voor engineering: blog-serie, conferentie-sponsorships; toelevering inkomende sollicitaties +180% YoY.',
  'Tools: Greenhouse, LinkedIn Recruiter, hireEZ, Gem, HackerRank. Sourcing-methodologie: gestructureerde Boolean + persona-based outreach.',
  'HR Bachelor (HAN, 2016); Cyber Security and Tech Recruitment-certificering (2023).',
];
export const pitfalls = [
  '"Werving en selectie" als bullet zonder cijfers. Voor recruiters is dat exact wat ze zelf niet zouden accepteren.',
  'Te brede claim van expertise. Een recruiter voor exec-search is een andere rol dan iemand voor volume-warehouse-hiring.',
  'Geen tooling vermeld. ATS-vaardigheid is voor recruiters een gewone verwachting.',
  'Quality-of-hire vergeten. Het scheidt sterke recruiters van mensen die alleen op time-to-fill gestuurd hebben.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Een recruiter laat met zijn eigen CV zien dat hij weet wat een goed CV is. Balanced is gepast — niet te corporate, niet te experimenteel.',
};
export const context =
  'Salarisindicatie 2026 (NL): in-house recruiter €45–65k, senior in-house €65–90k, agency met variabele €50–110k+. Executive search aparte categorie met hogere ranges.';
export const relatedBlogSlugs = [
  'recruiter-aan-het-woord',
  'recruiter-valkuilen-cv',
  'gatekeeper-eerlijkheid',
];
export const relatedPersonas = ['recruiters', 'werkzoekenden'];
