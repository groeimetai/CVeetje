import type { RolePage } from '../types';

export const slug = 'stage';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor stage';
export const title = 'CV-template voor stage — afstudeerstage, meeloopstage of beroepsstage';
export const description =
  'Een stage-CV verschilt van een gewoon student-CV. Welke richting wil je leren, welke vakken zijn relevant, en welke aanpak past de werkgever.';
export const keywords = ['CV stage', 'CV afstudeerstage', 'CV meeloopstage', 'CV beroepsstage', 'stage CV student'];
export const hero =
  'Een stage-CV is een leerverzoek met richting. De werkgever wil zien dat je weet wat je daar wilt leren — niet dat je alles al kunt. Vermijd skill-claims die niet bij je studiefase passen.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Boven aan: stage-type, periode, vraag',
    body: '"Afstudeerstage HBO Bedrijfseconomie, januari–juni 2026, voorkeur financi&euml;le sector". Direct duidelijk: welk type stage, welk kwartaal, welke richting. Vermeld ook welk niveau opleiding (MBO 4, HBO, WO master).',
  },
  {
    heading: 'Vakken en projecten relevant maken',
    body: 'Niet de hele vakkenlijst — vier vakken die specifiek voor déze stage relevant zijn. Welk afstudeer- of bachelorproject heb je gedaan of staat gepland — onderwerp, methodiek, opdrachtgever (school of extern).',
  },
  {
    heading: 'Wat je echte ervaring is',
    body: 'Bijbanen, vrijwilligerswerk, commissies, eigen projecten. Voor een stage is een Albert Heijn-bijbaan met supervisor-rol vaak overtuigender dan een opgeklopt "marketingproject" voor een fictieve onderneming.',
  },
];
export const exampleBullets = [
  'Afstudeerstage HBO Communicatie & Multimedia Design, 6 maanden (feb–jul 2026), voorkeur design-studio of in-house brand-team.',
  'Vakken relevant voor stage: Brand Strategy (8.4), Type Design (8.7), UX Research (7.9), Motion Basics (8.1).',
  'Afstudeerproject (start sept 2025): brand-identity-onderzoek voor culturele non-profit; opdrachtgever Stichting De Schans.',
  'Bestuurslid studievereniging (penningmeester, 2024); ervaring met budgettering, vendor management.',
  'Bijbaan supermarkt Albert Heijn (2022–heden, 12 uur/week); supervisor sinds 2024.',
];
export const pitfalls = [
  'Profielsamenvatting met "ervaren professional"-toon. Voor stages werkt eerlijkheid over je leerfase beter.',
  'Skill-claims die niet bij studiejaar passen ("expert in Adobe Suite"). Werkgevers prikken erdoorheen.',
  'CV langer dan een pagina. Voor stages is een pagina genoeg.',
  'Stage-vraag vaag formuleren. Specifieke vraag krijgt specifieke reactie.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Voor stages werkt eigentijdse maar niet design-zware layout. Creative kan voor design-stages.',
};
export const relatedBlogSlugs = ['student-eerste-cv', 'cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['studenten'];
