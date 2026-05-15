import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'zzp-acquisitie-cv-per-klant',
  locale: 'nl',
  title: 'Een CV per klant: hoe zzp&apos;ers in acquisitie er een wapen van maken',
  description:
    'Als zzp&apos;er stuur je geen CV om een baan te krijgen — je stuurt &apos;m om vertrouwen te wekken. Hoe je er een verkooptool van maakt zonder je ziel te verkopen.',
  publishedAt: '2026-01-12',
  updatedAt: '2026-05-15',
  readingMinutes: 7,
  category: 'guide',
  personas: ['zzp'],
  keywords: ['zzp CV', 'freelance CV', 'consultant CV', 'CV per klant', 'acquisitie zzp'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        Voor een werknemer is een CV een sollicitatie. Voor een zzp&apos;er is het een verkooptool.
        Verschillende doelen, andere keuzes. Hier is hoe een acquisitie-CV anders werkt — en hoe je
        zonder veel moeite een variant maakt voor elke offerte die je doet.
      </p>

      <h2>Het verschil tussen werknemer- en zzp-CV</h2>
      <p>
        Een werknemer-CV vertelt &quot;dit is wie ik ben en wat ik kan doen, neem me aan&quot;. Een
        zzp-CV vertelt &quot;dit is wie ik ben, dit is wat ik voor anderen heb gedaan, je krijgt waar je
        voor betaalt&quot;. Het is verkoopdocument, niet sollicitatiebrief.
      </p>
      <p>
        Drie specifieke verschillen:
      </p>
      <ul>
        <li>
          <strong>Klanten i.p.v. werkgevers.</strong> Je vorige opdrachten zijn relevanter dan de namen
          van bureaus waar je via hebt gewerkt. &quot;ING&quot; klinkt sterker dan &quot;Detacheringsbureau
          X (gedetacheerd bij ING)&quot;.
        </li>
        <li>
          <strong>Outcomes i.p.v. taken.</strong> &quot;Heb een release-proces opgezet&quot; is werknemer-taal.
          &quot;Reduceerde release-friction zodat het team van twee naar acht deploys per week kon&quot;
          is zzp-taal.
        </li>
        <li>
          <strong>Tarief-signaal.</strong> Niet expliciet, maar door je framing. Een €110-uur-zzp&apos;er
          en een €175-uur-zzp&apos;er hebben verschillende manieren van schrijven. Onbedoeld of niet — dat
          komt door in je CV.
        </li>
      </ul>

      <h2>Wat erop moet voor acquisitie</h2>
      <h3>1. Positionering bovenaan</h3>
      <p>
        Niet &quot;Freelance software engineer&quot;. Wel &quot;Freelance software engineer | backend +
        DevOps voor scale-ups in fintech | Apeldoorn / remote&quot;. Specifiek wint van algemeen. Het
        signaleert dat je weet welke klanten je bedient — en zegt impliciet dat je voor andere
        klanttypes niet de beste keuze bent. Dat klinkt riskant maar werkt averechts: het maakt de juiste
        klanten zekerder van hun zaak.
      </p>

      <h3>2. Recente opdrachten in detail</h3>
      <p>
        Drie tot vijf opdrachten met serieuze diepte. Per opdracht:
      </p>
      <ul>
        <li>Klant + sector (als NDA toestaat — anders &quot;Scale-up in adtech, 80 FTE&quot;).</li>
        <li>Periode + omvang (&quot;3 dagen/week, 9 maanden&quot;).</li>
        <li>Wat het probleem was.</li>
        <li>Wat jij hebt gedaan.</li>
        <li>Wat het resultaat was — meetbaar als het kan, anders concreet.</li>
      </ul>

      <h3>3. Toolset met focus</h3>
      <p>
        Niet &quot;alle technologieën die ik ooit heb aangeraakt&quot;. Wel de drie tot vijf dingen
        waarin je nu daadwerkelijk goed bent. Een klant huurt je in voor wat je nu kan, niet voor wat
        je in 2014 leerde.
      </p>

      <h3>4. Een eerlijke beperking</h3>
      <p>
        Klinkt contra-intuïtief. &quot;Ik werk niet met...&quot; of &quot;Geen interesse meer in...&quot;.
        Dit zou ik op het CV alleen doen als het past bij je positionering. Het maakt je serieuzer over
        je vak. Voorbeeld: &quot;Ik werk niet meer met PHP-codebases ouder dan 2015&quot; — dat is geen
        snobisme, dat is &quot;ik weet welke opdrachten ik wel en niet kan doen tegen mijn tarief&quot;.
      </p>

      <h2>De acquisitie-workflow</h2>
      <p>
        Voor elke offerte zou je idealiter een CV-variant willen maken die past bij de klant. In de
        praktijk gebeurt dat zelden — te veel werk. Met een AI-tool wordt het wel haalbaar.
      </p>
      <ol>
        <li>
          <strong>Basisprofiel inrichten.</strong> Eén keer. Alle opdrachten erin, met de echte details.
        </li>
        <li>
          <strong>Per klant: opdrachtbeschrijving plakken.</strong> Wat is hun project, wat zoeken ze,
          welke technologie staat in de aanvraag.
        </li>
        <li>
          <strong>Genereer met framing.</strong> CVeetje herordent je opdrachten zodat de meest
          relevante bovenaan staan, en herschrijft de bullets met de juiste accenten. Een fintech-klant
          krijgt jouw fintech-werk vooraan; een retail-klant ziet eerst je e-commerce-ervaring.
        </li>
        <li>
          <strong>Stuur als bijlage bij je offerte.</strong> Niet eerst &quot;mijn algemene CV&quot; en
          dan in een gesprek je verhaal — direct iets gerichts, met je offerte mee. Dat scheelt
          beoordelingstijd.
        </li>
      </ol>

      <div className="callout callout--success">
        <div className="callout-title">Direct effect</div>
        <p>
          De zzp&apos;ers die we hierover spraken meldden allemaal hetzelfde: een gerichte CV bij je
          offerte vergroot de kans dat een klant doorklikt naar een eerste kennismakingsgesprek. Het
          signaleert dat je voor déze opdracht hebt gekozen, niet dat je in een breed net aan het
          vissen bent.
        </p>
      </div>

      <h2>Een eerlijke kanttekening over &quot;framing&quot;</h2>
      <p>
        Framing is geen liegen. Het is &quot;wat past hier het beste&quot; van wat je werkelijk hebt
        gedaan. Een CV-bullet kan twee waarheidsgetrouwe versies hebben — &quot;reduceerde tijd tot
        deploy van vier uur naar twintig minuten&quot; en &quot;voerde een CI/CD-overhaul door waarin
        ook caching en parallel testing zijn geoptimaliseerd&quot;. Allebei waar. Welke je voorop zet
        hangt af van waar de klant op aanslaat. Dat is geen manipulatie; dat is communicatie.
      </p>
      <p>
        Wat wél manipulatie is: een opdracht omschrijven met termen die je in werkelijkheid niet hebt
        gebruikt, of een opdracht met meer impact framen dan ze had. Dat krijg je in een intake-gesprek
        terug op je bord. CVeetje heeft hier ingebouwde rem op — als je in een dispute-flow probeert om
        een claim op te rekken, vraagt de tool om concrete bewijsstukken. Dat is niet streng om streng
        te zijn; dat is hoe dit op de lange termijn voor je blijft werken.
      </p>

      <h2>Tarief-signaal door framing</h2>
      <p>
        Een specifieke truc die hogere tarieven onderbouwt: gebruik &quot;omdat&quot; en
        &quot;waardoor&quot;. Niet &quot;Bouwde een dashboard&quot;, maar &quot;Bouwde een dashboard
        omdat het managementteam blind stuurde op een driewekelijkse PDF, waardoor de
        beslissingscyclus naar dagelijks ging.&quot; De &quot;omdat&quot; legt het probleem bloot, de
        &quot;waardoor&quot; toont de waarde. Twee woorden, ander tarief.
      </p>
    </>
  );
}
