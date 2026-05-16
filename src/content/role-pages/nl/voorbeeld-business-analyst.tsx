import type { RolePage } from '../types';

export const slug = 'business-analyst';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'business analyst';
export const title = 'CV-voorbeeld voor business analyst — proces, requirements, stakeholders';
export const description =
  'Een BA-CV dat het verschil tussen pure procesanalyse en software-requirements-werk laat zien. Plus de juiste methodieken voor IT-of bedrijfskundige projecten.';
export const keywords = [
  'CV business analyst',
  'CV BA',
  'CV requirements analist',
  'voorbeeld CV business analyst',
  'CV IT BA',
];
export const hero =
  'Business analyst is een vakgebied dat de helft van de tijd verkeerd geframed wordt op CV\'s. Sommige BA\'s doen pure procesanalyse, anderen doen software requirements, weer anderen zijn brug tussen business en data-team. Wees expliciet wat jouw type is.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: type BA',
    body: 'Process improvement BA, software requirements BA, data/analytics BA, of cross-functional change BA. Plus: welke sectoren, welk type project (transformatie, implementatie, optimalisatie). Twee zinnen profielsamenvatting.',
  },
  {
    heading: 'Werkervaring met output-types',
    body: 'BA-werk produceert leveringen: process maps, use cases, user stories, BPMN-diagrammen, data-flow-diagrammen, requirements-traceability-matrices. Per project: wat heb je opgeleverd, voor welk gehoor, welke uitkomst. "Werkte mee aan IT-implementatie" is leeg; "Schreef en valideerde 47 user stories voor klantenportaal-rebuild bij verzekeraar; user-acceptance score 91%" is sterk.',
  },
  {
    heading: 'Methodologie en tooling',
    body: 'Methodieken: BABOK Guide, IIBA-certificering, Lean/Six Sigma, BPMN, ArchiMate. Tools: Visio, Lucidchart, Camunda, Sparx EA, Confluence, Jira. Drie tot vijf relevante.',
  },
];
export const exampleBullets = [
  'Lead BA voor klantenportaal-rebuild bij verzekeraar; team van 12 (BA, devs, QA, design); 8 maanden looptijd; opgeleverd binnen scope.',
  'Process re-engineering claims-afhandeling bij zorgverzekeraar; doorlooptijd van 19 naar 6 werkdagen na implementatie.',
  '47 user stories geschreven en gevalideerd in 2024; 91% UAT pass-rate; 4 stories voorzien van retrospectieve refinement.',
  'Tools: Visio, Lucidchart, Sparx EA, Confluence, Jira. Methodologie: BABOK + BPMN 2.0; Lean Six Sigma Green Belt.',
  'WO Bedrijfsinformatiekunde (UU, 2018); IIBA CBAP certificering (2024).',
];
export const pitfalls = [
  '"Business analyst" zonder type-specificatie. Recruiters wijzen je toe aan vacatures op basis van type.',
  'Methodologie-naam zonder bewijs. Heb je echt SAFe gebruikt? Welke ceremonies, welk niveau?',
  'Geen concrete output-types. Een BA wordt afgemeten aan zijn deliverables.',
  'UAT-resultaten of process-metrics verzwegen. Daar zit het bewijs van impact.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'BA-werk is gestructureerd analytisch. Een rustige lay-out matcht de werkmodus.',
};
export const context = 'Salarisindicatie 2026 (NL): junior BA €40–55k, medior €55–75k, senior €75–100k, lead BA / business architect €100k+.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden'];
