import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'herintreders';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor herintreders — een CV dat het gat eerlijk benoemt en doorgaat';
export const description =
  'Voor wie na mantelzorg, gezinszorg, ziekte of een sabbatical terugkeert op de arbeidsmarkt. Hoe je het gat eerlijk benoemt zonder defensief te klinken.';
export const hero =
  'Een onverklaard gat in je CV vult een recruiter zelf in — met aannames die vaak erger zijn dan de werkelijkheid. Eén eerlijke regel lost het meeste op.';
export const keywords = [
  'herintreden CV',
  'gat in CV',
  'CV na mantelzorg',
  'CV na burn-out',
  'CV na zwangerschap',
  'CV na sabbatical',
];
export const relatedBlogSlugs = [
  'herintreden-na-pauze',
  '55-plus-arbeidsmarkt-cv',
  'zij-instromer-cv-vertelt-verhaal',
  'motivatiebrief-zonder-ai-tells',
];

export function Body() {
  return (
    <>
      <h2>De situatie</h2>
      <p>
        Je hebt een paar maanden of jaren niet betaald werk gedaan. Misschien voor mantelzorg, gezin,
        herstel, of een bewuste pauze. Nu wil je terug. Een onverklaard gat is een grotere
        afwijzingsrisico dan een eerlijk benoemd gat. De goede nieuws: één regel lost dat op.
      </p>

      <h2>De formule die werkt</h2>
      <p>
        &quot;[Categorie], [periode].&quot; — optioneel met één extra zin context.
      </p>
      <ul>
        <li>&quot;Mantelzorg ouders, januari 2022 – september 2023.&quot;</li>
        <li>&quot;Sabbatical / heroriëntatie, maart 2024 – heden.&quot;</li>
        <li>&quot;Ouderschapsverlof + part-time afbouw, 2021 – 2023.&quot;</li>
        <li>
          &quot;Herstel na burn-out, mei 2023 – februari 2024. Tweede helft een cursus X gevolgd en
          gedeeltelijk vrijwilligerswerk gedaan.&quot;
        </li>
      </ul>

      <h2>Wat CVeetje voor jou doet</h2>
      <ul>
        <li>
          <strong>Periode-markeringen als veld.</strong> In je profielinrichting kun je een
          niet-werkperiode markeren met een eigen label. Het verschijnt netjes op het CV zonder dat je
          de formaat hoeft uit te puzzelen.
        </li>
        <li>
          <strong>Herintred-context in profielsamenvatting.</strong> Je kunt expliciet in je
          profielsamenvatting de context van je herstart noemen. Die wordt onderdeel van elke
          gegenereerde versie.
        </li>
        <li>
          <strong>Humanizer-pass verwijdert &quot;helaas&quot;.</strong> Defensieve framing wordt
          actief vervangen. Een feit op zijn plek, geen meta-emotie.
        </li>
        <li>
          <strong>Werkervaring-volgorde aanpasbaar.</strong> Als je in de pauze toch dingen hebt
          gedaan (vrijwilligerswerk, cursus, eigen project) kun je dat als een &quot;werk-equivalente
          ervaring&quot; markeren.
        </li>
      </ul>

      <h2>Een paar specifieke tips per situatie</h2>

      <h3>Na mantelzorg</h3>
      <p>
        Een korte regel met &quot;Mantelzorg [voor wie], [periode]&quot; volstaat. Eventueel één
        toevoeging: &quot;Combineerde dit met X dagen per week vrijwilligerswerk bij...&quot;. Mantelzorg
        is in 2026 geen filter meer — bij overheid en zorg zelfs een waardering.
      </p>

      <h3>Na een burn-out</h3>
      <p>
        Je hoeft het woord niet te gebruiken als je dat niet wilt — &quot;Herstelperiode, [periode]&quot;
        is een aanvaarde formulering. In de motivatiebrief kun je expliciet zijn over wat je inmiddels
        weet over je grenzen en wat voor werkomgeving daarbij past. Eerlijkheid daar werkt beter dan
        verstoppen.
      </p>

      <h3>Na zwangerschap en jonge kinderen</h3>
      <p>
        &quot;Ouderschapsverlof + part-time afbouw, [periode]&quot;. Of: &quot;Gezinszorg, [periode]&quot;.
        Bij vrouwen wordt dit soms (helaas) verkeerd gelezen — een hint over je beschikbaarheid en
        ambities in je profielsamenvatting kan helpen die zorg weg te nemen zonder dat je het hoeft te
        verdedigen.
      </p>

      <h3>Na een sabbatical</h3>
      <p>
        Het meest neutrale gat — niemand zal je dit ten kwade duiden. &quot;Sabbatical, [periode]&quot;
        met eventueel één zin over wat je in die tijd hebt gedaan. Een sabbatical-jaar in
        Zuidoost-Azië hoeft niet aan je arbeidskracht af te doen.
      </p>

      <h2>Wat herintreders vaak missen</h2>
      <p>
        Veel werkgevers — overheid, zorg, MKB, sommige tech-bedrijven — hebben actief beleid om
        herintreders kansen te geven. Een eerlijk benoemd gat is voor hen een signaal van helderheid,
        niet van zwakte. Dat onverwachte voordeel zien herintreders zelf vaak niet, omdat ze hun gat
        ervaren als probleem.
      </p>
    </>
  );
}
