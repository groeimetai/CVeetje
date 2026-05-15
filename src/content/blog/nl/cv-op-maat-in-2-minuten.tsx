import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'cv-op-maat-in-2-minuten',
  locale: 'nl',
  title: 'CV op maat maken in 2 minuten — hoe het werkt zonder dat het stom klinkt',
  description:
    'Eén CV voor élke vacature is een mythe. We leggen uit hoe je per vacature een gericht CV maakt — keywords, framing, structuur — zonder uren te verprutsen in Word.',
  publishedAt: '2026-05-01',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'how-to',
  personas: ['werkzoekenden', 'zij-instromers'],
  keywords: [
    'CV op maat',
    'CV aanpassen aan vacature',
    'CV maken',
    'AI CV generator',
    'CV targeting',
    'sollicitatie',
  ],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Het &quot;één CV voor alles&quot;-advies is dood. Wie iets serieus wil met een functie, mailt geen
        algemeen CV-tje meer. Maar dat betekent niet dat je voor elke vacature een uur in Word moet zitten
        klooien. Het kan in twee minuten. Echt.
      </p>

      <h2>Waarom een algemeen CV niet meer werkt</h2>
      <p>
        Een recruiter besteedt gemiddeld zes tot tien seconden aan een eerste scan van een CV. Tegelijk
        draaien de meeste recruitmentafdelingen tegenwoordig een soort filter — een ATS, een keyword-match,
        soms gewoon een ervaren oog dat op vijf dingen let. Een algemeen CV slaagt zelden in zes seconden
        de aandacht te grijpen, omdat het probeert iedereen iets te bieden en daardoor niemand precies wat
        die zoekt.
      </p>
      <p>
        De truc is dus niet om méér op je CV te zetten. De truc is om de juiste dingen <em>bovenaan</em> te
        zetten, met de juiste woorden. Voor elke vacature anders.
      </p>

      <h2>Wat er in die twee minuten gebeurt</h2>
      <p>
        Bij CVeetje plak je twee dingen in: je profiel (één keer, uit LinkedIn-export of als PDF) en de
        vacaturetekst. Wat daarna gebeurt is geen magie, maar wel handig:
      </p>
      <ol>
        <li>
          <strong>De vacature wordt gelezen.</strong> De tool haalt de harde eisen, nice-to-haves en
          terugkerende terminologie eruit. &quot;Product Owner&quot; en &quot;PO&quot; zijn niet hetzelfde
          woord voor een ATS, dus ze worden allebei genoteerd.
        </li>
        <li>
          <strong>Je ervaring wordt gematcht.</strong> Niet verzonnen, niet opgeklopt. Wat je hebt gedaan,
          wordt herordend zodat de relevante stukken bovenaan staan. Een rol van vijf jaar geleden die
          ineens past, krijgt meer ruimte; een baantje dat niets toevoegt aan deze vacature krimpt.
        </li>
        <li>
          <strong>De bullets worden herschreven.</strong> Hetzelfde wapenfeit, andere lens. &quot;Verbeterde
          onboarding-flow&quot; wordt voor een growth-rol &quot;activatie van nieuwe gebruikers met 12% omhoog&quot;
          en voor een ops-rol &quot;tickets eerste week omlaag met 30%&quot; — als die cijfers in je
          bronmateriaal staan.
        </li>
        <li>
          <strong>De stijl wordt gekozen.</strong> Solliciteer je bij een bank? Conservative. Een
          design-studio? Creative of Editorial. Je kunt het bijsturen.
        </li>
        <li>
          <strong>Je controleert.</strong> Voordat er iets gedownload wordt zie je een preview. Vind je
          dat een feit niet klopt, dan klik je &quot;Niet eens&quot;, leg je uit waarom, en wordt het
          herzien — gratis, als je een goed punt hebt.
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">Wat het niet doet</div>
        <p>
          Geen ervaring verzinnen. Geen skills aanvinken die je nooit gebruikt hebt. Geen jaartallen
          oprekken. De honest-rules zijn ingebakken in de prompts — als je iets niet hebt gedaan, komt het
          er niet op. Dat is geen marketing, het is de enige manier waarop dit op de lange termijn werkt.
        </p>
      </div>

      <h2>Wat je zelf moet doen (en wel goed)</h2>
      <p>
        De tool kan veel, maar één ding niet: weten wat je echt hebt gedaan. Dus de eerste keer dat je je
        profiel inricht, neem je daar tien minuten voor. Niet meer. Plak je LinkedIn-PDF in, vul aan waar
        nodig, gooi een paar projectbeschrijvingen erbij waar je trots op bent. Vanaf dat moment is het
        klaar — alle volgende CV&apos;s zijn variaties op deze grondstof.
      </p>
      <p>
        En, belangrijk: lees het eindresultaat. Een gegenereerd CV zonder eigen check is een gegok. Lees
        het hardop, vraag jezelf bij elke bullet of jij dit echt zo zou zeggen. Verander wat niet klopt.
        Dat is geen falen van de tool — dat is hoe je een CV serieus inzet.
      </p>

      <h2>De realistische tijdsbalans</h2>
      <table>
        <thead>
          <tr>
            <th>Stap</th>
            <th>Eerste keer</th>
            <th>Daarna</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Profiel opzetten</td>
            <td>10 min</td>
            <td>0 — al gedaan</td>
          </tr>
          <tr>
            <td>Vacature plakken + generatie</td>
            <td>1 min</td>
            <td>1 min</td>
          </tr>
          <tr>
            <td>Stijl kiezen</td>
            <td>30 sec</td>
            <td>10 sec</td>
          </tr>
          <tr>
            <td>Lezen + finetune</td>
            <td>3–5 min</td>
            <td>1–2 min</td>
          </tr>
          <tr>
            <td>Download PDF</td>
            <td>5 sec</td>
            <td>5 sec</td>
          </tr>
        </tbody>
      </table>

      <p>
        Twee minuten is dus de generatie + download. De &quot;echte&quot; tijd inclusief lezen ligt eerder
        op vier tot vijf minuten per sollicitatie. Dat is nog steeds een factor tien sneller dan wat de
        meeste mensen nu doen in Word, en het resultaat is gerichter.
      </p>

      <h2>Veel gestelde vragen</h2>
      <details>
        <summary>Kost dat geen creatieve gekkigheid van de AI?</summary>
        <div>
          Je kiest zelf het creativiteitsniveau. Voor een advocatenkantoor zet je het op Conservative en
          krijg je een rustige, klassieke layout. Voor een design-studio kun je Experimental of Editorial
          aanzetten en krijgt het CV een eigen visuele taal. Niets verandert aan de feiten — alleen aan de
          presentatie.
        </div>
      </details>
      <details>
        <summary>Werkt het ook als ik geen LinkedIn heb?</summary>
        <div>
          Ja. Je kunt je profiel handmatig invullen, of een bestaand CV (PDF) uploaden en daar starten. De
          tool werkt met wat jij erin stopt, niet met scraping van externe profielen.
        </div>
      </details>
      <details>
        <summary>Wat als de vacature ouderwets is en in jip-en-janneketaal vraagt om &quot;teamspeler&quot;?</summary>
        <div>
          Dan staat dat erin. We proberen niet slimmer te zijn dan de recruiter. Als de tekst om
          generieke begrippen vraagt, krijg je generieke begrippen terug — maar met jouw concrete invulling
          eronder.
        </div>
      </details>
      <details>
        <summary>Is dit niet gewoon ChatGPT-met-een-jasje?</summary>
        <div>
          Nee. ChatGPT kun je een vacature voeren en zelf prompten. Dat werkt op een laptop tussen vijf
          tabbladen door soms aardig. CVeetje doet drie dingen die ChatGPT niet doet uit de doos: het houdt
          je profiel als een gestructureerd datamodel vast (zodat regeneraties consistent zijn), het rendert
          naar een echt PDF met meerdere stijlen, en het heeft eerlijkheidsregels die voorkomen dat de AI
          dingen erbij verzint. Plus: je hoeft niet elke keer opnieuw je profiel te plakken.
        </div>
      </details>

      <h2>Probeer het zelf</h2>
      <p>
        Je krijgt elke maand vijftien gratis credits — genoeg voor één volledig CV per maand zonder
        ergens een creditcard achter te laten. Als je meer wilt, kun je credits kopen of je eigen API-key
        gebruiken. Eerlijk gezegd: één gegenereerd CV is meestal genoeg om te zien of het voor jou werkt.
      </p>
    </>
  );
}
