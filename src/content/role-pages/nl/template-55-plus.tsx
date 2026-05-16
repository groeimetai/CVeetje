import type { RolePage } from '../types';

export const slug = '55-plus';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor 55+';
export const title = 'CV-template voor 55+ — ervaring tonen zonder oud te klinken';
export const description =
  'Voor wie na zijn vijftigste solliciteert. Hoe je dertig jaar werkervaring op twee pagina&apos;s presenteert zonder af te vallen op het stille filter.';
export const keywords = ['CV 55 plus', 'CV oudere werkzoekende', 'CV senior leeftijd', 'CV na 50'];
export const hero =
  'Solliciteren na je vijftigste verloopt anders dan op je dertigste. Niet per se moeilijker, maar met andere vooroordelen. Een scherp CV speelt daarop in zonder ervaring te verbergen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Selectie boven volledigheid',
    body: 'Je hoeft je banen van voor 2000 niet meer in detail uit te schrijven. Een "Eerdere ervaring 1995–2002" met drie regels onderaan volstaat. De recente twee tot drie rollen krijgen de ruimte, oudere rollen krimpen.',
  },
  {
    heading: 'Recente leerervaring zichtbaar',
    body: 'Een cursus uit 2025, certificering uit 2024, online opleiding via Coursera — laat zien dat je nog leert. Een AI-cursus die je hebt gevolgd kan een verrassend effectief signaal zijn — niet voor de inhoud, maar voor het "ik beweeg mee"-signaal.',
  },
  {
    heading: 'Energie in toon, niet in claim',
    body: 'Niet "ervaren professional met veel kennis". Wel "Bouw graag voort op wat ik weet en ben nieuwsgierig naar hoe X tegenwoordig gaat". Een subtiel signaal van bereidheid om buiten je referentiekader te denken.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting: Senior projectmanager met focus op IT-transformatie in zorg. Na laatste rol (Albert Schweitzer ziekenhuis) zoek nu een interim- of vaste rol bij een organisatie in midden-Nederland.',
  'Volledige uitwerking voor laatste 3 rollen (sinds 2014); eerdere rollen samengevat in een "Eerdere ervaring 1995–2014"-blok met 4 regels.',
  'Recente bijscholing 2024–2025: Prince2 Practitioner re-certified; intro AI in projectmanagement (Coursera); leerlijn change-management (Avans).',
  'LinkedIn-link bovenaan; profielfoto laten staan; geen geboortedatum op CV (mag, hoeft niet meer in 2026).',
];
export const pitfalls = [
  'Geboortedatum weglaten op een manier die opvalt. Recruiters zien dat en het wordt sceptisch gelezen.',
  'CV van vier pagina&apos;s om volledig te zijn. Twee pagina&apos;s, maximum.',
  'Recente leerervaring weglaten. Het is een signaal van actueel blijven.',
  'Geen LinkedIn-link of een dode LinkedIn. Voor 55+ telt actieve online aanwezigheid extra.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Een eigentijdse, professionele uitstraling verwijdert direct het "Word-uit-2008"-vinkje. Niet doorslaan naar Experimental.',
};
export const relatedBlogSlugs = ['55-plus-arbeidsmarkt-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden', 'herintreders'];
