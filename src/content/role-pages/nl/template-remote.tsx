import type { RolePage } from '../types';

export const slug = 'remote';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor remote werk';
export const title = 'CV-template voor remote-functie — internationaal, hybride, of fully-remote';
export const description =
  'Een CV dat je remote-werkbekwaamheid expliciet maakt en internationale werkgevers de juiste signalen geeft.';
export const keywords = ['CV remote', 'CV remote work', 'CV thuiswerken', 'CV hybrid', 'CV distributed team'];
export const hero =
  'Remote-werk is niet alleen "ik werk thuis". Voor internationale werkgevers betekent het: kun je asynchroon werken, ben je vaardig met remote-tooling, kun je effectief communiceren over tijdzones heen. Het CV moet die competentie tonen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: remote-status en tijdzone',
    body: 'Profielsamenvatting met expliciete remote-werkstatus en tijdzone. "Remote-first software engineer | based in Amsterdam (CET) | 6 years experience in distributed teams". Voor internationale werkgevers: vermeld of je werkvergunning hebt (Nederlanders/EU/Blue Card etc.).',
  },
  {
    heading: 'Remote-bekwaamheid bewijzen',
    body: 'Welke distributed teams heb je gewerkt, hoe groot, in welke tijdzones. Tooling: Slack, Notion, Linear, Loom, Figma. Asynchrone communicatie-skills: written-first, RFC-gebaseerd, threaded discussions. Voor seniors: documentatie- en handover-cultuur die je hebt opgebouwd.',
  },
  {
    heading: 'Internationale werkgevers — context vermelden',
    body: 'Veel remote-vacatures zijn van Amerikaanse of Britse bedrijven. Eventueel uurloon-indicatie in lokale valuta, EU-compliance (AVG kennis), en taalcompetentie expliciet.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting: "Senior backend engineer, remote-first since 2020. Based in Amsterdam (CET). 6 years in distributed teams across 4 timezones. Open to EU + US East Coast overlap roles."',
  'Werkervaring: GitLab (Remote, 2022–heden) — fully-remote since day one; team across 8 countries.',
  'Async-first werkstijl: RFC\'s, written design docs, recorded Loom-walkthroughs. Synchrone tijd alleen voor design + retro.',
  'Tools: Slack, Notion, Linear, Loom, Figma, GitHub. Tijdzone-flexibel: regulier 9–17 CET, kan tot 21 CET overlap met US.',
  'Talen: Nederlands (native), Engels (C2, professional). EU-burger, geen visa-issues.',
];
export const pitfalls = [
  'Geen tijdzone of werkstatus vermeld. Internationaal recruitment filtert hierop.',
  'Remote-werk als bonusje noemen in plaats van als specifieke vaardigheid. Voor remote-only-werkgevers is dat de hoofddiscipline.',
  'Async-communicatie als skill claimen zonder bewijs. RFC\'s, geschreven design docs — dat zijn de specifieke bewijsstukken.',
  'EU/visa-status weglaten bij US-werkgevers. Het is een binair filter dat ze direct toepassen.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor internationale tech-werkgevers werkt een eigentijdse maar niet design-zware layout het beste.',
};
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden'];
