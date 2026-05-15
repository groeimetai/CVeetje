import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'gatekeeper-eerlijkheid',
  locale: 'nl',
  title: 'Waarom een AI-CV-tool moet kunnen zeggen &quot;nee, dat klopt niet&quot;',
  description:
    'Over de gatekeeper-stap die voor elke regeneratie checkt of een wijziging eerlijke grond heeft. Hoe het werkt en waarom het bestaat.',
  publishedAt: '2025-11-22',
  updatedAt: '2026-05-15',
  readingMinutes: 6,
  category: 'opinion',
  personas: ['werkzoekenden', 'recruiters'],
  keywords: ['AI eerlijkheid CV', 'CV verzonnen ervaring', 'dispute flow', 'CV controleren', 'CVeetje gatekeeper'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        De makkelijkste manier om een AI-CV-tool slechte naam te bezorgen is door &apos;m alles te laten
        bevestigen wat de gebruiker vraagt. Een tool die ja zegt op &quot;maak het sterker&quot; zonder
        controle, levert binnen drie maanden CV&apos;s waar in de eerste interviewminute al iemand op
        struikelt. We hebben daar een specifieke stap voor ingebouwd. Hier is hoe &apos;m werkt en
        waarom &apos;m belangrijker is dan &apos;t lijkt.
      </p>

      <h2>Het probleem in één zin</h2>
      <p>
        Een groot taalmodel is van nature hulpvaardig. Vraag &quot;kun je dit nog krachtiger maken?&quot;
        en het zal — zonder boze opzet — verschuiven van wat er staat naar wat ervan gemaakt kan worden.
        &quot;Was betrokken bij&quot; wordt &quot;leidde&quot;. &quot;Heeft meegewerkt aan&quot; wordt
        &quot;was verantwoordelijk voor&quot;. Klein verschil per zin, groot verschil over een heel CV.
      </p>
      <p>
        In een sollicitatiegesprek komt dat terug. &quot;Je schrijft dat je het project geleid hebt — kun
        je iets vertellen over hoe je het team aanstuurde?&quot; — en dan zit je. Voor één rol misschien
        oplosbaar, maar het gevoel bij de recruiter is geknakt vertrouwen.
      </p>

      <h2>De dispute-flow</h2>
      <p>
        Wanneer een gebruiker een gegenereerd CV ziet en het ergens niet mee eens is, kan hij op
        &quot;niet eens&quot; klikken. Daar leg je uit waarom — bijvoorbeeld &quot;ik heb dit project
        niet alleen, maar in een team van vier gedaan&quot; of &quot;deze technologie heb ik wel
        aangeraakt, maar gebruik &apos;m niet productief&quot;.
      </p>
      <p>
        Voor er een herziening wordt gegenereerd, kijkt een aparte AI-call mee:
      </p>
      <ul>
        <li>
          Heeft de gebruiker een legitiem punt? (&quot;Ik heb dat project niet gedaan&quot; — ja.)
        </li>
        <li>
          Probeert de gebruiker een claim op te <em>rekken</em>? (&quot;Schrijf &lsquo;leidde
          team&rsquo; in plaats van &lsquo;werkte in team&rsquo;&quot; — twijfelachtig, vraag om
          bewijsstuk.)
        </li>
        <li>
          Is het een neutrale opmaak- of toonwijziging? (&quot;Dit klinkt te formeel&quot; — vrij voor
          herziening.)
        </li>
      </ul>

      <h2>Drie soorten beslissingen</h2>
      <h3>1. Honoreren</h3>
      <p>
        De gebruiker heeft een feitelijk argument. Bijvoorbeeld: &quot;Ik werkte daar van 2019 tot 2022,
        niet 2018 tot 2022&quot;. Of: &quot;Deze rol was geen senior, ik was medior.&quot; De herziening
        gaat door, kosteloos. Het zou onfatsoenlijk zijn om credits te rekenen voor een correctie van een
        AI-fout.
      </p>

      <h3>2. Bewijslast vragen</h3>
      <p>
        De gebruiker vraagt een opwaardering. Bijvoorbeeld: &quot;Schrijf dat ik het team leidde, niet
        dat ik meedeed&quot;. De tool vraagt: heb je bewijs van leiderschap in deze rol? Heb je
        bijvoorbeeld iets in je oorspronkelijke werkervaring-omschrijving waar dat uit blijkt? Als de
        gebruiker het bewijs aanlevert, gaat de herziening door. Zo niet, dan blijft de claim op het
        oorspronkelijke niveau.
      </p>

      <h3>3. Weigeren met uitleg</h3>
      <p>
        Een uitgesproken poging om iets onwaars erin te krijgen. Bijvoorbeeld: &quot;Voeg toe dat ik
        Kubernetes-clusters beheerde&quot; terwijl daar niets van in het oorspronkelijke profiel staat.
        De tool weigert en legt uit waarom — niet als een verwijt, maar als &quot;dit kunnen we niet
        verantwoorden, dit komt vroeg of laat terug in een interview&quot;.
      </p>

      <div className="callout">
        <div className="callout-title">De rationale in één regel</div>
        <p>
          We willen dat een CVeetje-CV iets is wat je rustig kunt verdedigen. Niet een document waarvan
          je drie dagen later denkt &quot;hoe leg ik dit uit als ze ernaar vragen?&quot;.
        </p>
      </div>

      <h2>Hoe je dit als gebruiker ervaart</h2>
      <p>
        Negen van de tien gebruikers merken er niets van. Een wijzigingsverzoek dat eerlijke grond heeft
        gaat zonder vragen door. Het 10%-geval — waar je probeert iets sterker te maken dan het is —
        krijgt een vriendelijk &quot;heb je hier bewijs voor?&quot;-pop-up. Dat voelt voor sommigen als
        bemoeizucht. Voor anderen — en dat is de meerderheid die we erover hoorden — voelt het als een
        tool die meedenkt over wat ze in een interview straks moeten kunnen waarmaken.
      </p>

      <h2>Wat dit voor recruiters betekent</h2>
      <p>
        Een CV gegenereerd met dit soort ingebouwde rem zou gemiddeld &quot;veiliger&quot; moeten zijn
        dan een handmatige opwaardering. Niet omdat de AI altijd de waarheid kent, maar omdat de tool
        niet meebuigt op opwaardering zonder bewijsvoering. De stap voorkomt dat de meest enthousiaste
        sollicitanten — die hun best willen doen — onbedoeld de grootste mismatchen produceren.
      </p>
      <p>
        Voor recruiters die overwegen om gebruikers naar onze tool door te verwijzen (loopbaancoaches,
        UWV-trajectbegeleiders, outplacement-bureaus) is dit aspect vaak het beslissende argument.
      </p>

      <h2>De grens van wat een tool kan doen</h2>
      <p>
        Een gatekeeper-AI is geen waarheids-orakel. Hij weet niet of jouw rol senior of medior was — hij
        weet alleen of dat in je oorspronkelijke profielmateriaal aannemelijk staat. Als jij in je
        oorspronkelijke input alles als &quot;senior&quot; hebt geframed, gaat de gatekeeper daar in mee.
        De eerste eerlijkheidsslag begint dus bij wat je zelf invoert.
      </p>
      <p>
        Dit is bewust. Een tool die elke claim probeert te valideren tegen externe bronnen zou een ander
        product zijn — een onderzoeksinstrument, geen CV-maker. De gatekeeper is een interne consistentie-
        check tussen wat je hebt opgegeven en wat je later vraagt op je CV te zien.
      </p>
    </>
  );
}
