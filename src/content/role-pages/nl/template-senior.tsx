import type { RolePage } from '../types';

export const slug = 'senior';
export const kind: RolePage['kind'] = 'template';
export const locale: RolePage['locale'] = 'nl';
export const label = 'CV voor senior / executive';
export const title = 'CV-template voor senior / executive — focus, niet volume';
export const description =
  'Een executive-CV — Director, VP, C-level — werkt op andere principes dan een mid-career CV. Hier zijn de specifieke keuzes.';
export const keywords = ['CV executive', 'CV director', 'CV VP', 'CV C-level', 'CV senior management'];
export const hero =
  'Een executive-CV is geen samenvatting van een loopbaan. Het is een investment-pitch: hier ben ik nu, dit is waar ik waarde toevoeg, dit is mijn track record. Volume is irrelevant; focus is alles.';
export const blocks: RolePage['blocks'] = [
  {
    heading: 'Executive summary van twee zinnen',
    body: '"CEO/CTO/VP — 15+ jaar — ervaren in [domein] op [schaal]" is een vacature-vraag, geen samenvatting. Beter: "Bouw en versterk technologie-organisaties van Series A naar Series C. Laatste drie rollen: 0→1, 1→10, 10→100 — telkens in B2B SaaS." Direct concreet en gepositioneerd.',
  },
  {
    heading: 'Werkervaring met outcome-narratief',
    body: 'Per rol: organisatie-grootte bij start en bij vertrek, kernverantwoordelijkheden in één zin, drie hoogtepunten met meetbare impact. Voor C-level: P&L, fundraise, M&A, key hires, strategic pivots. Voor VP-niveau: organisatie-bouw, key proces-/cultuur-veranderingen, schaalbare frameworks geïmplementeerd.',
  },
  {
    heading: 'Eén pagina is sterker dan twee',
    body: 'Voor executives wint editie van inhoud. Een &eacute;&eacute;n-pagina-CV met scherp gekozen highlights toont oordeelsvermogen. Een drie-pagina-CV met elke rol uitgewerkt toont gebrek aan editie. Voor 20+ jaar ervaring: oudere rollen samen in &eacute;&eacute;n regel.',
  },
];
export const exampleBullets = [
  'Profielsamenvatting: "CTO — B2B SaaS — 0→1 en 1→10 schalingen. Laatste 3 rollen: scale-up 60→220 FTE (acquired 2024), scale-up 18→80 FTE (Series B 2022), founder/CTO own seed-stage (acquired 2019)."',
  'CTO @ ScaleupX (2022–2024): bouwde engineering van 18 naar 80; co-led Series B (€45M); acquired Q4 2024 door [strategisch koper].',
  'Co-founder + CTO @ StartupY (2017–2019): bouwde product van 0 naar product-market-fit; team naar 14 engineers; acquired Q3 2019.',
  'Eerdere ervaring: VP Engineering bij scale-up, Director Eng bij corporate — 2010–2017. Beschikbaar voor toelichting.',
  'Education: MSc Computer Science (Delft, 2008); board-roles bij 2 scale-ups.',
];
export const pitfalls = [
  'CV van drie pagina&apos;s. Voor executives een gebrek-aan-editie-signaal.',
  'Generieke leiderschap-clich&eacute;s ("transformationeel leider met visie"). Welke transformatie, welk resultaat?',
  'Geen P&L of fundraise-context bij C-level. Het is de meta-laag waarop senioren beoordeeld worden.',
  'Detail per rol uitwerken bij rollen ouder dan 10 jaar. Maakt &apos;m onleesbaar.',
];
export const recommendedStyle: RolePage['recommendedStyle'] = {
  style: 'Conservative',
  reason: 'Executive-werk vraagt om rust en autoriteit. Een ingetogen, klassieke stijl past beter dan visuele ingrepen.',
};
export const relatedBlogSlugs = ['cv-op-maat-in-2-minuten', 'welke-stijl-kies-je'];
export const relatedPersonas = ['werkzoekenden', 'product-owners'];
