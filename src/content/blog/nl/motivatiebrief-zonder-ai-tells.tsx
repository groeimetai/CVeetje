import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'motivatiebrief-zonder-ai-tells',
  locale: 'nl',
  title: 'Een motivatiebrief schrijven met AI zonder dat het AI-achtig klinkt',
  description:
    'De typische AI-tells in een motivatiebrief, waarom recruiters er allergisch voor zijn, en hoe je een tweede pass schrijft die het verschil maakt.',
  publishedAt: '2026-03-15',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'how-to',
  personas: ['werkzoekenden', 'zij-instromers'],
  keywords: [
    'motivatiebrief AI',
    'cover letter generator',
    'sollicitatiebrief schrijven',
    'AI tells motivatiebrief',
    'humanizer',
  ],
  author: 'niels',
  howTo: {
    name: 'Motivatiebrief schrijven zonder AI tells',
    totalTimeMinutes: 15,
    steps: [
      {
        name: 'Genereer een eerste versie',
        text: 'Plak vacature en je profiel. Laat de tool een eerste brief schrijven.',
      },
      {
        name: 'Knip de openingsalinea',
        text: 'Negen van de tien keer begint je echte verhaal bij alinea twee.',
      },
      {
        name: 'Run de humanizer-pass',
        text: 'CVeetje doet dit automatisch — buiten CVeetje: zoek zelf op AI-tells uit de checklist.',
      },
      {
        name: 'Voeg één eigenaardig detail toe',
        text: 'Een concrete observatie, een eigen mening, iets dat een chatbot nooit zou schrijven.',
      },
      {
        name: 'Lees hardop',
        text: 'Klinkt het als jou? Niet helemaal? Pas die zinnen aan.',
      },
    ],
  },
};

