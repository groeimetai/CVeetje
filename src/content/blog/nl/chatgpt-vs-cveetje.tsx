import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'chatgpt-vs-cveetje',
  locale: 'nl',
  title: 'ChatGPT vs CVeetje — wanneer is een eigen tool het waard?',
  description:
    'ChatGPT kan een CV maken. Claude kan een CV maken. Gemini kan een CV maken. Waarom dan toch een aparte tool? Een eerlijke vergelijking, zonder verkooppraat.',
  publishedAt: '2026-04-10',
  updatedAt: '2026-05-15',
  readingMinutes: 8,
  category: 'comparison',
  personas: ['werkzoekenden', 'product-owners', 'zzp'],
  keywords: [
    'ChatGPT CV',
    'Claude CV',
    'AI CV generator',
    'CVeetje vergelijking',
    'CV maken met AI',
  ],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Voordat we CVeetje bouwden, gebruikten we ChatGPT voor onze eigen CV&apos;s. Het werkte. Het
        werkte zelfs vrij goed. Dus waarom dan toch een eigen tool? Vier specifieke redenen, en één
        eerlijke reden waarom je gewoon bij ChatGPT kunt blijven.
      </p>

      <h2>Wat ChatGPT (of Claude, of Gemini) prima doet</h2>
      <ul>
        <li>
          <strong>Tekst herschrijven.</strong> Je plakt je oude CV erin, je plakt de vacature, je vraagt
          &quot;maak hier een gerichte versie van&quot;, en je krijgt iets bruikbaars terug.
        </li>
        <li>
          <strong>Brainstormen over framing.</strong> &quot;Mijn rol was X, ik heb Y bereikt — hoe noem je
          dat in management-taal?&quot; is een uitstekende ChatGPT-prompt.
        </li>
        <li>
          <strong>Motivatiebrief drafts.</strong> Drie versies, kies de beste, schaaf bij. Dat doet elke
          generieke chatbot prima.
        </li>
      </ul>
      <p>
        Voor wie één keer per jaar solliciteert is een aparte tool dan ook niet de moeite. Voor wie zes
        sollicitaties per maand doet, of die voor een team CV&apos;s moet maken, of die elke maand met een
        andere klant in een andere sector zit, gaat het schuren.
      </p>

      <h2>Waar het in ChatGPT begint te wringen</h2>

      <h3>1. Je profiel zit nergens vast</h3>
      <p>
        Elke nieuwe chat begint leeg. Je plakt opnieuw je werkervaring, opnieuw je certificaten, opnieuw
        die ene rol uit 2019 die je telkens vergeet. Custom GPTs en projects kunnen dit verzachten, maar
        ze hebben geen idee van structuur. De volgende keer schrijft het model dezelfde rol op een net
        iets andere manier op — niet fout, maar niet consistent. En consistentie is precies wat een CV
        nodig heeft, zeker als een recruiter er twee van jou ziet.
      </p>
      <p>
        CVeetje slaat je profiel op als gestructureerd datamodel: elke werkervaring, elke skill, elke
        opleiding is een veld. De AI vult dat in. Bij regeneratie blijft de feitelijke laag identiek,
        alleen de framing verandert.
      </p>

      <h3>2. Layout is een drama in ChatGPT</h3>
      <p>
        Je krijgt platte tekst, of in het beste geval Markdown. Voor een echt CV moet je dat in Word of
        Google Docs gieten, layout vechten, lettertypes kiezen, kolommen uitlijnen. Dan is je &quot;snelle
        ChatGPT CV&quot; alsnog dertig minuten werk.
      </p>
      <p>
        Een tool die de tekst <em>en</em> de PDF in één run produceert is geen luxe — het is waar de tijd
        zit. CVeetje genereert vijf stijlen vanuit hetzelfde datamodel: Conservative, Balanced, Creative,
        Experimental, Editorial. Elk met eigen typografie, kleurgebruik en grid. Geen Word, geen
        gedoe.
      </p>

      <h3>3. AI tells in motivatiebrieven</h3>
      <p>
        Vraag een willekeurige LLM een motivatiebrief en je krijgt: &quot;Met veel enthousiasme reageer
        ik op de openstaande vacature van [functie] bij [bedrijf]. Mijn jarenlange ervaring in [veld] en
        mijn passie voor [iets] maken mij de ideale kandidaat...&quot;. Elke recruiter herkent dit
        nu. Het is niet schadelijk, maar het maakt geen indruk meer.
      </p>
      <p>
        CVeetje haalt de gegenereerde brief door een tweede humanizer-pass: er gaat actief gezocht naar
        AI-tells (Wikipedia&apos;s &quot;signs of AI writing&quot;-lijst is daarvoor de bron), en die
        worden herschreven naar iets dat klinkt alsof een mens het op een dinsdagavond getypt heeft.
      </p>

      <h3>4. Eerlijkheidscontroles</h3>
      <p>
        Een LLM is van nature behulpzaam. Vraag &quot;maak mijn CV nog iets sterker&quot; en het zal,
        zonder boze opzet, een claim oprekken. &quot;Hielp het marketingteam&quot; wordt &quot;leidde de
        marketingstrategie&quot;. CVeetje heeft dat patroon expliciet uit zijn prompts geschreven en
        controleert via een aparte gatekeeper-stap of een herziening eerlijke grond heeft. Dat is geen
        veiligheidstoneel — het is wat een CV bruikbaar houdt over meerdere sollicitaties heen, zonder
        dat je in een interview struikelt over iets dat groter is opgeschreven dan het was.
      </p>

      <h2>De eerlijke kant: wanneer kun je gewoon bij ChatGPT blijven</h2>
      <p>
        Solliciteer je twee keer per jaar, ben je technisch comfortabel, en vind je Word geen straf? Open
        ChatGPT, prompt netjes, kopieer-plak in een sjabloon, klaar. Je hebt CVeetje niet nodig. Het zou
        oneerlijk zijn om te suggereren van wel.
      </p>
      <p>
        Het kantelpunt zit ongeveer hier:
      </p>
      <ul>
        <li>Je solliciteert meer dan twee tot drie keer per maand.</li>
        <li>Je werkt als loopbaancoach of recruiter en maakt CV&apos;s voor anderen.</li>
        <li>Je bent zzp&apos;er en stuurt voor elke opdracht een aangepast CV mee.</li>
        <li>
          Je werkt als hiring manager of product owner en wilt je team voorzien van consistent geframed
          materiaal voor sales- of klantcontacten.
        </li>
        <li>
          Je vindt het irritant om elke keer dezelfde context te plakken, of je vindt het belangrijk dat
          je profiel ergens veilig staat en niet door je laatste vijf prompts heen waait.
        </li>
      </ul>

      <h2>De vergelijking in één tabel</h2>
      <table>
        <thead>
          <tr>
            <th>Aspect</th>
            <th>ChatGPT (Plus)</th>
            <th>CVeetje</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Profiel als datamodel</td>
            <td>Custom GPT, beperkt</td>
            <td>Gestructureerd, herbruikbaar</td>
          </tr>
          <tr>
            <td>PDF output met layout</td>
            <td>Nee — handwerk</td>
            <td>5 stijlen, klaar</td>
          </tr>
          <tr>
            <td>ATS-vriendelijk PDF</td>
            <td>Afhankelijk van Word-werk</td>
            <td>Standaard ingericht</td>
          </tr>
          <tr>
            <td>Motivatiebrief zonder AI-tells</td>
            <td>Met goede prompt redelijk</td>
            <td>Tweede humanizer-pass</td>
          </tr>
          <tr>
            <td>Eerlijkheidscontroles</td>
            <td>Geen specifieke</td>
            <td>Gatekeeper bij regeneraties</td>
          </tr>
          <tr>
            <td>Eigen DOCX template invullen</td>
            <td>Onpraktisch</td>
            <td>Upload + AI vult in</td>
          </tr>
          <tr>
            <td>Maandelijkse prijs</td>
            <td>€22 (Plus)</td>
            <td>€0 voor 1 CV / €4,99 voor 30 credits</td>
          </tr>
          <tr>
            <td>Eigen API-key gebruiken</td>
            <td>n.v.t.</td>
            <td>Ja — BYOK mode, 0 credits</td>
          </tr>
        </tbody>
      </table>

      <h2>Eén ding dat ChatGPT beter doet</h2>
      <p>
        Vrij gesprek. Als je nog niet weet of je wel solliciteert, niet zeker bent in welke richting je
        wilt, of wat voor functietitel bij je past — daar is een open chat ideaal voor. Brainstorm in
        ChatGPT, ga met het resultaat naar CVeetje als je weet waar je heen gaat. Dat is geen
        afvalstrategie; dat zijn twee tools voor twee fasen.
      </p>
    </>
  );
}
