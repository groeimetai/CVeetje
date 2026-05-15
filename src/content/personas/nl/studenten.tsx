import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'studenten';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor studenten — stage, bijbaan, eerste echte rol';
export const description =
  'Voor mbo-, hbo- en wo-studenten. Hoe je een CV maakt dat klopt wanneer je nog weinig hebt gedaan, en wat je &eacute;&eacute;n keer per studiejaar handig kunt updaten.';
export const hero =
  'Een studenten-CV hoeft geen drama te zijn. Het hoeft niet vol te zijn, niet creatief, niet uitzonderlijk. Het moet eerlijk en gericht zijn. Hier is hoe je dat aanpakt.';
export const keywords = [
  'student CV',
  'stage CV',
  'eerste CV',
  'bijbaan CV',
  'CV mbo hbo wo',
  'CV zonder werkervaring',
];
export const relatedBlogSlugs = [
  'student-eerste-cv',
  'cv-op-maat-in-2-minuten',
  'welke-stijl-kies-je',
  'linkedin-naar-cv-30-seconden',
];

export function Body() {
  return (
    <>
      <h2>Drie momenten waarop een student een CV nodig heeft</h2>
      <ol>
        <li>
          <strong>Bijbaan zoeken.</strong> Een eenvoudige, eerlijke versie volstaat. Het hoeft niet
          uitgebreid; het hoeft duidelijk te zijn.
        </li>
        <li>
          <strong>Stage solliciteren.</strong> Hier mag het meer gericht. Welke richting bin je, wat
          heb je in welke vakken laten zien, welk project trekt je naar deze organisatie?
        </li>
        <li>
          <strong>Eerste echte baan.</strong> Hier laat je zien dat je studieperiode iets heeft
          gemaakt — projecten, bestuurservaring, een specifieke richting waar je nu in gaat.
        </li>
      </ol>

      <h2>Wat CVeetje voor jou doet</h2>
      <ul>
        <li>
          <strong>Profiel &eacute;&eacute;n keer per studiejaar inrichten.</strong> Aan het begin van het
          jaar. Dan klopt het de rest van het jaar.
        </li>
        <li>
          <strong>Voor elke sollicitatie een gerichte variant.</strong> Geen vier uur in Word per
          aanvraag.
        </li>
        <li>
          <strong>Gratis tier dekt de meeste maanden.</strong> 15 credits per maand is genoeg voor één
          volledige sollicitatie. Voor meer kun je een Starter-pack van €4,99 kopen.
        </li>
        <li>
          <strong>Eerlijk over wat je hebt gedaan.</strong> Geen opgeklopte titels, geen verzonnen
          ervaring. Dat houdt je gesprek geloofwaardig in plaats van wankel.
        </li>
      </ul>

      <h2>Wat je zelf moet doen (en wel goed)</h2>
      <p>
        Een tool kan je framing geven. Wat de tool niet kan, is weten wat je écht hebt gedaan. Dus
        besteed je eerste setup-tijd aan een eerlijk en specifiek profiel:
      </p>
      <ul>
        <li>
          Wat is je studierichting precies, welke specialisaties of minors had je, welk
          afstudeerproject loopt of liep?
        </li>
        <li>
          Welk project — bij studie of in je vrije tijd — was voor jou inhoudelijk de moeite waard?
          Beschrijf het in twee zinnen.
        </li>
        <li>
          Wat heb je naast je studie gedaan dat verantwoordelijkheid liet zien? Commissie, bijbaan,
          eigen onderneming, vrijwilligerswerk.
        </li>
        <li>
          Welke taal, software, of methodes ken je echt goed (i.p.v. een keer gezien)?
        </li>
      </ul>

      <h2>De stijlkeuze voor studenten</h2>
      <p>
        Voor 90% van de studenten is Balanced of Conservative de juiste keuze. Een veilige, nuchtere
        layout. Creative kan kloppen als je in een design- of communicatierichting studeert. Editorial
        en Experimental zijn meestal nog te uitgesproken voor een eerste of tweede baan.
      </p>

      <h2>Een paar vragen die we krijgen</h2>
      <details>
        <summary>Heb ik een foto op mijn CV nodig?</summary>
        <div>
          Niet verplicht. In Nederland is een neutrale, recente foto geaccepteerd maar steeds vaker
          weggelaten. Bij overheid, zorg en onderwijs is geen foto eerder de norm geworden.
        </div>
      </details>
      <details>
        <summary>Mag ik mijn vakkenlijst op het CV zetten?</summary>
        <div>
          Niet de hele lijst. Alleen twee tot vier vakken die specifiek relevant zijn voor de rol —
          bijvoorbeeld &quot;Operations Research&quot; als je bij een logistiek bedrijf solliciteert.
          Verder vermeld je je richting en specialisatie.
        </div>
      </details>
      <details>
        <summary>Hoe lang mag een student-CV zijn?</summary>
        <div>
          Eén pagina. In zeer zeldzame gevallen anderhalf, maar voor een typische student is één
          pagina genoeg en beter.
        </div>
      </details>

      <h2>Voorbeeld-flow voor een hbo-student</h2>
      <ol>
        <li>Bovenaan: contact, profiel-zin met richting en stage-vraag.</li>
        <li>Opleiding: hbo-niveau en specialisatie.</li>
        <li>
          Relevante ervaring: eventueel stage(s), commissies, projecten — twee bullets per item.
        </li>
        <li>Werkervaring tijdens studie: bijbanen in &eacute;&eacute;n regel.</li>
        <li>Vaardigheden: focus op vijf à zes echt-relevante.</li>
        <li>Persoonlijk: één regel met een concrete hobby of interesse.</li>
      </ol>
    </>
  );
}
