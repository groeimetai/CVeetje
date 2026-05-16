import type { RolePage } from '../types';

export const slug = 'ict-beheerder';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'ICT-beheerder';
export const title = 'CV-voorbeeld voor ICT-beheerder — systeembeheerder, netwerkbeheerder, sysadmin';
export const description =
  'Een ICT-beheer-CV dat infrastructuur, gebruikersaantallen, en concrete platform-keuzes toont. Plus de juiste certificaten voor service-providers en MKB-IT.';
export const keywords = [
  'CV systeembeheerder',
  'CV ICT beheerder',
  'CV netwerkbeheerder',
  'voorbeeld CV IT',
  'CV sysadmin',
  'CV Microsoft 365',
];
export const hero =
  'Een ICT-beheer-CV werkt met platformen, gebruikers en service-niveaus. Welk environment (cloud-first, hybrid, on-premise), hoeveel users in beheer, en welke uptime-eisen. Vage "IT-ervaring" wint geen sollicitaties in een vakgebied dat aan platformnamen meet.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Platforms direct zichtbaar',
    body: 'Microsoft 365 (Exchange Online, Teams, SharePoint, Intune), Azure of AWS, Active Directory of Entra ID, MDM-platformen, Microsoft Defender. Voor netwerk: Cisco, Fortinet, Juniper, Aruba. Specifieke versies en niveau-kennis zijn welkom.',
  },
  {
    heading: 'Werkervaring met scope',
    body: 'Per werkgever: aantal eindgebruikers in beheer, type IT-infrastructuur (cloud-first / hybrid / on-prem), incident-volume of SLA-eisen. "Eerstelijns helpdesk bij MKB-bedrijf van 80 FTE" is helder; "ICT-beheerder" zonder context is leeg.',
  },
  {
    heading: 'Certificaten',
    body: 'Microsoft (MD-100, MS-100/101, AZ-104, AZ-500), CompTIA Network+/Security+, Cisco CCNA, Fortinet NSE, ITIL Foundation. Drie tot vijf relevante, niet de lijst van alles wat je ooit hebt gedaan.',
  },
];
export const exampleBullets = [
  '2e lijn systeembeheerder bij service-provider voor MKB-klanten (totaal 1.200 eindgebruikers verdeeld over 22 klanten).',
  'Migratie van on-prem Exchange naar Microsoft 365 voor klant van 350 FTE (2024); 0 productieve verlies, 4 weken doorlooptijd.',
  'Implementatie Intune MDM voor BYOD-policy bij retailer; 800 devices in scope, rollout in 6 weken.',
  'Tools: PowerShell scripting (gevorderd), Azure (intermediate), Microsoft Defender, Fortigate firewalls. ITIL-werkstijl.',
  'MD-100, AZ-104, ITIL Foundation; bezig met SC-300 (Identity & Access).',
];
export const pitfalls = [
  '"IT-ervaring" zonder platform-namen. Werkgevers checken Microsoft-vs-Linux-fit als eerste filter.',
  'Geen user-aantallen of SLA-context. Een IT-beheerder voor 50 FTE is qua complexiteit anders dan voor 5.000.',
  'PowerShell-vermelding zonder voorbeelden. Het is een gevorderde vaardigheid die in scripts of automatisering moet aangetoond.',
  'Certificaten van 10 jaar oud zonder recente. ICT-platformen veranderen — recente certificering signaleert actuele kennis.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'IT-werkgevers waarderen functionele helderheid. Geen design-statements nodig.',
};
export const context = 'Salarisindicatie 2026 (NL): junior beheerder €30–42k, medior €42–58k, senior €58–80k, principal/specialist €80–110k.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'ats-cv-2026'];
export const relatedPersonas = ['werkzoekenden'];
