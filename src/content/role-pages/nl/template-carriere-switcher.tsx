import type { RolePage } from '../types';

export const slug = 'carriere-switcher';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor carrière-switcher';
export const title = 'CV-template voor carri&egrave;re-switcher — een verhaal dat klopt';
export const description =
  'Voor wie van sector of beroep verandert. Hoe je je CV opbouwt zodat de switch logisch leest in plaats van als een impulsbeslissing.';
export const keywords = [
  'CV carriere switcher',
  'CV career switch',
  'CV zij-instromer',
  'CV omscholing',
  'CV andere sector',
];
export const hero =
  'Een carrière-switch is geen probleem dat je moet verbergen, het is een verhaal dat je moet vertellen. Een goed switcher-CV erkent de switch in de eerste twee zinnen en zet daarna bewijs van de nieuwe richting bovenaan.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Profielsamenvatting met switch-erkenning',
    body: 'Niet "ervaren professional zoek nieuwe uitdaging". Wel: "Voormalig docent geschiedenis (10 jaar) die in 2023 is overgestapt naar data-analyse. Na bootcamp en zelfstudie nu zoek naar junior-rol waar domeinkennis en analytisch werk samenkomen." Direct duidelijk waar je vandaan komt en waar je heen gaat.',
  },
  {
    heading: 'Bewijs van nieuwe richting bovenaan',
    body: 'Bootcamp of bijscholing, certificeringen, eigen projecten, eventueel freelance opdracht. Deze sectie staat vóór je werkervaring. Voor switchers is dit de sterkste bewijslaag.',
  },
  {
    heading: 'Oude rol met transferable framing',
    body: 'Bij elke oude rol benoem je expliciet wat overdraagbaar is. Een zorgmanager die dashboards bouwde voor patiëntstromen, een leraar die het schoolbrede digibord-platform inrichtte — die bullets zijn je second-life materiaal.',
  },
];
export const exampleBullets = [
  'Profiel: Voormalig zorgmanager (12 jaar) overgestapt naar data-analyse. Bootcamp + zelfstudie 2024; zoek junior-rol waar zorg-domeinkennis en analytisch werk samenkomen.',
  'Datacamp Data Analyst Track + Codaisseur Bootcamp Backend (2024); 3 portfolio-projecten op GitHub.',
  'Zorgmanager bij Zorgcentrum Het Akkerveld (2012–2024): bouwde Power BI-dashboards voor capaciteitsplanning; werkte mee aan data-team rond patiëntstromen.',
  'Vrijwilligerswerk 2024–heden: data-analist bij stichting voor jongerenwerk; bouwde donatie-dashboard.',
];
export const pitfalls = [
  'De switch verstoppen. Recruiters prikken er sowieso doorheen; eerlijkheid versterkt.',
  'Oude rol uit chronologie halen om jonger te lijken. Dat leest als manipulatie.',
  'Geen concrete bewijslaag voor nieuwe richting. "Geïnteresseerd in data" is niet hetzelfde als "Datacamp-track afgerond + 3 projecten gebouwd".',
  'Lange uitleg in motivatiebrief in plaats van CV. Het CV moet ook al een verhaal kunnen vertellen.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor switchers wint rust van flair. Een nuchter, gestructureerd CV laat de switch logisch lezen.',
};
export const relatedBlogSlugs = [
  'zij-instromer-cv-vertelt-verhaal',
  'docent-naar-developer-cv',
  'cv-op-maat-in-2-minuten',
];
export const relatedPersonas = ['zij-instromers'];
