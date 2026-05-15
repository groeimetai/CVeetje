import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'hiring-managers';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor hiring managers — beoordelen in een AI-CV-wereld';
export const description =
  'Voor team leads, engineering managers, hoofden afdeling. Hoe je AI-CV&apos;s op waarde schat, wat je in een gesprek wel en niet kunt vragen, en hoe je je vacaturetekst eerlijker schrijft.';
export const hero =
  'Als hiring manager beoordeel je CV&apos;s niet meer in een wereld waar elke kandidaat hetzelfde Word-werkje deed. AI-tools veranderen de instroom. Hier is wat dat betekent voor jouw kant van het proces.';
export const keywords = [
  'hiring manager AI CV',
  'CV beoordelen team lead',
  'sollicitatiegesprek AI',
  'vacaturetekst schrijven',
  'recruitment manager',
];
export const relatedBlogSlugs = [
  'recruiter-aan-het-woord',
  'gatekeeper-eerlijkheid',
  'ats-cv-2026',
  'chatgpt-vs-cveetje',
];

export function Body() {
  return (
    <>
      <h2>Wat is er veranderd in 2026</h2>
      <p>
        Een groot deel van je inkomende CV&apos;s is door AI bewerkt. Dat is geen marketing-claim —
        dat is wat elk recruitment-team in elk gesprek met ons bevestigt. Een deel daarvan is goed
        gedaan (kandidaat met heldere structuur, eerlijke claims), een deel is slecht gedaan
        (opgeklopt, plat, herkenbaar AI-genereeerd). Jouw werk is om die kwaliteitsschaal te leren
        lezen.
      </p>

      <h2>Wat een goed AI-CV doet en wat niet</h2>
      <ul>
        <li>
          <strong>Wel:</strong> tijd voor de kandidaat besparen op opmaakwerk, sterkere
          profielsamenvattingen, betere bullet-framing.
        </li>
        <li>
          <strong>Niet:</strong> ervaring verzinnen, skills aanvinken die de kandidaat niet
          beheerst, jaartallen oprekken — tenminste niet als de kandidaat een tool gebruikt met
          ingebouwde eerlijkheidsregels (zoals CVeetje).
        </li>
      </ul>

      <h2>Hoe je een AI-CV beter beoordeelt</h2>
      <p>
        Vier vragen om jezelf te stellen bij een CV dat &quot;op orde&quot; lijkt:
      </p>
      <ol>
        <li>
          <strong>Klinkt de profielsamenvatting menselijk?</strong> Een goed gebruikt AI-CV heeft een
          menselijke laag. Een onbewerkt AI-CV heeft een vlakke politieke beleefdheid.
        </li>
        <li>
          <strong>Varieert de bullet-lengte?</strong> Identieke bullet-lengtes met dezelfde
          werkwoord-resultaat-structuur is een AI-tell.
        </li>
        <li>
          <strong>Is er een rode draad?</strong> Een AI kan losse rollen goed beschrijven; een
          consistent verhaal over het pad van de kandidaat blijft mensenwerk.
        </li>
        <li>
          <strong>Komen claims overeen met LinkedIn?</strong> Hoog discrepant — vraagteken. Goed
          aligned — geen reden voor argwaan.
        </li>
      </ol>

      <h2>Wat je in gesprek wel en niet kunt vragen</h2>
      <p>
        &quot;Heb je AI gebruikt om je CV te maken?&quot; mag gerust. Een sterke kandidaat antwoordt
        zonder gêne. Wat je daarna doet met dat antwoord is jouw afweging — maar discrimineren op
        AI-gebruik is een zwakke filter (en bij sommige rollen direct contradictoir met wat je in de
        functie verwacht).
      </p>
      <p>
        Wat je niet kunt vragen: dat de kandidaat op tafel laat zien dat ze het zelf hebben getypt.
        Dat is een asymmetrisch verzoek dat AI-gebruik framet als oneerlijkheid.
      </p>
      <p>
        Wat sterker werkt: vraag bij een impressive bullet om concrete diepte. &quot;Je schrijft dat
        je deze migratie hebt geleid — kun je vertellen hoe je het team daarbij meenam?&quot;. Een
        eerlijk AI-CV passeert deze vraag soepel; een opgeklopt CV struikelt.
      </p>

      <h2>Wat je vacaturetekst doet voor je instroom</h2>
      <p>
        AI-tools lezen je vacaturetekst en distilleren wat de kandidaat nodig heeft. Een onduidelijke,
        cliché-vol geschreven vacature levert vlakke AI-CV&apos;s op — omdat de tool weinig hard
        materiaal heeft om te framen. Een specifieke, met concrete vereisten geschreven vacature
        zorgt voor gerichtere CV&apos;s in je instroom.
      </p>
      <p>
        Concreet:
      </p>
      <ul>
        <li>
          Vermijd &quot;teamspeler met oog voor detail&quot;-bullshit. Schrijf wat het team echt doet
          en welke afwegingen het maakt.
        </li>
        <li>
          Benoem zes echte vereisten in plaats van een vinkjeslijst van twaalf. Hardere
          fokus, betere match-kwaliteit.
        </li>
        <li>
          Geef context van het team: hoe groot, welke fase, welke recente challenges. Dat helpt
          kandidaten (en hun AI-tools) iets specifieks terug te leveren.
        </li>
      </ul>

      <h2>Hoe CVeetje hieraan bijdraagt</h2>
      <p>
        Een paar dingen die invloed hebben op wat jij in je inbox krijgt:
      </p>
      <ul>
        <li>
          Eerlijkheidsregels in de prompts: geen ervaring of skills verzinnen.
        </li>
        <li>
          Gatekeeper-stap bij regeneraties: opwaarderingen vragen om bewijs.
        </li>
        <li>
          Humanizer-pass op motivatiebrieven: minder AI-tells, maar geen homogenisering.
        </li>
        <li>
          Bewuste keuze om geen verborgen watermerk te gebruiken: we vinden dat een hiring manager
          gelijk speelveld moet hebben — niet een &quot;deze is door AI gemaakt&quot;-detector op de
          rug van kandidaten.
        </li>
      </ul>
    </>
  );
}
