import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'internationals';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor internationals in Nederland — een CV dat hier werkt';
export const description =
  'Voor expats, kennismigranten, internationaal-opgeleide kandidaten. Hoe je je CV omzet naar Nederlandse conventies zonder je verhaal kwijt te raken.';
export const hero =
  'Een CV uit Spanje, India of de VS volgt andere conventies dan een Nederlands CV. Welke verschillen tellen, en welke aanpassingen daadwerkelijk je response-rate verhogen.';
export const keywords = [
  'CV voor Nederland international',
  'Dutch CV expat',
  'kennismigrant CV',
  'CV Nederland buitenlandse',
  'CV vertalen Nederlands',
];
export const relatedBlogSlugs = [
  'international-nederlands-cv',
  'ats-cv-2026',
  'welke-stijl-kies-je',
  'cv-op-maat-in-2-minuten',
];

export function Body() {
  return (
    <>
      <h2>De zes belangrijkste verschillen die telkens terugkomen</h2>
      <ol>
        <li>
          <strong>Lengte.</strong> Niet vijf pagina&apos;s (Indiase stijl), niet één strikte pagina
          (Amerikaanse stijl) — Nederland: een tot twee pagina&apos;s.
        </li>
        <li>
          <strong>Persoonlijke informatie.</strong> Geen burgerlijke staat, geen religie, geen
          familie-informatie. Geboortedatum gebruikelijk maar niet verplicht.
        </li>
        <li>
          <strong>Profielsamenvatting versus Career Objective.</strong> &quot;Seeking a challenging
          position in...&quot; is uit. Twee à drie zinnen die concreet zijn over wie je bent.
        </li>
        <li>
          <strong>Cijfers en framing.</strong> Nederlandse argwaan over te veel marketing-taal. Eén
          stevig cijfer met context wint van vijf percentage-claims op een rij.
        </li>
        <li>
          <strong>Taal van het CV.</strong> Engels als de werkomgeving Engels is, Nederlands als dat
          niet zo is. Halve Nederlandse versies werken averechts.
        </li>
        <li>
          <strong>Hobby&apos;s mogen.</strong> Eén regel onderaan met interesses is in Nederland
          gebruikelijk en wordt soms gemist op puur internationale CV&apos;s.
        </li>
      </ol>

      <h2>Wat CVeetje voor jou doet</h2>
      <ul>
        <li>
          <strong>Twee versies parallel.</strong> Bij profielinrichting kies je de conventie
          (Nederlands of internationaal). Je kunt voor één werkgever in NL en één in DE allebei een
          gerichte variant maken.
        </li>
        <li>
          <strong>Buitenlandse werkgevers correct framen.</strong> Een Indiase werkgever krijgt een
          korte parenthese (&quot;Senior Engineer — Reddy Labs (Bangalore, DSL verificatie,
          2018–2022)&quot;) zodat een Nederlandse recruiter direct context heeft.
        </li>
        <li>
          <strong>Opleidings-equivalentie.</strong> Een Master of Engineering uit India of een
          Bachelor in Commerce wordt geframed met Nederlandse niveau-aanduiding waar dat klopt.
        </li>
        <li>
          <strong>Vertaling waar nodig.</strong> Een Engelse versie en een Nederlandse versie naast
          elkaar — niet een halve-vertaling die in geen taal vloeiend leest.
        </li>
      </ul>

      <h2>Een paar specifieke valkuilen</h2>
      <h3>Salarisindicatie</h3>
      <p>
        Op een Nederlands CV: nee. In de motivatiebrief eventueel ter sprake brengen, maar niet op
        het CV zelf. Dit verschilt van een aantal andere markten.
      </p>

      <h3>Referenties</h3>
      <p>
        &quot;Available on request&quot; is in Nederland zwak. Of je hebt referenties die je nu
        deelt, of je laat de regel weg.
      </p>

      <h3>Foto</h3>
      <p>
        Optioneel. Steeds vaker weggelaten, met name bij overheid en zorg. Voor IT- en commerciële
        rollen wisselt het. Geen foto is veilig.
      </p>

      <h3>Adresgegevens</h3>
      <p>
        Een stad volstaat. Een volledig straatadres wordt steeds vaker weggelaten — niet onbeleefd,
        gewoon moderner.
      </p>

      <h2>Voor wie schrijven we dit?</h2>
      <p>
        We hebben veel internationals als gebruiker — vooral in tech, R&amp;D, consultancy en
        zorg. Veel kandidaten die hun loopbaan in een ander land begonnen en in Nederland verder
        willen. CVeetje is bewust meertalig: negen talen ondersteund voor zowel CV-generatie als
        motivatiebrieven, niet als marketing-claim maar omdat het in de praktijk relevant is.
      </p>

      <h2>Cultuur is meer dan layout</h2>
      <p>
        Een sollicitatiebrief in Nederland is directer dan in veel andere landen. Geen
        beleefdheidsstapeling, geen overdreven gevoel-uitingen. Een Nederlander leest &quot;ik denk
        dat ik geschikt ben omdat...&quot; als een eerlijke opening, niet als zelfonderwaardering.
        Voor wie uit een meer hi&euml;rarchische schrijfcultuur komt, kan dit wennen zijn.
      </p>
    </>
  );
}
