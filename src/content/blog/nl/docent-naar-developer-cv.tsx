import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'docent-naar-developer-cv',
  locale: 'nl',
  title: 'Van docent naar developer: hoe ik mijn CV opnieuw heb leren framen',
  description:
    'Een career-switch verhaal. Wat ik probeerde, wat niet werkte, en hoe ik mijn klaslokaal-ervaring leerde vertalen naar wat een tech-recruiter wil lezen.',
  publishedAt: '2026-02-20',
  updatedAt: '2026-05-15',
  readingMinutes: 8,
  category: 'perspective',
  personas: ['zij-instromers', 'herintreders'],
  keywords: [
    'career switch',
    'zij-instromer CV',
    'docent naar developer',
    'overstap maken',
    'CV omschrijven',
  ],
  author: 'team',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Een gebruiker (laten we hem Bart noemen, met toestemming) deelde zijn switch-traject met ons. Hij
        gaf in 2020 zijn baan als geschiedenisdocent op om backend developer te worden, en gebruikte
        CVeetje voor de eindfase van zijn sollicitatieronde in 2025. Dit is wat hij erover schreef, met
        onze opmerkingen ertussendoor.
      </p>

      <h2>Bart&apos;s probleem in één zin</h2>
      <blockquote>
        &quot;Ik had drie jaar zelfstudie en een half jaar bootcamp achter de rug, en mijn CV las als dat
        van een leraar die ook een beetje codeerde. Dat is wat het wás, maar het was niet wat ik wilde
        verkopen.&quot;
      </blockquote>
      <p>
        Dit is het kernprobleem van elke career-switcher. Je oude rol is groot — letterlijk in jaren,
        ervaring, verantwoordelijkheid. Je nieuwe richting is klein in volume maar groot in intentie.
        Als je het in chronologische volgorde neerzet, krijgt de recruiter eerst tien jaar leraarschap,
        dan zes maanden bootcamp, dan een wens om developer te worden. Dat klinkt als een dagdroom, niet
        als een kandidaat.
      </p>

      <h2>Wat hij eerst probeerde (en wat niet werkte)</h2>
      <h3>De omgekeerde chronologie</h3>
      <p>
        &quot;Eerst zette ik mijn bootcamp en zelfstudie bovenaan, daarna pas mijn jaren als docent. Maar
        dan klopte de tijdlijn niet — een bootcamp van zes maanden in 2024 staat boven een functie van
        2014–2024. Een recruiter ziet dat en denkt: deze persoon manipuleert de volgorde, wat probeert hij
        te verbergen?&quot;
      </p>
      <p>
        Klopt. Recruiters zijn gewend aan reverse-chronologie. Een onverwachte volgorde leest als een
        rode vlag, niet als slimme framing.
      </p>

      <h3>De skill-soup</h3>
      <p>
        &quot;Toen vulde ik bovenaan een dikke skills-sectie: JavaScript, TypeScript, Node.js, React,
        PostgreSQL, Docker, Git, CI/CD. Klonk alsof ik tien jaar ontwikkelaar was geweest.&quot;
      </p>
      <p>
        Klonk overcompensatie. Dezelfde recruiters die we hebben gesproken voor onze
        recruiter-perspectief-stuk zeiden: zodra een junior-kandidaat een skills-lijst neerzet die
        senioriteit suggereert, ga je extra kritisch lezen. Verwachtingsmismatch werkt tegen je.
      </p>

      <h2>Wat uiteindelijk werkte</h2>
      <p>
        Bart kwam uit op een opbouw die er ongeveer zo uitziet:
      </p>
      <ol>
        <li>
          <strong>Een profielsamenvatting die de switch erkent, niet verbergt.</strong> &quot;Voormalig
          docent geschiedenis (10 jaar) die in 2023 fulltime is overgestapt naar software engineering. Na
          drie jaar zelfstudie en een intensieve bootcamp werk ik nu aan eigen projecten in TypeScript en
          Python. Zoek een junior of medior backend-rol waar nieuwsgierigheid even welkom is als
          ervaring.&quot;
        </li>
        <li>
          <strong>Bovenaan: projecten, niet werkervaring.</strong> Drie eigen projecten met code op
          GitHub, elk een paragraaf. Wat het is, wat het oplost, welke stack, wat hij eraan heeft
          geleerd. Voor een career-switcher zijn projecten een sterkere indicator dan een
          bootcamp-certificaat.
        </li>
        <li>
          <strong>De bootcamp als rol-met-resultaat.</strong> Niet &quot;Codaisseur Bootcamp 2024&quot;
          maar &quot;Backend Developer Trainee — Codaisseur — 2024 (6 maanden)&quot; met daaronder twee
          bullets over wat hij heeft gebouwd. Bootcamps zijn echte werkomgevingen, behandel ze zo.
        </li>
        <li>
          <strong>Docentschap als &quot;onderwijservaring met
          transferable skills&quot;.</strong> Niet weggemoffeld, niet gemarginaliseerd. Eén stevige sectie
          met daaronder vier bullets die heel specifiek zijn over wat hij in een klaslokaal heeft geleerd
          dat doorbloedt in development: complexe materie uitleggen, kritisch denken bij studenten
          stimuleren, technische infrastructuur opzetten voor een schoolbreed digitaal toetsplatform,
          eigen lesmateriaal gemaakt met Markdown + Pandoc.
        </li>
        <li>
          <strong>De infrastructuur-bullet als bewijspunt.</strong> Het feit dat hij op zijn school
          intern de toetsinfra had opgezet (met PHP en MariaDB) is wezenlijk: dat is echte
          development-ervaring, alleen niet onder die titel. Door het er expliciet uit te halen, kreeg
          zijn docent-ervaring een second-life als development-relevant materiaal.
        </li>
      </ol>

      <h2>Hoe CVeetje hierbij hielp</h2>
      <p>
        Bart had alles wat hierboven staat al in zijn hoofd. Wat hem stagneerde was: hoe maak ik per
        sollicitatie een variant zonder elke keer drie uur te vechten met Word? Met CVeetje hoefde hij
        zijn profiel maar één keer goed in te richten — met expliciete project-bullets, een eerlijke
        switch-samenvatting, en de gestructureerde data van zowel zijn docent-jaren als zijn
        development-projecten. Daarna:
      </p>
      <ul>
        <li>
          Voor een startup-rol gebruikte hij de Balanced stijl en liet de project-bullets meer
          gewichts krijgen.
        </li>
        <li>
          Voor een rol bij een opleidingsinstituut benadrukte hij juist de educatie-cross-over en zette
          Conservative aan.
        </li>
        <li>
          Voor een traineeship voor career-switchers expliciet werd de docent-jaren weer voorin gezet,
          omdat dat &apos;m juist een sterke kandidaat maakte voor die rol.
        </li>
      </ul>
      <p>
        &quot;Ik genereerde zes varianten in een week. Op de oude manier had ik er één geschreven en de
        rest had ik klakkeloos teruggebruikt.&quot;
      </p>

      <h2>Wat we eruit halen voor andere switchers</h2>
      <div className="key-takeaways">
        <h3>Patroon voor career-switch CV&apos;s</h3>
        <ul>
          <li>
            Erken de switch in de eerste twee zinnen. Verbergen verzwakt. Eerlijkheid versterkt.
          </li>
          <li>
            Geef projecten boven werkervaring een prominente plek — vooral als je weinig betaalde
            ervaring hebt in de nieuwe richting.
          </li>
          <li>
            Behandel je bootcamp of opleiding als rol met outcomes, niet als regeltje onder
            &quot;Opleiding&quot;.
          </li>
          <li>
            Vis in je oude rol naar transferable bewijsstukken. Bijna iedereen heeft ze. Iemand uit de
            zorg die een planningstool heeft gebouwd. Een leraar die een toetsplatform optuigde. Een
            verkoper die een dashboard maakte. Dat is je second-life materiaal.
          </li>
          <li>
            Pas je framing aan per vacature, maar laat de feiten gelijk. Een switch-CV staat of valt
            met variabele framing op identieke ervaring.
          </li>
        </ul>
      </div>

      <p>
        Bart heeft uiteindelijk een rol gevonden bij een fintech in Utrecht. Junior backend. Hij is daar
        nu een jaar bezig en zit aan de grens van medior. Zijn oude collega&apos;s op school sturen
        hem nog steeds vragen over hun digibord. Hij beantwoordt ze. Het hoort er allemaal bij.
      </p>
    </>
  );
}
