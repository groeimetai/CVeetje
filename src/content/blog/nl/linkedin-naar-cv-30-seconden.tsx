import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'linkedin-naar-cv-30-seconden',
  locale: 'nl',
  title: 'Van LinkedIn-export naar afgewerkt CV in 30 seconden — wat er precies gebeurt',
  description:
    'De LinkedIn-PDF van je profiel als startpunt. Wat de parser eruit haalt, wat &apos;m verbaast, en hoe je &apos;m helpt met een paar handmatige aanvullingen.',
  publishedAt: '2025-12-20',
  updatedAt: '2026-05-15',
  readingMinutes: 6,
  category: 'how-to',
  personas: ['werkzoekenden', 'studenten', 'zij-instromers'],
  keywords: [
    'LinkedIn naar CV',
    'LinkedIn export CV',
    'LinkedIn PDF profiel',
    'CV uit LinkedIn',
  ],
  author: 'team',
  howTo: {
    name: 'LinkedIn-profiel omzetten naar CV met CVeetje',
    totalTimeMinutes: 5,
    steps: [
      {
        name: 'Exporteer je LinkedIn-profiel als PDF',
        text: 'Op je eigen profiel → Meer → Opslaan als PDF. Download het bestand.',
      },
      {
        name: 'Upload in CVeetje',
        text: 'Bij profiel inrichten kies je &quot;LinkedIn-PDF&quot; en upload je het bestand.',
      },
      {
        name: 'Wacht 10–30 seconden',
        text: 'De parser leest je werkervaring, opleidingen, vaardigheden, certificaten en talen.',
      },
      {
        name: 'Controleer en vul aan',
        text: 'Geboortedatum, nationaliteit en hobbies komen niet uit LinkedIn — vul ze handmatig aan als je ze op je CV wilt.',
      },
      {
        name: 'Genereer eerste CV',
        text: 'Plak een vacature en klik op genereren. Je hebt je eerste CV in ongeveer twee minuten.',
      },
    ],
  },
};

