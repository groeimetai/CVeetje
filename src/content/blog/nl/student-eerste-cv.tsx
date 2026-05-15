import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'student-eerste-cv',
  locale: 'nl',
  title: 'Je eerste CV als student: wat erop moet als je nog niet veel hebt gedaan',
  description:
    'Voor een stage, een bijbaan, of die eerste echte rol na je studie. Hoe je een CV maakt dat klopt zonder dat je er ervaring bijvouw.',
  publishedAt: '2026-01-28',
  updatedAt: '2026-05-15',
  readingMinutes: 6,
  category: 'how-to',
  personas: ['studenten'],
  keywords: ['student CV', 'eerste CV', 'stage CV', 'bijbaan CV', 'CV zonder ervaring'],
  author: 'editorial',
};

export function Body() {
  return (
    <>
      <p className="lede">
        De grootste fout op een studenten-CV is niet &quot;te kort&quot;. Het is &quot;te vol&quot;
        gemaakt met dingen die er niet thuishoren. Een korte, eerlijke pagina werkt beter dan twee
        pagina&apos;s opvulwerk. Hier is hoe je &apos;m maakt.
      </p>

      <h2>Wat een werkgever bij een student écht wil zien</h2>
      <ol>
        <li>
          <strong>Dat je weet wat je wilt.</strong> Een richting, een interesse, een &quot;ik wil dit
          omdat...&quot;. Niet vaag, niet opgeklopt.
        </li>
        <li>
          <strong>Dat je kunt nadenken.</strong> Bewijs daarvan zit in projecten — bijvakken, vakken
          waar je veel uit haalde, persoonlijke initiatieven, scriptie-onderwerp.
        </li>
        <li>
          <strong>Dat je verantwoordelijkheid kan dragen.</strong> Bewijs zit in bijbanen, vrijwilligerswerk,
          commissies. &quot;Verkoopmedewerker bij Albert Heijn&quot; is een veel sterker punt dan
          studenten denken — het toont dat je werkbaar bent met klanten, voorraad en collega&apos;s.
        </li>
      </ol>

      <h2>Wat er niet op moet</h2>
      <ul>
        <li>
          <strong>Een lijst van alle vakken die je hebt gevolgd.</strong> Te lang, niemand leest het. Je
          opleiding plus richting plus een of twee specialisaties is genoeg.
        </li>
        <li>
          <strong>Generieke hobby&apos;s.</strong> &quot;Lezen, films kijken, vrienden zien&quot;. Dat
          doet iedereen. Of laat het weg, of zet er één ding neer dat iets over je zegt.
        </li>
        <li>
          <strong>Een &quot;professionele&quot; foto die geforceerd is.</strong> Een rustige, recent
          gemaakte foto in normale kleding is beter dan een geposeerde portret-shoot. Geen foto mag ook —
          beide is prima.
        </li>
        <li>
          <strong>Skills die je een keer hebt aangeraakt.</strong> Heb je een SQL-cursus gevolgd? Schrijf
          niet &quot;SQL&quot; bij je vaardigheden alsof je &apos;m beheerst. Schrijf &quot;Basis SQL
          (cursus DataCamp, 2024)&quot; — eerlijker, beter onthouden.
        </li>
      </ul>

      <h2>De opbouw die werkt voor 90% van de studenten</h2>
      <h3>1. Kop met contact</h3>
      <p>
        Naam, woonplaats (geen straatadres nodig), e-mail, telefoonnummer, LinkedIn-link als die
        compleet is. Optioneel: GitHub voor technische studenten, portfolio voor creatieve.
      </p>

      <h3>2. Profiel — twee à drie zinnen</h3>
      <p>
        Niet &quot;Enthousiaste studente met passie voor uitdagingen&quot;. Wel: &quot;Vierdejaars
        bedrijfskunde-studente aan de UvA met een interesse in supply chain en datavraagstukken. Volg dit
        jaar een minor in operations research en zoek een stage waar ik analytisch werk met
        klantcontact kan combineren.&quot;
      </p>
      <p>
        Specifiek &gt; vaag. Altijd.
      </p>

      <h3>3. Opleiding</h3>
      <p>
        Huidige opleiding bovenaan, eerder afgeronde opleidingen daaronder. Niveau, naam, instelling,
        periode. Eén zin per opleiding over richting of specialisatie. Geen vakkenlijsten — tenzij een
        specifiek vak super relevant is voor de rol waar je solliciteert.
      </p>

      <h3>4. Relevante ervaring</h3>
      <p>
        Dit is jouw vrijheid. Hier zet je wat past bij de rol. Stage&apos;s, projecten, bestuurservaring,
        commissies, vrijwilligerswerk, eigen ondernemingen. Per item: titel, organisatie, periode, twee
        bullets met wat je hebt gedaan of bereikt.
      </p>

      <h3>5. Bijbanen — apart als ze niet direct relevant zijn</h3>
      <p>
        &quot;Werkervaring tijdens studie&quot; als header. Albert Heijn, Jumbo, horeca, callcenter,
        bijles. Eén regel per baan, geen dikke bullets. Werkgevers herkennen direct dat je
        verantwoordelijkheid hebt gedragen — uitvergroten is niet nodig.
      </p>

      <h3>6. Vaardigheden</h3>
      <p>
        Drie tot zes vaardigheden, met niveau erbij. Talen apart vermelden (Nederlands moedertaal,
        Engels C1, etc.). Software/tools met realistische niveau-aanduiding.
      </p>

      <h3>7. Iets persoonlijks (optioneel)</h3>
      <p>
        Eén regel onderaan met iets dat een gesprek opent. &quot;Doe sinds drie jaar aan klimsporten,
        bouw in mijn vrije tijd kleine tools voor sport-statistieken.&quot; Eén concrete hobby is sterker
        dan vijf generieke.
      </p>

      <h2>Stage-specifieke versies</h2>
      <p>
        Voor een stage-sollicitatie geldt: leg meer gewicht op je projecten en cursusinhoud, minder op
        bijbanen. Een bedrijfskunde-student die bij McKinsey wil stagelopen, mag best vooraan zetten dat
        ze haar minor analytics had en een onderzoek deed naar prijselasticiteit van Bol.com-producten.
        Dat is concreet, het laat &quot;ik kan analytisch denken&quot; zien zonder dat ze het hoeft te
        roepen.
      </p>

      <div className="callout">
        <div className="callout-title">Praktisch met CVeetje</div>
        <p>
          Voor een student CV is Balanced of Conservative meestal de juiste stijl. Creative kan voor een
          creatieve studie of stage werken (kunsten, design, communicatie). Houd Editorial en
          Experimental voor portfolio&apos;s — die zijn voor mensen die al een visueel statement willen
          maken.
        </p>
      </div>

      <h2>Eén ding wat studenten vaak missen</h2>
      <p>
        Een vacature voor een student of starter wordt meestal gelezen door een recruiter die <em>twintig
        andere</em> studentensollicitaties leest. De meeste lijken op elkaar — vergelijkbare opleiding,
        vergelijkbare bijbanen, vergelijkbare vakanties in Bali. Wat de stapel doorbreekt is één concreet
        verhaal. Eén project waar je trots op bent, met wat je hebt gemaakt en geleerd. Eén stuk
        eigenheid in je profiel. Niet meer.
      </p>
    </>
  );
}
