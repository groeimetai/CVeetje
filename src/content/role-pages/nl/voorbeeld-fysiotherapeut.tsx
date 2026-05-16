import type { RolePage } from '../types';

export const slug = 'fysiotherapeut';
export const kind: RolePage['kind'] = 'voorbeeld';
export const locale: RolePage['locale'] = 'nl';
export const label = 'fysiotherapeut';
export const title = 'CV-voorbeeld voor fysiotherapeut — registratie, specialisaties, patiëntenpopulatie';
export const description =
  'Een CV voor fysiotherapeuten — generalist of gespecialiseerd. KNGF-registratie, specialisatiediploma\'s, en concrete behandelvolume.';
export const keywords = [
  'CV fysiotherapeut',
  'CV manueel therapeut',
  'CV sportfysiotherapeut',
  'voorbeeld CV fysio',
  'CV BIG registratie',
  'KNGF CV',
];
export const hero =
  'Een fysiotherapeut-CV positioneert zich op drie assen: BIG- en KNGF-registratie, eventuele specialisatie-erkenning, en het type patiëntenpopulatie waar je ervaring mee hebt. Generalist of gespecialiseerd — beide is goed, maar wees expliciet.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Registraties direct zichtbaar',
    body: 'BIG-nummer, KNGF-registratie, eventuele specialisatie-registers (manueel therapie, sportfysiotherapie, kinder-fysio, geriatrie-fysio, oedeem-therapie, psychosomatische fysio). Bij elke specialisatie: jaar van erkenning. Voor solo-praktijk en groepspraktijk-eigenaren: AGB-code-vermelding mag.',
  },
  {
    heading: 'Werkervaring met patiëntenpopulatie',
    body: 'Per werkplek: type praktijk (eerstelijns, tweedelijns, sportcentrum, revalidatie), patiëntenpopulatie (acute zorg, chronische pijn, postoperatief, sport, geriatrie, neuro), gemiddeld behandelvolume. "Fysiotherapeut bij praktijk X" is leeg; "Fysiotherapeut bij eerstelijnspraktijk; gemiddeld 45 patiëntencontacten/week; focus op lage-rug en knie-revalidatie" is sterk.',
  },
  {
    heading: 'Bijscholing en netwerk',
    body: 'KNGF-bijscholings-uren bijhouden is verplicht — vermeld het. Specifieke cursussen die je recent hebt gedaan (dry-needling, taping, EHIS, mobiliserings-techniek). Eventueel: lidmaatschap netwerk-eerstelijn, NMOG, NVMT, VSG.',
  },
];
export const exampleBullets = [
  'BIG-registratie sinds 2017; KNGF-registratie; manueel-therapie-register sinds 2021.',
  'Eerstelijns praktijk Apeldoorn (2020–heden); 38 patiëntencontacten/week; expertise lage-rug, knie, schouder.',
  'Sportfysio-stage NOC*NSF Papendal (3 maanden, 2022); ervaring met top-sport-revalidatie.',
  'Bijscholing 2024–2025: dry-needling-cursus (40 uur), EHIS-update, taping en bandage-cursus.',
  'BSc Fysiotherapie (Hogeschool Utrecht, 2017); MSc Manuele Therapie (SOMT, 2021).',
];
export const pitfalls = [
  'BIG-nummer vergeten of niet bovenaan. Voor zorg-werkgevers is dat de eerste verificatiestap.',
  'Geen patiëntenpopulatie-context. "Fysiotherapeut" is een te brede koepel.',
  'Specialisaties claimen zonder erkenning. "Manueel therapeut" is een geregistreerde titel — alleen vermelden als je geregistreerd bent.',
  'Bijscholing weglaten. KNGF-verplicht; afwezigheid op CV roept vragen op.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Zorg-vakgebied; rustige professionaliteit. Geen design-keuzes die afleiden.',
};
export const context = 'Salarisindicatie 2026 (NL): junior fysiotherapeut €2.700–€3.300 bruto/maand, ervaren €3.300–€4.300, gespecialiseerd (manueel, sportfysio) €4.000–€5.200. Solo-praktijk-eigenaren afhankelijk van praktijk-omzet.';
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten'];
export const relatedPersonas = ['werkzoekenden'];
