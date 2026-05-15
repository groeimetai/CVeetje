import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'product-owner-team-cvs',
  locale: 'nl',
  title: 'Als product owner schrijf ik mijn team&apos;s CV&apos;s niet meer zelf — wat ik wel doe',
  description:
    'Een blik vanuit een PO-rol. Waarom je team-CV&apos;s voor sales- en klantcontacten consistent moet houden, en hoe je dat zonder microbeheer aanpakt.',
  publishedAt: '2026-02-05',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'perspective',
  personas: ['product-owners', 'hiring-managers'],
  keywords: [
    'team CV',
    'product owner workflow',
    'CV consultancy sales',
    'consultant CV',
    'CV consistency',
  ],
  author: 'team',
};

export function Body() {
  return (
    <>
      <p className="lede">
        In consultancy en in agile teams die met klanten werken bestaat een onzichtbare taak: het
        bijhouden van team-CV&apos;s. Geen sollicitatie, geen interne HR — gewoon: een klant vraagt
        &quot;mag ik de CV&apos;s zien van wie er aan ons project gaat werken?&quot; en dan is het
        verschrikkelijk als er drie afwijkende lay-outs uit de map rollen.
      </p>

      <h2>Het stille probleem</h2>
      <p>
        In de meeste consultancy- en bureauomgevingen ligt er een gedeelde Drive met &quot;CV&apos;s -
        team&quot;, en daar staan documenten in die over drie jaar zijn meegerold. Eén iemand heeft in
        2022 een sjabloon gemaakt, twee mensen volgden het, vier mensen hebben hun versie zelf opgemaakt
        in Word, één heeft een prachtige Canva-versie maar die past niet bij de huisstijl. En wanneer
        een klant <em>nu</em> de CV&apos;s vraagt, ben jij — als PO of project lead — een uur kwijt aan
        styling-werk dat niet jouw werk is.
      </p>
      <p>
        Het tweede probleem: per klant moeten ze gericht zijn. Een fintech-klant wil andere
        accenten zien dan een retail-klant. Maar je gaat geen vijf collega&apos;s vragen om hun CV een
        beetje anders te framen voor deze opdracht. Dat is asocial werk.
      </p>

      <h2>Mijn workflow nu</h2>
      <p>
        Onze leadgeneration runt al een tijd op CVeetje. De opzet is simpeler dan ik had verwacht.
      </p>

      <h3>Stap 1: één gedeelde template, één keer ingericht</h3>
      <p>
        We hebben de Conservative-stijl als basis genomen en daar onze huisstijl-kleuren in gebrand —
        een ding dat je in CVeetje kunt aanpassen aan kleurniveau via een eigen DOCX-template. Resultaat:
        een nuchter, getypeerd CV dat past bij hoe we onszelf positioneren.
      </p>

      <h3>Stap 2: profielen één keer per persoon</h3>
      <p>
        Elk teamlid heeft een profiel ingericht. Echte werkervaring, certificaten, projecten waar ze op
        gewerkt hebben, één samenvatting per persoon. Dat onderhoud doen zij zelf, ik bemoei me er niet
        mee.
      </p>

      <h3>Stap 3: per klant, één centrale generatie</h3>
      <p>
        Wanneer een nieuwe klant CV&apos;s vraagt, kopieer ik de beschrijving van wat ze willen (vaak
        gewoon de mail of het projectdocument) en genereer ik per teamlid een variant. Vijf
        teamleden, vijf CV&apos;s, allemaal in dezelfde lay-out, met de juiste framing voor deze
        opdracht. Tijd: ongeveer een kwartier voor het hele team.
      </p>

      <h3>Stap 4: de mensen kijken zelf hun versie na</h3>
      <p>
        Dit deel is belangrijk. Ik genereer de eerste versie, het teamlid leest het, corrigeert wat niet
        klopt, en stuurt het terug. Niemand wordt gepubliceerd zonder eigen check. Dat is een eis vanuit
        respect, niet vanuit beleid.
      </p>

      <h2>Wat dit voor de klant doet</h2>
      <p>
        Vijf consistente CV&apos;s, met dezelfde lay-out, dezelfde diepte, en zichtbare relevantie voor
        hun opdracht — dat is een ander leesgevoel dan een willekeurige verzameling Word-documenten. Het
        signaleert: dit is een team dat werkt vanuit een gemeenschappelijke standaard. Voor je het weet
        leg je een hoger uurtarief uit.
      </p>

      <h2>Wat dit voor het team doet</h2>
      <p>
        Hier zit eigenlijk de grotere winst. Mensen vragen niet meer &quot;mag ik mijn CV ergens
        vinden?&quot; — er is altijd een actuele versie. Mensen schrijven niet meer hun motivatiebrief
        bij een interne acquisitie helemaal opnieuw — er ligt al een sterke basis. Mensen zijn niet meer
        bang om opeens hun CV te moeten oversturen — ze hoeven alleen maar te zeggen welke klant en welke
        framing.
      </p>

      <div className="callout">
        <div className="callout-title">Hidden cost je niet ziet</div>
        <p>
          Voor ik dit zo had ingericht, kostte iedere klantvraag &quot;mag ik de CV&apos;s zien?&quot;
          mij gemiddeld twee uur. Vermenigvuldig dat met het aantal nieuwe klanten per kwartaal en je
          ziet dat dit een serieuze tijdsinvestering elimineerde. Niet de meest sexy ROI, maar wel echt.
        </p>
      </div>

      <h2>Een paar kleinere observaties</h2>
      <ul>
        <li>
          Voor consultancy-CV&apos;s wint Conservative bijna altijd. Editorial of Experimental zegt
          &quot;ik ben uniek&quot; — wat we juist niet willen overbrengen aan een nieuwe corporate klant
          die ons als &quot;veilige keuze&quot; moet ervaren.
        </li>
        <li>
          De Power-pack credits (600 voor €59,99) zijn voor dit type gebruik ontworpen. Op één
          klant-aanvraag draaien we soms tien CV-generaties; per maand zit je dan al snel op een paar
          honderd credits.
        </li>
        <li>
          Op platform credits (Claude Opus) kost een volledige CV-generatie ongeveer negen credits. Met
          BYOK en je eigen API-key kost het niets aan onze kant — alleen je eigen Claude/OpenAI factuur.
          Voor teams die strict zijn over data-flows is BYOK het schonere model.
        </li>
      </ul>

      <h2>Wat ik anders zou doen, achteraf</h2>
      <p>
        Twee dingen. Ten eerste: ik zou eerder zijn begonnen om alle teamleden hun eigen profiel zelf in
        te richten. Mijn eerste reflex was &quot;ik doe het wel even voor iedereen&quot; — een PO-reflex.
        Maar het levert betere profielen op als mensen het zelf doen, en het verlost mij van een rol die
        ik niet wilde.
      </p>
      <p>
        Ten tweede: we hadden eerder onze huisstijl-DOCX moeten uploaden. Bij Conservative kun je
        een eigen template gebruiken — de AI vult dan jouw lay-out in plaats van een standaardstijl. Een
        klein detail, maar het is wat ons CV-pakket van &quot;snel ingericht&quot; naar &quot;dat is
        echt ons huis&quot; bracht.
      </p>
    </>
  );
}
