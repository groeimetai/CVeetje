import type { RolePage } from '../types';

export const slug = 'data-analist';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'data-analist';
export const title = 'CV-voorbeeld voor data-analist — wat erop hoort voor BI- en analytics-rollen';
export const description =
  'Een data-analist-CV dat tooling, methodes en concrete impact toont. SQL, Python, dashboarding, statistiek — plus de niet-technische kant: wie waren je stakeholders, welke beslissingen kwamen uit je werk.';
export const keywords = [
  'CV data-analist',
  'CV data analyst',
  'CV BI analist',
  'voorbeeld CV data',
  'CV SQL Python',
  'business intelligence CV',
];
export const hero =
  'Een data-analist die alleen tooling op zijn CV zet wordt verwisselbaar. Een data-analist die laat zien welke vraagstukken hij heeft helpen beantwoorden — en welke beslissing daaruit voortkwam — wordt onderscheidend. SQL en Python zijn instapdrempels, geen onderscheidende kenmerken meer.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: domein en stakeholder-context',
    body: 'Profielsamenvatting: in welk domein heb je data-ervaring (e-commerce, financiële diensten, zorg, marketing), met welke stakeholders werk je (marketing, finance, operations, product), en wat is je technische profiel (puur SQL/BI, of ook Python/statistiek/ML). Drie zinnen, geen filler.',
  },
  {
    heading: 'Werkervaring met meetbare impact',
    body: 'Per rol: bedrijf, sector, team-context (analytics-team of embedded in business-unit), en drie tot vijf concrete projecten met uitkomst. "Bouwde dashboard voor finance" is zwak. "Bouwde retention-dashboard voor finance-team; resulteerde in besluit churn-preventie-budget te verdubbelen" is sterk.\n\nWees expliciet over jouw bijdrage versus die van je team. Een analist die voorzichtig is met "ik" versus "wij" valt op.',
  },
  {
    heading: 'Tooling en methode',
    body: 'Vijf à acht tools die je dagelijks gebruikt — niet de twintig die je ooit hebt aangeraakt. Voor BI: Tableau, Power BI, Looker. Voor data warehousing: BigQuery, Snowflake, Redshift. Programming: SQL (altijd vermelden), Python (pandas, scikit-learn), R indien echt gebruikt. Statistische methodes alleen vermelden als je ze in projecten hebt toegepast.',
  },
];
export const exampleBullets = [
  'Bouwde retention-dashboard in Looker voor finance-team; leidde tot besluit churn-preventie-budget €450k te alloceren.',
  'A/B test framework voor product (Python + BigQuery); standaard-praktijk voor 12 product-teams sinds 2024.',
  'Audit van marketing-attributie-model; identificeerde €200k overgealloceerd in paid social — geherbalanceerd Q3 2024.',
  'SQL-mentor voor business-analisten in finance (8 mensen); team functioneert nu zonder data-team-tussenkomst voor 80% van vragen.',
  'Tools: SQL (BigQuery/Snowflake), Python (pandas, scikit-learn), Looker, dbt. Statistiek: A/B testing, cohort-analyse, basic regressie.',
  'MSc Econometrics (Erasmus), 2019; certificering dbt Analytics Engineering, 2024.',
];
export const pitfalls = [
  '"Heeft data geanalyseerd voor X" zonder uitkomst of beslissing die eruit voortkwam.',
  'Tooling-lijst zonder context. Welke tools dagelijks, welke incidenteel, welke vroeger?',
  'Te zware claims over ML als je voornamelijk BI hebt gedaan. Een hiring data-engineer prikt daardoorheen.',
  'Geen vermelding van stakeholders. Een analist die alleen met andere data-mensen praat heeft een andere rol dan iemand die regelmatig directie-leden updaten.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor analytics-rollen werkt rustige typografie. Het is content-werk; lay-out moet niet schreeuwen.',
};
export const context =
  'Salarisindicatie 2026 (NL): junior data-analist €40–55k, medior €55–75k, senior €75–95k. Analytics engineering en data science zitten boven analist; tarieven voor freelance €70–€140/uur.';
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'ats-cv-2026',
  'recruiter-aan-het-woord',
];
export const relatedPersonas = ['werkzoekenden', 'zij-instromers'];
