import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'recruiters';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor recruiters — wat het met sollicitaties doet, en wat het je oplevert';
export const description =
  'Voor in-house recruiters, agency-recruiters en uitzendbureaus. Wat verandert er aan je instroom als kandidaten CVeetje gebruiken — en kun je het zelf inzetten voor kandidaatpresentatie?';
export const hero =
  'AI-CV-tools veranderen je instroom. De vraag is niet of, maar hoe. Hier is een nuchter beeld van wat een AI-gegenereerd CV is, wat het niet is, en hoe je &apos;m van een handmatig CV onderscheidt.';
export const keywords = [
  'recruiter AI CV',
  'AI gegenereerd CV recruitment',
  'CV beoordeling AI',
  'uitzendbureau AI tools',
  'recruitment software 2026',
];
export const relatedBlogSlugs = [
  'recruiter-aan-het-woord',
  'recruiter-valkuilen-cv',
  'gatekeeper-eerlijkheid',
  'docx-template-als-bureau',
  'chatgpt-vs-cveetje',
  'ats-cv-2026',
];

export function Body() {
  return (
    <>
      <h2>Wat je in 2026 ziet veranderen</h2>
      <p>
        Veel meer kandidaten gebruiken AI om hun CV te maken. Dat is geen vermoeden — het komt
        terug in elk gesprek dat we voeren met recruiters. De vraag verschuift dus van &quot;is dit
        echt?&quot; naar &quot;hoe goed is de inhoud en wat zegt het over de kandidaat?&quot;.
      </p>
      <p>
        Een eerlijke realiteit: een door AI gegenereerd CV met menselijke leeshalte is doorgaans beter
        gestructureerd dan een door een onervaren kandidaat handmatig getypt CV. Het is geen
        achteruitgang voor je instroom; het is een verschuiving in waar de waardetoevoeging zit.
      </p>

      <h2>Hoe je een CVeetje-CV herkent (en wat dat betekent)</h2>
      <p>
        Onze CV&apos;s hebben geen verborgen merk of watermerk. We gebruiken een tekstlaag-PDF met
        Puppeteer en moderne typografie. Patronen die je soms ziet:
      </p>
      <ul>
        <li>Een sterke profielsamenvatting van twee à drie zinnen.</li>
        <li>Werkervaring met varierende bullet-lengtes en concrete uitkomsten.</li>
        <li>
          ATS-vriendelijke structuur, ook bij de creatievere stijlen (tekst blijft lineair leesbaar).
        </li>
        <li>Geen overdadige skill-soup — vaak een focused set van zes à acht skills.</li>
      </ul>
      <p>
        Het belangrijkste teken dat een CV door iemand is nagekeken: één of twee bullets die uit de
        toon vallen, een persoonlijke noot in de samenvatting, een eigen woordkeuze. Een onbewerkt
        AI-CV mist die menselijke spitsen.
      </p>

      <h2>Wat zegt het over de kandidaat?</h2>
      <p>
        Een goed AI-gegenereerd CV is geen luiheid. Het is iemand die zijn tijd anders besteedt —
        liever aan de inhoudelijke voorbereiding van het gesprek dan aan opmaak in Word. Voor de meeste
        rollen is dat een positief signaal.
      </p>
      <p>
        Voor sommige rollen kan een handmatig CV een betere signaal geven (bijvoorbeeld een
        copywriter-vacature). Daar mag je in je vraagstelling aan kandidaten kortaf zijn: &quot;Hoe heb
        je dit CV gemaakt?&quot; — een goede kandidaat antwoordt zonder gêne en legt uit wat AI heeft
        gedaan en wat ze zelf hebben aangepast.
      </p>

      <h2>Recruiters die CVeetje voor eigen werk inzetten</h2>
      <p>
        Naast kandidaten die CVeetje gebruiken, hebben we recruiter-klanten die het inzetten voor:
      </p>
      <ol>
        <li>
          <strong>Kandidaatpresentatie aan klanten.</strong> Een gedetacheerde kandidaat &quot;in
          eigen huisstijl&quot; presenteren via een eigen DOCX-template — &eacute;&eacute;n keer
          uploaden, eindeloos hergebruiken.
        </li>
        <li>
          <strong>Pool-CVs voor uitzendbureaus.</strong> Per kandidaat een variant per type opdracht.
          Verkooppropositie wordt sterker.
        </li>
        <li>
          <strong>Talent-positioneringsdocumenten.</strong> Voor headhunting wordt vaak een
          &quot;Talent profile&quot; opgesteld — dat kan dezelfde flow als een CV gebruiken.
        </li>
      </ol>

      <h2>Een toetsenkader voor AI-CV&apos;s in je workflow</h2>
      <p>
        Drie vragen die ons door recruiters voorgelegd zijn als &quot;hoe weten we dat dit eerlijk
        is?&quot;:
      </p>
      <ol>
        <li>
          <strong>Komen de claims overeen met LinkedIn?</strong> Een hoogwaardig AI-CV heeft een sterke
          rolomschrijving — maar de feiten zouden in een LinkedIn-profiel of een referentie moeten
          terugkomen.
        </li>
        <li>
          <strong>Kan de kandidaat het in een eerste call duiden?</strong> Vraag bij een bullet die
          impressief klinkt: &quot;Kun je dit een laagje dieper toelichten?&quot;. Een eerlijke
          AI-versie van iemands eigen werk is helemaal verdedigbaar; een opgeklopte versie struikelt
          hier.
        </li>
        <li>
          <strong>Is er een rode draad?</strong> Een CV waar elke bullet om het hardst impressief is
          maar geen consistent verhaal vertelt, is een teken van post-AI-prompting zonder eigen
          leeshalte.
        </li>
      </ol>

      <h2>Wat we als product juist <em>niet</em> doen</h2>
      <p>
        We doen niet:
      </p>
      <ul>
        <li>
          Synthetische werkervaring genereren als de kandidaat geen materiaal heeft. Honest rules zijn
          in de prompts ingebouwd.
        </li>
        <li>
          Cijfers verzinnen die niet in het bronmateriaal stonden. &quot;Verbeterde de NPS met 23%&quot;
          komt er alleen op als ergens in je profiel een NPS-getal staat.
        </li>
        <li>
          Een kandidaat instigeren om een claim op te rekken. De gatekeeper-stap vraagt om bewijs bij
          opwaarderingen — zonder bewijs blijft de claim op het oorspronkelijke niveau.
        </li>
      </ul>

      <h2>Wat dit voor je werk betekent</h2>
      <p>
        Op de korte termijn: minder druk om voor elke vacature handmatig perfecte CV&apos;s van
        kandidaten te leveren. Meer ruimte om je tijd te besteden aan kwalitatieve gesprekken,
        referentie-checks en cultural fit.
      </p>
      <p>
        Op de lange termijn: een natuurlijk hoger basisniveau van inkomende CV&apos;s. De top blijft
        nog steeds boven uitsteken op inhoud, niet op opmaak. Een goed gemoderneerd recruitmentproces
        ziet dit als kans, niet als bedreiging.
      </p>
    </>
  );
}
