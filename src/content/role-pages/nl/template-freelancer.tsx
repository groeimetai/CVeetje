import type { RolePage } from '../types';

export const slug = 'freelancer';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor freelancer / zzp\'er';
export const title = 'CV-template voor freelancer / zzp\'er — verkooptool per klant';
export const description =
  'Een freelancer-CV is een verkooptool, geen sollicitatiedocument. Hoe je &apos;m per opdracht aanpast zonder uren werk per offerte.';
export const keywords = ['CV freelancer', 'CV zzp', 'CV per opdracht', 'CV interim', 'CV consultant zelfstandig'];
export const hero =
  'Voor werknemers is een CV een sollicitatie. Voor zzp\'ers is het een verkooptool — outcomes voorop, klanten genoemd, framing toegespitst op de offerte. Verschillende doelen, andere keuzes.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Specifieke positionering bovenaan',
    body: 'Niet "freelance software engineer". Wel "Freelance software engineer | backend + DevOps voor scale-ups in fintech | Amsterdam / remote". Specifiek wint — het signaleert dat je weet welke klanten je bedient.',
  },
  {
    heading: 'Recente opdrachten in detail',
    body: 'Drie tot vijf opdrachten met diepte. Per opdracht: klant (of sector bij NDA), periode + omvang, probleem, jouw rol, meetbaar resultaat. Klantnamen wegen — een €120-uur-zzp\'er en een €180-uur-zzp\'er framen ze verschillend.',
  },
  {
    heading: 'Toolset en eerlijke beperking',
    body: 'De drie tot vijf tools waar je nu echt goed in bent. Plus, voor seniors: wat je niet meer doet. "Werk niet meer met PHP-codebases ouder dan 2015" maakt je serieuzer over je vak.',
  },
];
export const exampleBullets = [
  'Freelance backend engineer | scale-up fintech | Amsterdam/remote | beschikbaar Q3 2026.',
  'Opdracht 2024–2025: Bunq — re-architectuur betaal-engine; team van 5; 9 maanden; latency p99 van 480ms naar 110ms.',
  'Opdracht 2023–2024: Cancom — multi-tenant SaaS-platform; team van 3; 6 maanden; succesvol naar productie.',
  'Stack: Go, Postgres, Kafka, AWS (EKS/RDS/SQS), Terraform. Ervaring: distributed systems, event-sourcing.',
  'Tarief: €120/uur indicatie; flexibel rond scope. Voorkeur: scale-ups van 50–200 FTE, technisch sterke teams.',
];
export const pitfalls = [
  'Generieke "freelance engineer" zonder positionering. Specifiek aantrekt; algemeen verzandt.',
  'Geen meetbare uitkomsten per opdracht. Voor zzp-acquisitie is dat het bewijs van waarde.',
  'Klantnamen claimen onder NDA zonder rechtvaardiging. Vraag toestemming of generaliseer naar sector.',
  'Tarief verzwijgen of expliciet noemen — beide kan, kies bewust. Een tarief-indicatie filtert klanten.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Balanced',
  reason: 'Een zzp-CV moet leesbaar zijn voor een C-level klant. Balanced past — geen design-statements, wel professioneel.',
};
export const relatedBlogSlugs = ['zzp-acquisitie-cv-per-klant', 'byok-eigen-ai-key', 'docx-template-als-bureau'];
export const relatedPersonas = ['zzp'];
