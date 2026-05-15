import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'docx-template-als-bureau',
  locale: 'nl',
  title: 'Een eigen Word-template laten invullen door AI — hoe het werkt en wanneer het bespaart',
  description:
    'Voor bureaus en consultancies die met klanthuisstijlen werken. Hoe je een DOCX-template uploadt, wat de AI ermee doet, en waar het misgaat als je het verkeerd inricht.',
  publishedAt: '2025-12-05',
  updatedAt: '2026-05-15',
  readingMinutes: 8,
  category: 'guide',
  personas: ['product-owners', 'hiring-managers', 'zzp', 'loopbaancoaches'],
  keywords: ['DOCX template CV', 'CV template invullen', 'huisstijl CV', 'bureau CV', 'consultancy CV'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        De meeste CV-tools dwingen je in hun eigen lay-out. Voor een bureau, een detacheerder of een
        consultancy is dat zelden bruikbaar — daar bestaat een eigen huisstijl-document, en daar moeten
        nieuwe CV&apos;s in passen. CVeetje heeft daar een aparte flow voor: je uploadt je
        DOCX-template, de AI vult &apos;m in. Hier is hoe het echt werkt.
      </p>

      <h2>Wat is het verschil met &quot;gewoon een stijl kiezen&quot;?</h2>
      <p>
        Een stijl is een door CVeetje gemaakte lay-out. Conservative, Balanced, Creative,
        Experimental, Editorial. Geweldig voor individuele sollicitanten, maar niet bruikbaar als je
        klant zegt &quot;al onze CV&apos;s moeten in <em>dit</em> template&quot; en hij een Word-bestand
        meestuurt.
      </p>
      <p>
        DOCX-template-fill is anders: jij levert het sjabloon aan, en wij vullen het op de juiste plekken
        in. De lay-out blijft 100% van jou. Wij raken alleen tekst aan.
      </p>

      <h2>Welke templates werken?</h2>
      <p>
        Vrijwel elke moderne DOCX. Het systeem detecteert vijf categorieën sjablonen:
      </p>
      <ul>
        <li>
          <strong>Tabel-gebaseerd.</strong> Een CV waar elke sectie een tabel-rij is — typisch voor
          uitzendbureaus en detacheerders. Voorbeeld: &quot;Together Abroad&quot;-template.
        </li>
        <li>
          <strong>Tab-gescheiden.</strong> Een document met label-en-waarde-paren gescheiden door tabs.
          &quot;Naam → Jan Janssen&quot;.
        </li>
        <li>
          <strong>Label-met-dubbele-punt.</strong> &quot;E-mail : ...&quot; in een doorlopende
          paragraaf.
        </li>
        <li>
          <strong>Vrije lay-out.</strong> Een sjabloon met placeholders zoals &quot;[Voornaam]&quot; of
          &quot;[Bedrijfsnaam]&quot;.
        </li>
        <li>
          <strong>Mixed.</strong> Combinaties van bovenstaande. Een tabel bovenaan voor contactgegevens,
          paragraaf-secties eronder voor werkervaring. De parser kan met al deze opzetten omgaan.
        </li>
      </ul>

      <h2>Hoe het systeem omgaat met je sjabloon</h2>
      <p>
        Een DOCX is onder de motorkap een ZIP met XML. Het systeem zet vijf stappen:
      </p>
      <ol>
        <li>
          <strong>Structuur uitlezen.</strong> Tabellen, rijen, cellen, paragrafen — alles wordt
          geïdentificeerd en genummerd (s0, s1, ...).
        </li>
        <li>
          <strong>Blueprint maken.</strong> Een AI-call analyseert wat de secties zijn: contact,
          profiel, werkervaring, opleiding, vaardigheden. En welke secties herhalend zijn — dus voor élke
          werkervaring opnieuw een blok.
        </li>
        <li>
          <strong>Herhalende blokken dupliceren.</strong> Heb je zeven werkervaringen en heeft het
          sjabloon één voorbeeldblok? Dan worden er zes extra blokken in de XML gezet. Volgorde, styling,
          ordening blijft consistent.
        </li>
        <li>
          <strong>Vullen.</strong> Een tweede AI-call vult de juiste profieldata in de juiste
          segment-ID&apos;s. Dit gebeurt op tekstniveau — geen styling wordt aangeraakt.
        </li>
        <li>
          <strong>XML-replacement in omgekeerde positie.</strong> Replacements worden van achter naar
          voor toegepast. Dit klinkt technisch, maar is essentieel: anders schuiven de tekstposities op
          en eindig je met willekeurig kapotgemaakte tags.
        </li>
      </ol>

      <h2>Een eigen DOCX-template uploaden — wat je moet weten</h2>
      <h3>1. Geef het sjabloon één duidelijk voorbeeld per herhalend blok</h3>
      <p>
        Heb je een sectie &quot;Werkervaring&quot;? Zet één werkervaring voorbeeld erin met alle velden
        die je wilt zien — titel, bedrijf, periode, beschrijving, bullet-points. De AI duplicereert dit
        blok voor elke werkervaring van de kandidaat.
      </p>

      <h3>2. Gebruik herkenbare labels</h3>
      <p>
        &quot;Werkervaring&quot;, &quot;Opleiding&quot;, &quot;Vaardigheden&quot;, &quot;Talen&quot;,
        &quot;Profiel&quot;. Standaardterminologie helpt de blueprint-stap betrouwbaar te zijn. Een
        eigenaardige sectienaam als &quot;Mijn loopbaan-DNA&quot; werkt — maar maakt het systeem
        afhankelijker van context.
      </p>

      <h3>3. Vermijd verborgen tekstvelden of macros</h3>
      <p>
        Form-fields, content-controls, macros — die werken niet goed. Een &quot;gewoon&quot; Word-document
        met tekst, tabellen en eenvoudige opmaak is betrouwbaarder. Geen Word-magie, gewoon zichtbare
        secties.
      </p>

      <h3>4. Een profielfoto-placeholder mag</h3>
      <p>
        Een afbeelding in het sjabloon op de plek waar de kandidaat-foto hoort, wordt automatisch
        vervangen als de kandidaat een profielfoto heeft. Het beeldformaat blijft hetzelfde — alleen de
        bron-afbeelding wisselt.
      </p>

      <h2>Veelvoorkomende valkuilen</h2>
      <ul>
        <li>
          <strong>Te creatieve lay-out.</strong> Een sjabloon waarbij tekst in tekstvakken zit die over
          de pagina zweven is moeilijk te vullen. Houd het op een grid, tabellen en paragrafen.
        </li>
        <li>
          <strong>Hoeveel werkervaringen toon je?</strong> Een sjabloon met ruimte voor drie ervaringen
          wordt door het duplicatie-mechanisme uitgebreid naar zoveel als nodig — maar de pagina kan dan
          uitlopen. Houd in gedachten dat de output dynamisch is qua lengte.
        </li>
        <li>
          <strong>Custom fonts die niet embedded zijn.</strong> Word weergeeft &apos;m mooi op jouw
          machine, maar bij andere mensen valt &apos;m terug op een vervanger. Embed je fonts in het
          sjabloon, of gebruik systeemfonts.
        </li>
      </ul>

      <h2>Wie heeft hier baat bij?</h2>
      <p>
        Drie typische gebruikersgroepen:
      </p>
      <ol>
        <li>
          <strong>Bureaus en detacheerders.</strong> Eén template, honderden kandidaten per maand. De
          tijdwinst is enorm.
        </li>
        <li>
          <strong>Loopbaancoaches.</strong> Een coach met een eigen lay-out die elke klant in dezelfde
          stijl wil presenteren. Twintig klanten per maand, in een paar minuten per stuk.
        </li>
        <li>
          <strong>Klant-eisen.</strong> Een opdrachtgever stuurt zijn template mee en zegt &quot;dien
          hier maar in&quot;. Eén keer uploaden, en je hebt je eigen CV in hun template — bij elke
          variant die je nodig hebt.
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">Hoe lang duurt het?</div>
        <p>
          De eerste keer een nieuw template uploaden duurt ongeveer een minuut — er gebeuren twee
          AI-calls op de achtergrond. Vervolggeneraties op hetzelfde template gebruiken een gecachte
          blueprint en zijn binnen 15 tot 30 seconden klaar.
        </p>
      </div>

      <h2>Wat dit niet is</h2>
      <p>
        Het is geen tool om bestaande CV&apos;s in een nieuw sjabloon over te zetten — daar is geen
        AI-call nodig en daar zijn andere tools beter in. Het is een tool die <em>gegenereerde
        profieldata</em> in jouw sjabloon plaatst. Eerst is er een profiel (uit LinkedIn, handmatig, of
        uit een bestaand CV) en dán wordt het in jouw template gegoten.
      </p>
    </>
  );
}
