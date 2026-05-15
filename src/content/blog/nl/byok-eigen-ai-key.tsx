import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'byok-eigen-ai-key',
  locale: 'nl',
  title: 'BYOK — wat het is, voor wie het past, en waarom we het &uuml;berhaupt aanbieden',
  description:
    'Je eigen Claude- of OpenAI-key in CVeetje gebruiken. Wat het bespaart, wat het je oplevert qua privacy, en waarvoor de platform-mode dan nog overblijft.',
  publishedAt: '2025-10-30',
  updatedAt: '2026-05-15',
  readingMinutes: 6,
  category: 'guide',
  personas: ['product-owners', 'zzp', 'loopbaancoaches'],
  keywords: ['BYOK', 'eigen API key', 'Claude API key CV', 'OpenAI API key', 'AI key encryption'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        BYOK staat voor &quot;bring your own key&quot;. Het betekent: gebruik je eigen
        AI-provider-account voor de AI-stappen in CVeetje, in plaats van onze platform-credits. Voor de
        meeste mensen is platform-mode prima. Voor zware gebruikers en privacy-bewuste organisaties is
        BYOK interessanter.
      </p>

      <h2>Hoe BYOK werkt in CVeetje</h2>
      <p>
        Onder &quot;Instellingen&quot; vul je je API-key in van Anthropic, OpenAI, Google of een andere
        ondersteunde provider. Die key wordt direct AES-256-versleuteld opgeslagen in onze database, met
        een sleutel die alleen onze server kan ontsleutelen. Bij elke AI-call die je doet, wordt de key
        ontsleuteld in het geheugen, gebruikt voor één request, en daarna weggegooid — &apos;m wordt
        nooit naar de browser of naar logs gestuurd.
      </p>
      <p>
        Op je dashboard zie je dan &quot;BYOK mode — je betaalt direct aan je provider&quot; en de
        AI-stappen kosten geen credits aan onze kant. De PDF-download kost wel één credit, omdat die op
        onze infrastructuur loopt (Puppeteer plus Cloud Run, dat is geen gratis ding).
      </p>

      <h2>Wie heeft hier baat bij?</h2>
      <h3>1. Iemand die al een Claude- of OpenAI-abonnement heeft</h3>
      <p>
        Een ChatGPT Plus-abonnement geeft geen API-toegang — daar heb je een API-credits-account voor
        nodig (apart). Maar veel ontwikkelaars en data-mensen hebben dat al. Voor hen kost een
        CV-generatie via BYOK ongeveer twee tot vier eurocent.
      </p>

      <h3>2. Loopbaancoaches en bureaus</h3>
      <p>
        Wie veel CV&apos;s per maand maakt, ontkomt niet aan een gesprek over kosten. Vanaf circa
        twintig CV&apos;s per maand begint BYOK serieus te schelen. Bij honderd CV&apos;s per maand zit
        je met platform-mode op zo&apos;n €100, met BYOK op €5 (alleen download-credits, AI-kosten op
        eigen rekening).
      </p>

      <h3>3. Organisaties die strict zijn over dataflows</h3>
      <p>
        Bij een grote werkgever (of een loopbaancoach die werkt met overheidstrajecten) is &quot;welke
        partij raakt persoonsgegevens aan?&quot; een echte vraag. Met BYOK gaat je profiel-data alleen
        naar de provider waar jij rechtstreeks bij contracteert (Anthropic, OpenAI of Google). CVeetje
        is in dit model een passant; we zien je content uiteraard voor het bouwen van de PDF, maar er
        is geen separate dataverwerker tussen jouw key en de AI-provider.
      </p>

      <h3>4. Mensen die willen kunnen kiezen tussen modellen</h3>
      <p>
        In BYOK-mode kun je per generatie wisselen van model. Soms wil je Claude Opus voor een
        ingewikkelde herziening, soms is Sonnet of Haiku snel genoeg voor een eenvoudige herformulering.
        In platform-mode draait alles standaard op Claude Opus.
      </p>

      <h2>Voor wie is platform-mode wel beter?</h2>
      <ul>
        <li>
          <strong>Mensen zonder API-account.</strong> Een API-account opzetten bij Anthropic of OpenAI
          kost tien minuten en vraagt een creditcard. Voor incidentele gebruikers is dat een hoge
          drempel.
        </li>
        <li>
          <strong>Mensen die de gratis tier voldoende vinden.</strong> 15 credits per maand is één
          volledig CV — voor de meeste werkzoekenden een redelijke frequentie.
        </li>
        <li>
          <strong>Mensen die liever één rekening hebben.</strong> Een credit-pack van €4,99 of €12,99 is
          één transactie. BYOK betekent dat je je provider-rekening apart in de gaten houdt.
        </li>
      </ul>

      <h2>De technische bovengrens van veilig BYOK</h2>
      <p>
        We hebben drie keuzes gemaakt rondom keys die het noemen waard zijn:
      </p>
      <ol>
        <li>
          <strong>Encryptie at rest.</strong> AES-256 met een sleutel die alleen onze applicatieserver
          kent. Je key staat versleuteld in Firestore.
        </li>
        <li>
          <strong>Geen logging.</strong> AI-calls met BYOK-keys worden niet uitgebreid gelogd. De
          standaard error-sanitizer verwijdert key-strings als ze per ongeluk in een error-message
          terechtkomen.
        </li>
        <li>
          <strong>Direct intrekbaar.</strong> Een &quot;verwijder mijn key&quot;-knop in je instellingen
          maakt de versleutelde waarde direct null. Je provider intrekken is dan een aparte stap, maar
          dat is per provider verschillend.
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">Wat je zelf moet doen</div>
        <p>
          Maak een aparte API-key voor CVeetje (in plaats van je hoofdkey te delen). Zet bij Anthropic
          of OpenAI een usage cap erop — bijvoorbeeld €20 per maand. Dan kan er ook bij een fout niets
          ongevraagd hard oplopen. Dit is een goede gewoonte bij élke tool die een key vraagt, niet
          alleen bij ons.
        </p>
      </div>

      <h2>Mengvormen</h2>
      <p>
        Je hoeft niet voor één model te kiezen. Je kunt een key invullen en daarmee de meeste calls
        doen, en — als je key tijdelijk uitvalt of je credits opraken bij je provider — terugvallen op
        platform-credits voor incidentele generaties. CVeetje detecteert dit automatisch en past zich
        aan. Dat is geen experiment-feature; het is hoe het altijd al heeft gewerkt sinds we het hebben
        ingebouwd.
      </p>
    </>
  );
}
