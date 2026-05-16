import type { RolePage } from '../types';

export const slug = 'zonder-werkervaring';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV zonder werkervaring';
export const title = 'CV-template zonder werkervaring — wat erop hoort als je nog niets hebt gedaan';
export const description =
  'Voor schoolverlaters, studenten in hun eerste sollicitatie en herintreders zonder recente werkervaring. Hoe je een geloofwaardig CV opbouwt zonder iets te overdrijven.';
export const keywords = [
  'CV zonder werkervaring',
  'eerste CV',
  'CV starter',
  'CV student zonder ervaring',
  'CV schoolverlater',
];
export const hero =
  'Geen werkervaring betekent niet dat je niets te bieden hebt. Het betekent dat je CV andere bewijsstukken bovenaan moet zetten: studieprojecten, vrijwilligerswerk, bijbanen die je gehad hebt, eigen initiatieven. Daar zit je verhaal in.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Vervangers voor werkervaring',
    body: 'Studieprojecten met concrete uitkomsten (waar relevant). Bijbanen — Albert Heijn-werk telt mee, het bewijst dat je werkbaar bent. Vrijwilligerswerk met verantwoordelijkheid (bestuurslid, coach, evenementen). Eigen projecten (digitaal: GitHub, blog, portfolio. Fysiek: een ondernemertje, een schoolblad gemaakt).',
  },
  {
    heading: 'Profielsamenvatting met richting',
    body: 'Geen "enthousiaste starter". Wel: "Net afgestudeerd HBO Bedrijfskunde met specialisatie supply chain. Zoek een traineeship of starter-rol bij een productie- of e-commerce-bedrijf met focus op operations." Specifiek en richting-gevend.',
  },
  {
    heading: 'Wat je niet doet',
    body: 'Geen opgeklopte taal voor wat je hebt gedaan ("aanstuurde team" voor een schoolproject). Geen lege zinnen ("teamspeler met passie"). Geen "available upon request" voor referenties — laat de regel weg.',
  },
];
export const exampleBullets = [
  'Afstudeerproject "Optimalisatie last-mile delivery bij regionale e-commerce-startup"; cijfer 8.2; aanbevelingen geadopteerd door opdrachtgever.',
  'Bestuurslid studievereniging (penningmeester, 2024); budget €38k voor jaarprogramma met 12 events.',
  'Bijbaan bij Albert Heijn (2 jaar, parttime); supervisor in laatste 6 maanden; verantwoordelijk voor 4 weekend-medewerkers.',
  'Eigen project: blog over carrièreoriëntatie voor studenten; 2.1k unieke bezoekers/maand sinds 2024.',
  'Vaardigheden: Excel (gevorderd), Power BI (basis), Engels C1, Duits B1.',
];
export const pitfalls = [
  'CV proberen op te vullen tot 2 pagina\'s als je 1 voldoende hebt.',
  'Schoolfases als "werkervaring" framen — recruiters prikken er doorheen.',
  'Hobby\'s die niet onderscheidend zijn ("films kijken, lezen") in plaats van één specifiek iets dat een gesprek opent.',
  'Geen LinkedIn-link of portfolio terwijl je die wel hebt opgezet.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Bij weinig ervaring is een rustige, eigentijdse layout meer overtuigend dan iets visueel uitgesproken.',
};
export const relatedBlogSlugs = ['student-eerste-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['studenten', 'werkzoekenden'];