export function Body() {
  return (
    <>
      <p className="lede">
        De meeste mensen hebben hun werkervaring al ergens netjes staan — op LinkedIn. Dat is een goede
        startpositie. Hier is wat er gebeurt als je die PDF erin gooit, en wat je daarna nog moet doen.
      </p>

      <h2>Eerst: hoe je die PDF haalt</h2>
      <p>
        Ga op LinkedIn naar je eigen profiel. Klik op &quot;Meer&quot; (onder je profielfoto) en kies
        &quot;Opslaan als PDF&quot;. Het bestand wordt direct gedownload — meestal heet het
        &quot;Profile.pdf&quot; of &quot;Profiel.pdf&quot;.
      </p>
      <p>
        Dit is geen recente uitvinding van LinkedIn maar bestaat al jaren. Wat veel mensen niet weten is
        dat deze PDF behoorlijk gestructureerd is: kopjes, datumvelden, taalblokken — allemaal in een
        formaat dat een parser kan herkennen.
      </p>

      <h2>Wat de parser eruit haalt</h2>
      <p>
        CVeetje&apos;s LinkedIn-parser pakt het volgende automatisch op:
      </p>
      <ul>
        <li>Naam, locatie, contactgegevens.</li>
        <li>Profielsamenvatting (de &quot;Info&quot;-sectie).</li>
        <li>
          Werkervaring, in chronologische volgorde. Per rol: titel, bedrijf, periode, beschrijving.
        </li>
        <li>Opleiding: instelling, richting, periode.</li>
        <li>Vaardigheden — inclusief de onderverdeling die LinkedIn er soms zelf op zet.</li>
        <li>Certificaten met datum en uitgever.</li>
        <li>Talen met niveau.</li>
        <li>Vrijwilligerswerk.</li>
        <li>Publicaties en projecten — als je die hebt ingevuld.</li>
        <li>Geboortedatum — sinds een update in 2026 wordt deze ook opgepikt als die in je profiel staat.</li>
      </ul>

      <h2>Wat NIET automatisch komt</h2>
      <p>
        Een paar dingen vereisen handmatige aanvulling, omdat LinkedIn ze niet structureel exporteert of
        omdat ze daar niet horen te staan:
      </p>
      <ul>
        <li>
          <strong>Nationaliteit.</strong> LinkedIn vraagt er niet om. In CVeetje vul je &apos;m los in,
          omdat sommige Nederlandse CV&apos;s hem vragen.
        </li>
        <li>
          <strong>Burgerlijke staat.</strong> Hoort sowieso niet meer op een modern CV — laat &apos;m
          gerust weg.
        </li>
        <li>
          <strong>Concrete project-resultaten.</strong> Wat op LinkedIn staat is vaak een algemene
          beschrijving. Voor een gericht CV wil je per rol weten wat je échte impact was. Voeg dat handmatig
          toe — de tool helpt je later met framing, maar de feiten komen van jou.
        </li>
        <li>
          <strong>Een foto.</strong> Standaard is geen foto op het CV. Wil je er één, dan upload je een
          aparte. Je LinkedIn-foto wordt niet automatisch overgenomen — privacyreden.
        </li>
        <li>
          <strong>Recent persoonlijk werk.</strong> Open source-projecten, side-projects, eigen
          ondernemingen — alles wat je niet op LinkedIn hebt staan, voeg je los toe.
        </li>
      </ul>

      <h2>Veel gemaakte fouten met LinkedIn-imports</h2>
      <h3>1. Een lege LinkedIn</h3>
      <p>
        Als je profiel uit drie rolregels en geen beschrijvingen bestaat, krijg je een lege grondstof.
        Pas dat eerst aan. Tien minuten op LinkedIn investeren bespaart je een uur in het inrichten van je
        CV.
      </p>

      <h3>2. Verouderde rollen niet opschonen</h3>
      <p>
        Een baan van negen jaar geleden die niemand meer interesseert moet eruit, of in elk geval kort
        worden. Dat is niet aan LinkedIn — dat is aan het CV. Goed nieuws: in CVeetje gebeurt dat
        automatisch tijdens je profielinrichting. Oude rollen worden tot één regel ingekort als ze niet
        relevant lijken voor wat je nu zoekt.
      </p>

      <h3>3. De stille LinkedIn-bullshit</h3>
      <p>
        LinkedIn heeft een eigen taal: &quot;mensen verbinden&quot;, &quot;passie voor data&quot;,
        &quot;servant leader&quot;. Een AI-parser nemen die letterlijk over. Maar in een CV is dat zwak.
        De tool zal proberen om bij CV-generatie er concreetere taal van te maken — maar lees je
        profielsamenvatting in CVeetje een keer goed door en herschrijf wat te wattenachtig klinkt.
      </p>

      <div className="callout">
        <div className="callout-title">Wat als je geen LinkedIn hebt?</div>
        <p>
          Geen probleem. Je kunt je profiel handmatig invullen — een wizard leidt je erdoorheen — of
          een bestaand CV (PDF) uploaden en daar starten. Een Word-CV kan ook, maar PDF is robuuster
          omdat de tekstlaag stabieler is.
        </p>
      </div>

      <h2>Na de import: het echte werk</h2>
      <p>
        De import duurt twintig tot dertig seconden. Daarna heb je nog drie momenten waarop je iets
        moet doen:
      </p>
      <ol>
        <li>
          <strong>Lees je profielsamenvatting.</strong> Klopt het, klinkt het als jou, is het specifiek
          genoeg?
        </li>
        <li>
          <strong>Vul concrete bewijsstukken aan.</strong> Per recente rol één à twee bullets met
          meetbare uitkomsten. Niet voor élke rol — alleen waar het kan.
        </li>
        <li>
          <strong>Update je vaardigheden naar wat je nu doet.</strong> Niet alle 47 die LinkedIn heeft
          opgeslagen — de top vijf à zes die je in 2026 echt gebruikt.
        </li>
      </ol>
      <p>
        Tien minuten, en je profielgrondstof is een sterke basis voor onbeperkt veel sollicitatie-CV&apos;s
        in de komende maanden.
      </p>
    </>
  );
}
