import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'werkzoekenden';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor werkzoekenden — sneller een gericht CV per vacature';
export const description =
  'Voor wie de komende weken een baan zoekt: hoe je per vacature een gericht CV maakt zonder uren in Word, en hoe je voorkomt dat je sollicitatie afslaat op het filterproces.';
export const hero =
  'Solliciteren is werk. Iedere week opnieuw je CV stuk schaven in Word is werk dat geen waarde toevoegt — zeker niet als de drempel om een sterke versie te leveren elke vacature anders ligt.';
export const keywords = [
  'CV maken werkzoekenden',
  'CV per vacature',
  'snel CV',
  'CV op maat',
  'sollicitatie automatiseren',
  'ATS CV',
  'gratis CV maker',
];
export const relatedBlogSlugs = [
  'cv-op-maat-in-2-minuten',
  'ats-cv-2026',
  'recruiter-aan-het-woord',
  'recruiter-valkuilen-cv',
  'welke-stijl-kies-je',
  'motivatiebrief-zonder-ai-tells',
];

export function Body() {
  return (
    <>
      <h2>De situatie</h2>
      <p>
        Je bent op zoek naar een baan. Je hebt vijftien vacatures opgeslagen waar je iets in ziet. Je
        weet dat je per vacature je CV moet aanpassen om kans te maken. Je weet ook dat het stupide werk
        is om elk CV apart in Word op te maken. Dat is precies de wrijving die CVeetje wegneemt.
      </p>

      <h2>Wat je krijgt</h2>
      <ul>
        <li>
          <strong>Eén keer je profiel inrichten.</strong> Daarna is elke variant een kwestie van een
          vacature plakken en op &quot;genereer&quot; klikken.
        </li>
        <li>
          <strong>Per vacature een gericht CV.</strong> Geen verzinsels — herordening en framing van wat
          je al hebt gedaan, met de juiste woorden voor de specifieke rol.
        </li>
        <li>
          <strong>Een motivatiebrief erbij.</strong> Optioneel. Door een tweede humanizer-pass om de
          standaard-AI-toon te vermijden.
        </li>
        <li>
          <strong>Vijf stijlen.</strong> Conservative voor bank en zorg, Creative voor design en
          marketing, Editorial voor portfolio-rollen. Stijl past zich aan aan de werkgever.
        </li>
        <li>
          <strong>ATS-vriendelijk.</strong> Geschikt voor wat 90% van de Nederlandse werkgevers
          gebruikt. Tekstlaag in PDF, herkenbare structuur, eerlijk omgaan met keywords.
        </li>
      </ul>

      <h2>Voor wie precies werkt het?</h2>
      <p>
        Het werkt het beste als je in de actieve zoek-fase zit. Een paar vacatures per week, mogelijk
        meer. Het is voor jou minder relevant als je één keer per drie jaar solliciteert — daar kun je
        prima met handwerk uit komen.
      </p>
      <p>
        Het werkt extra goed als:
      </p>
      <ul>
        <li>Je in meerdere richtingen kijkt en niet voor één type rol solliciteert.</li>
        <li>Je een paar jaar werkervaring hebt en je CV daardoor langer is dan past op één pagina.</li>
        <li>
          Je in een career-switch zit of een uitleggingsbehoefte hebt (zie ook onze gids voor
          zij-instromers).
        </li>
      </ul>

      <h2>De praktische flow</h2>
      <ol>
        <li>Account aanmaken (gratis, 15 credits per maand).</li>
        <li>Profiel inrichten — uit een LinkedIn-PDF, handmatig, of een bestaand CV.</li>
        <li>Eerste vacature plakken, stijl kiezen, genereren.</li>
        <li>Lezen, eventueel finetunen, downloaden als PDF.</li>
        <li>Volgende vacature: weer een minuut.</li>
      </ol>

      <h2>Wat het niet doet</h2>
      <p>
        Het regelt geen sollicitaties voor je. Het past je netwerk niet automatisch aan. Het schrijft je
        ervaring niet bij. Het is een tool voor de schrijftaken — de keuzes over waar je solliciteert,
        wat je vraagt qua salaris, en wie je benadert blijven van jou.
      </p>

      <h2>Eerlijke kanttekeningen</h2>
      <ul>
        <li>
          Een gegenereerd CV vraagt om een eigen leeshalte. Niet blind versturen. Tien minuten lezen,
          finetune, doorgaan.
        </li>
        <li>
          De gratis tier (1 CV per maand) is genoeg voor wie incidenteel solliciteert. Bij intensiever
          gebruik kosten extra credits enkele euro&apos;s per pakket.
        </li>
        <li>
          Voor de strengste creatieve sectoren is het ook handig om naast CVeetje een portfolio en
          eigen werkpagina&apos;s te hebben. Geen tool vervangt dat.
        </li>
      </ul>

      <h2>Wat we hier publiekelijk over zeggen</h2>
      <p>
        We bouwen CVeetje uit eigen behoefte. We hebben zelf gesolliciteerd, zelf in Word zitten klooien,
        zelf gevloekt op LinkedIn-imports die niets opleveren. We bouwen niet voor &quot;de massa&quot; —
        we bouwen voor mensen die hun sollicitatie-werk serieus nemen en niet de tijd hebben om het
        veertig minuten per vacature te doen.
      </p>
    </>
  );
}
