import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'ats-cv-2026',
  locale: 'nl',
  title: 'ATS-systemen in 2026 — wat werkt wel, wat is fabel',
  description:
    'Geen pdf-fobie, geen tafelpaniek, geen onzin over witregels. Een nuchtere uitleg van hoe Nederlandse ATS-systemen je CV in 2026 echt verwerken — en wat er wél toe doet.',
  publishedAt: '2026-04-22',
  updatedAt: '2026-05-15',
  readingMinutes: 9,
  category: 'guide',
  personas: ['werkzoekenden', 'recruiters', 'zij-instromers'],
  keywords: [
    'ATS CV',
    'ATS Nederland',
    'Applicant Tracking System',
    'CV ATS-vriendelijk',
    'keywords CV',
    'recruitment software',
  ],
  author: 'editorial',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Half het internet schreeuwt sinds 2018 dat je CV niet door &quot;de ATS&quot; komt als je
        bullet-points met emoji&apos;s gebruikt of een tabel zet rond je werkervaring. De realiteit in
        Nederland in 2026 is rustiger, maar ook eerlijker dan dat. Hier is wat er echt gebeurt.
      </p>

      <h2>Wat een ATS in Nederland eigenlijk doet</h2>
      <p>
        Een Applicant Tracking System is in de eerste plaats een database. Het neemt je sollicitatie aan,
        slaat &apos;m op, koppelt &apos;m aan een vacature, en geeft de recruiter een interface om er
        doorheen te bladeren. Dat is het basisproduct. Alles wat daarbovenop zit — parsing, scoring,
        ranking — varieert enorm per systeem en per implementatie.
      </p>
      <p>
        De grote spelers in Nederlandse middel- en grootbedrijf zijn doorgaans Recruitee, Homerun,
        Workday, SuccessFactors, Greenhouse en SmartRecruiters. Een paar daarvan kennen geavanceerde
        parsing; een paar tonen je CV gewoon als PDF naast een formulier dat de kandidaat zelf invult. De
        echte score-of-rank pijn zit bij ondernemingen die op grote schaal werven — typisch
        uitzendbureaus, retail-ketens en defensie-toeleveranciers — en die de extra modules van hun ATS
        aan hebben staan.
      </p>

      <h2>Wat ATS-software in de praktijk wel verkeerd kan doen</h2>
      <ul>
        <li>
          <strong>Tekst uit kolommen door elkaar gooien.</strong> Een twee-koloms-layout wordt soms van
          links-naar-rechts gelezen, waardoor &quot;Werkervaring&quot; en je vaardighedenlijst door elkaar
          komen. Eén kolom is veiliger.
        </li>
        <li>
          <strong>Tekst in afbeeldingen niet zien.</strong> Sla je naam niet op in een grafisch banner.
          Skills-iconen mogen, maar de skill <em>naam</em> moet als echte tekst erbij staan.
        </li>
        <li>
          <strong>Vreemde fonts vervangen.</strong> Alleen relevant als het systeem je CV doorzoekbaar
          maakt door OCR — wat zelden meer gebeurt voor PDF&apos;s met text-layer.
        </li>
        <li>
          <strong>Datums niet matchen.</strong> Schrijf &quot;jan 2022 – heden&quot; of
          &quot;01/2022–nu&quot;, niet &quot;ergens halverwege twee jaar geleden&quot;. ATS-systemen
          herkennen meerdere formats, maar alleen als je consistent bent.
        </li>
      </ul>

      <h2>Mythes die we voorbij mogen laten</h2>
      <h3>1. &quot;PDF gaat niet werken — alleen .docx&quot;</h3>
      <p>
        Achterhaald. Sinds rond 2019 doen vrijwel alle moderne ATS-systemen prima met PDF. Een PDF met een
        echte tekstlaag (zoals door CVeetje gegenereerd) is meestal beter parsbaar dan een Word-document
        vol tracked changes en bullet-tekens die elke versie van Word anders rendert.
      </p>
      <p>
        Wat je <em>niet</em> wilt: een PDF die eigenlijk een scan is van een papieren CV. Dat is een
        afbeelding zonder tekstlaag. Daar struikelt elke parser over.
      </p>

      <h3>2. &quot;Tabellen zijn dodelijk&quot;</h3>
      <p>
        Genuanceerder. Een gestructureerde tabel met een logische leesrichting (rij voor rij, met
        labels) wordt door 80% van de moderne systemen prima gelezen. Een tabel die je gebruikt om een
        decoratief grid te maken — bijvoorbeeld om iconen netjes uit te lijnen — kan misgaan. CVeetje
        rendert in alle stijlen behalve Editorial en Experimental zonder tabellen; bij de creatieve
        stijlen zijn de tabellen flat en in één kolom.
      </p>

      <h3>3. &quot;Je moet keywords letterlijk overnemen&quot;</h3>
      <p>
        Half waar. Hardere keywords (functietitels, certificaten, gereedschappen) moeten exact matchen
        omdat veel systemen op letterlijke string-match werken. Zachte termen (soft skills, branche-jargon)
        worden steeds vaker semantisch gematcht; daar mag je dus variëren. Dit verandert per maand, dus
        veiligste regel: hardere keywords letterlijk, zachte termen in je eigen woorden.
      </p>

      <h3>4. &quot;ATS&apos;en wijzen je af&quot;</h3>
      <p>
        Bijna nooit. In Nederland nemen mensen beslissingen, niet machines. Een ATS sorteert, filtert,
        rangschikt — maar het is een recruiter die uiteindelijk besluit te bellen of te ghosten. Daarom
        zit de echte winst in <em>hoe makkelijk de recruiter het in zes seconden kan lezen</em>, niet in
        hoe een algoritme het scoort.
      </p>

      <div className="callout">
        <div className="callout-title">Wat dan wel?</div>
        <p>
          Een CV dat zowel door een mens als een parser in één keer goed wordt opgevat. Eén kolom voor de
          hoofdtekst, herkenbare sectie-titels (&quot;Werkervaring&quot;, &quot;Opleiding&quot;,
          &quot;Vaardigheden&quot;), consistente datum-notatie, en de vacaturetermen waar ze logisch
          passen — niet als een tag-soup onderaan, maar verweven in je rolbeschrijvingen.
        </p>
      </div>

      <h2>Hoe CVeetje het aanpakt</h2>
      <p>
        Alle vijf stijlen worden gegenereerd vanuit een gestructureerd datamodel. Daardoor blijft de
        onderliggende tekst altijd dezelfde tekst, ook in de meest creatieve stijl. De rendering naar PDF
        gebruikt Puppeteer met expliciete print-CSS — geen transforms die parsers verwarren, geen
        clip-paths die tekst onzichtbaar maken voor de tekstlaag. Hyperlinks zijn klikbaar, headings zijn
        echte headings.
      </p>
      <p>
        Specifiek voor ATS-vriendelijkheid:
      </p>
      <ul>
        <li>Eén-koloms basislayout in Conservative, Balanced en Creative.</li>
        <li>
          Editorial en Experimental gebruiken visuele kolommen, maar de PDF heeft een lineaire tekstlaag —
          parsers lezen het als één doorlopend document.
        </li>
        <li>
          Keyword-matching gebeurt aan de tekstkant: termen uit de vacature worden verweven in
          rolbeschrijvingen, niet als losse tag-lijst.
        </li>
        <li>
          Standaard headings in NL en EN, geen creatieve eufemismen voor &quot;Werkervaring&quot;.
        </li>
      </ul>

      <h2>Snelle checklist voor je eigen CV</h2>
      <div className="key-takeaways">
        <h3>ATS-gezond, mens-vriendelijk</h3>
        <ul>
          <li>PDF met echte tekstlaag — geen scan.</li>
          <li>Eén hoofdkolom voor je werkervaring.</li>
          <li>Standaard sectie-titels in de taal van de vacature.</li>
          <li>Datums consistent: &quot;mmm jjjj&quot; of &quot;mm/jjjj&quot;.</li>
          <li>Hardere keywords letterlijk uit de vacature overnemen waar ze passen.</li>
          <li>Geen tekst in afbeeldingen, geen sleutelinfo in headers/footers.</li>
          <li>Bestand max 2 MB, &quot;voornaam-achternaam-functie.pdf&quot; als bestandsnaam.</li>
        </ul>
      </div>

      <h2>Wat er in 2026 verandert</h2>
      <p>
        Steeds meer Nederlandse werkgevers koppelen een LLM aan hun ATS voor semantische matching. Dat
        klinkt eng, maar betekent in de praktijk dat je iets minder hoeft te puzzelen met keywords — de
        match wordt soepeler. Tegelijk komen er meer disclaimers vanuit AI Act-naleving: een &quot;Ik ben
        beoordeeld door een algoritme, klopt dat?&quot;-knop wordt vaker zichtbaar. De
        Autoriteit Persoonsgegevens publiceerde in 2024 al richtlijnen die in 2025 zijn geformaliseerd in
        de EU AI Act voor recruitmenttoepassingen.
      </p>
      <p>
        Voor jou als kandidaat verandert weinig fundamenteels. Een eerlijk, goed gestructureerd, gericht
        CV blijft de basis. Wat verandert is dat het minder vergevingsgezind wordt richting algemene
        massa-CV&apos;s — de match-score van die documenten wordt zichtbaarder, en lager.
      </p>
    </>
  );
}