export function Body() {
  return (
    <>
      <p className="lede">
        Een goede motivatiebrief opent een deur die je CV alleen op een kier zet. Een slechte
        motivatiebrief sluit een deur die je CV net openhad. AI maakt het sneller, maar maakt het ook
        makkelijker om in beide richtingen tempo te maken. Dit is hoe je richting de eerste kant beweegt.
      </p>

      <h2>De typische AI-tells</h2>
      <p>
        Er zijn een paar patronen die elke moderne taalmodel automatisch produceert, en die recruiters
        inmiddels herkennen. Niet omdat AI-CV-gebruik fout is — de meeste recruiters gebruiken het zelf —
        maar omdat een onbewerkte AI-tekst een soort smaakloze beleefdheid heeft die niemand iets te
        zeggen heeft.
      </p>
      <ul>
        <li>
          <strong>De inflatieve opener.</strong> &quot;Met veel enthousiasme&quot;, &quot;Met groot
          plezier&quot;, &quot;Ik ben verheugd&quot; — het is allemaal vlees zonder smaak.
        </li>
        <li>
          <strong>De drieslag.</strong> &quot;Mijn passie voor X, mijn ervaring in Y en mijn drive om
          Z&quot;. Mensen denken niet in netjes uitgebalanceerde drielingen. Taalmodellen wel.
        </li>
        <li>
          <strong>Lege bijvoeglijke naamwoorden.</strong> &quot;Toonaangevende, innovatieve,
          dynamische&quot;. Vraag jezelf: heeft het bedrijf zichzelf ergens zo genoemd? Heb je een eigen
          mening over hoe ze écht zijn? Vervang of laat weg.
        </li>
        <li>
          <strong>Negatieve parallellie.</strong> &quot;Niet alleen X, maar ook Y&quot;. Twee keer een
          motivatiebrief vol zinnen op deze formule en je weet dat een algoritme aan het werk was.
        </li>
        <li>
          <strong>Veelvuldige em-dashes.</strong> Dit is de subtielste tell, maar consistent. Een mens
          gebruikt af en toe een gedachtestreepje. Een taalmodel zet ze om de drie zinnen neer.
        </li>
        <li>
          <strong>De slot-eufemismen.</strong> &quot;Ik kijk er enorm naar uit om te bespreken hoe ik kan
          bijdragen aan jullie team&quot;. Dat is een geforceerde glimlach in geschreven vorm.
        </li>
      </ul>

      <h2>Wat in plaats daarvan?</h2>
      <p>
        Niet automatisch beter. &quot;Menselijker schrijven&quot; is geen knop. Maar er zijn een paar
        keuzes die altijd helpen:
      </p>

      <h3>1. Begin in het midden</h3>
      <p>
        Vermijd de aanloop. Geen &quot;Ik reageer met enthousiasme op de vacature van...&quot;. Begin
        met iets specifieks. Een observatie over het bedrijf, een eigen ervaring die direct relevant is,
        een vraag die je hebt over de rol. De recruiter weet al dat je solliciteert; de eerste regel moet
        je een gezicht geven.
      </p>
      <p>
        Voorbeeld: &quot;Ik heb jullie nieuwe documentatiesite van vorige maand grondig doorgelezen — niet
        omdat ik moest, maar omdat de manier waarop jullie permissions uitleggen me opviel. Het was de
        eerste keer dat ik iemand zag erkennen dat een mental model van &lsquo;Linux groups&rsquo; in een
        SaaS-context vooral verwart. Dat is precies het soort eerlijkheid waar ik bij wil werken.&quot;
        Vergelijk dat met: &quot;Met veel enthousiasme reageer ik op uw vacature voor
        Documentation Engineer.&quot;
      </p>

      <h3>2. Eén concreet voorbeeld, gewone taal</h3>
      <p>
        In plaats van &quot;Ik heb uitgebreide ervaring met cross-functionele samenwerking&quot;, schrijf:
        &quot;In mijn vorige rol zat ik in dezelfde stand-up als design, backend en sales. Dat klonk in
        het begin als een ramp en bleek na een half jaar de reden dat onze releases stopten met
        schuiven.&quot; Het tweede klinkt als een mens die iets heeft meegemaakt.
      </p>

      <h3>3. Zeg expliciet waarom <em>deze</em> rol, niet zomaar &quot;een&quot; rol</h3>
      <p>
        Recruiters lezen dezelfde standaardbrief in allerlei smaken. &quot;Ik ben op zoek naar een
        uitdaging waar ik kan groeien&quot; is niet false, het is gewoon contextloos. Wat is er aan deze
        rol, dit team, dit bedrijf, dit moment in je carrière dat dit het logische volgende ding maakt?
        Eén alinea daarover scheelt al heel veel.
      </p>

      <h3>4. Eindig zonder de standaardformule</h3>
      <p>
        &quot;Ik kijk uit naar een gesprek waarin we verder kunnen praten over...&quot; — niemand kijkt
        écht uit. Beter: &quot;Als je nieuwsgierig bent welke kant ik op zou willen met X, bel me
        gerust.&quot; Of stop gewoon. Een brief mag eindigen waar het verhaal stopt.
      </p>

      <h2>De humanizer-pass in CVeetje</h2>
      <p>
        Voor elke motivatiebrief die CVeetje genereert is er een tweede AI-pass die de eerste
        nakijkt. De prompt voor die pass leunt op Wikipedia&apos;s &quot;Signs of AI writing&quot;-overzicht
        — een uitgebreide lijst van patronen die taalmodellen consistent neerzetten. Patronen die de
        humanizer specifiek aanpakt:
      </p>
      <ul>
        <li>Inflatieve symboliek (&quot;baken van&quot;, &quot;wereld van&quot;).</li>
        <li>Promotionele toon zonder onderbouwing.</li>
        <li>Vage verwijzingen (&quot;veel mensen zeggen&quot;, &quot;in deze tijd&quot;).</li>
        <li>De drieslag-formule.</li>
        <li>Em-dash overgebruik.</li>
        <li>Filler-zinnen (&quot;Het is belangrijk om op te merken dat&quot;).</li>
        <li>AI-vocabulaire (&quot;leverage&quot;, &quot;robuust&quot;, &quot;naadloos&quot;).</li>
        <li>Passieve constructies waar actief beter past.</li>
      </ul>
      <p>
        De pass gooit deze patronen er niet rigide uit — dat zou een nieuw, mechanisch gevoel
        produceren. De prompt vraagt om herschrijven naar &quot;wat een mens zou zeggen, niet wat een
        chatbot in een sjabloon zou neerzetten&quot;.
      </p>

      <h2>Wat je zelf moet doen</h2>
      <p>
        Drie dingen, en geen tool kan ze voor je doen:
      </p>
      <ol>
        <li>
          <strong>Lees de brief hardop.</strong> Klinkt het ergens niet als jou? Wijzig het. Een
          motivatiebrief moet kunnen passeren voor iets wat jij geschreven hebt; zo niet, dan ben je
          oneerlijk over wie je bent.
        </li>
        <li>
          <strong>Voeg één persoonlijk detail toe.</strong> Een echte voorkeur, een rare observatie, een
          mening die niet veilig is. Dit is wat een mens van een goed AI-bewerkte tekst onderscheidt.
        </li>
        <li>
          <strong>Knip waar je niets nieuws zegt.</strong> Drie pagina&apos;s motivatiebrief is teveel.
          Anderhalve pagina is het maximum, en een halve pagina is genoeg als je iets concreets te
          melden hebt.
        </li>
      </ol>

      <div className="callout callout--success">
        <div className="callout-title">Werkt het echt?</div>
        <p>
          Onze interne tests vergelijken motivatiebrieven met en zonder humanizer-pass. Recruiters die
          we lieten lezen herkenden de bewerkte brieven aanzienlijk minder vaak als
          AI-gegenereerd dan de onbewerkte versies. Het is geen perfecte oplossing — het is een
          drempelverlaging. Een mens die meeleest is altijd nog beter, en die mens ben jij.
        </p>
      </div>
    </>
  );
}
