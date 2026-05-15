import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'product-owners';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor product owners — consistente team-CV&apos;s zonder microbeheer';
export const description =
  'Voor PO&apos;s, project leads en team leads die voor team-presentaties of klant-acquisitie team-CV&apos;s moeten beheren. Hoe je &apos;t opzet zonder werk dat niet jouw rol is.';
export const hero =
  'Een onzichtbare PO-taak: team-CV&apos;s consistent houden voor klanten. Hier is hoe je dat aanpakt zonder dat het jouw werk wordt.';
export const keywords = [
  'product owner CV team',
  'team CV consultancy',
  'CV consistentie team',
  'klant CV bundle',
  'PO workflow CV',
];
export const relatedBlogSlugs = [
  'product-owner-team-cvs',
  'docx-template-als-bureau',
  'byok-eigen-ai-key',
  'recruiter-aan-het-woord',
];

export function Body() {
  return (
    <>
      <h2>Het probleem dat PO&apos;s tegenkomen</h2>
      <p>
        In consultancy en in agile teams die met klanten werken bestaat een onzichtbare taak: team-CV&apos;s
        actueel houden. Een klant vraagt om CV&apos;s voor het project, en jij — als PO of project
        lead — bent een uur kwijt aan opmaak-werk dat niet jouw werk is. Of erger: je krijgt vijf
        verschillende Word-versies van vijf teamleden in vijf verschillende lay-outs.
      </p>

      <h2>De simpele opzet die werkt</h2>
      <ol>
        <li>
          <strong>Eén gedeeld huisstijl-template.</strong> Upload je eigen DOCX in CVeetje — alle
          team-CV&apos;s komen uit hetzelfde sjabloon.
        </li>
        <li>
          <strong>Profielen één keer per teamlid.</strong> Elk teamlid richt zijn profiel zelf in. Jij
          bemoeit je er niet mee.
        </li>
        <li>
          <strong>Per klant: één centrale generatie.</strong> Plak de project-context, genereer per
          teamlid een variant. Vijf teamleden, vijf consistente CV&apos;s in vijftien minuten.
        </li>
        <li>
          <strong>Teamlid leest zelf na.</strong> Geen publiek-zonder-check. Respect en kwaliteit
          tegelijk.
        </li>
      </ol>

      <h2>Waarom dit voor jou werkt</h2>
      <ul>
        <li>
          <strong>Klant-presentatie wordt sterker.</strong> Vijf consistente CV&apos;s met gerichte
          framing voor déze klant — andere indruk dan een willekeurige Word-stack.
        </li>
        <li>
          <strong>Je tijd gaat naar wat ertoe doet.</strong> Geen opmaakwerk meer. Jouw uur is voor
          gesprekken en strategie, niet voor Word-styling.
        </li>
        <li>
          <strong>Teamleden voelen geen druk.</strong> Ze hebben altijd een actuele versie. Geen
          paniek bij een onverwachte klantvraag.
        </li>
      </ul>

      <h2>Praktische cijfers</h2>
      <p>
        Een typisch consultancy-team van vijf à tien personen kost in onze ervaring 150 tot 400 credits
        per maand bij actieve acquisitie. Het Power-pack (600 credits voor €59,99) dekt dat ruim. Bij
        intensievere acquisitie raden we BYOK aan — je betaalt dan een paar euro aan eigen
        Claude/OpenAI-kosten en bij ons alleen één download-credit per CV.
      </p>

      <h2>Wat ik anders had gedaan, achteraf</h2>
      <p>
        Een gebruiker (PO bij een bureau) deelde:
      </p>
      <blockquote>
        &quot;Ik begon met &apos;ik regel het wel voor het team&apos; — een PO-reflex. Maar het levert
        betere profielen op als mensen het zelf doen, en het verlost mij van een rol die ik niet wilde.
        Eerder uitleggen aan teamleden dat ze hun eigen profiel inrichten zou ik nu wel doen.&quot;
      </blockquote>

      <h2>Voor product owners in tech-bedrijven</h2>
      <p>
        Dit profiel is niet alleen voor consultancy-PO&apos;s. Ook PO&apos;s in tech-teams gebruiken
        het:
      </p>
      <ul>
        <li>
          Voor &quot;Talent profile&quot;-documenten waarin het team naar partners wordt
          gepresenteerd.
        </li>
        <li>
          Voor team-pagina&apos;s op de eigen website — een gegenereerde, ingekorte versie als
          basismateriaal voor het content-team.
        </li>
        <li>
          Bij interne rotatie: een teamlid die voor een ander team interesseert kan met een
          gerichte interne CV-variant zijn vraag onderbouwen.
        </li>
      </ul>
    </>
  );
}
