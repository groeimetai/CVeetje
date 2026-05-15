import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'loopbaancoaches';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor loopbaancoaches — krachtigere CV&apos;s, meer klanten, minder Word-werk';
export const description =
  'Voor outplacement, re-integratie, UWV-trajecten en zelfstandige loopbaancoaches. Hoe CVeetje je workflow versnelt zonder dat de menselijke laag verdwijnt.';
export const hero =
  'Je hebt een klant met dertig jaar ervaring en geen zin om Word weer aan te zetten. Of een herintreder die zelf niet weet hoe ze die periode framen. Je werk zit in het denken, niet in het opmaken — maar het opmaken eet wel uren.';
export const keywords = [
  'loopbaancoach CV tool',
  'outplacement CV',
  'reintegratie CV',
  'UWV traject CV',
  'CV voor klanten',
  'coach CV maker',
];
export const relatedBlogSlugs = [
  'product-owner-team-cvs',
  'docx-template-als-bureau',
  'gatekeeper-eerlijkheid',
  'herintreden-na-pauze',
  '55-plus-arbeidsmarkt-cv',
  'zij-instromer-cv-vertelt-verhaal',
];

export function Body() {
  return (
    <>
      <h2>De workflow van een loopbaancoach</h2>
      <p>
        Een typische coach werkt met vijf tot vijftien klanten tegelijk. Iedere klant heeft een eigen
        situatie — herintreder, ontslagen senior, zij-instromer, mantelzorger. Voor elk maak je
        materiaal: CV, motivatiebrief, soms een LinkedIn-update. Het denkwerk is jouw werkelijke
        product. Het uitwerken in Word is bijwerk dat tijd vreet.
      </p>

      <h2>Wat CVeetje voor jou versnelt</h2>
      <ul>
        <li>
          <strong>Eigen huisstijl-template.</strong> Upload je eigen DOCX-template (jouw lay-out, jouw
          logo, jouw kleuren) — de AI vult de inhoud in. Resultaat: alle klant-CV&apos;s in dezelfde
          professionele uitstraling, zonder dat je elke keer met opmaak hoeft te knokken.
        </li>
        <li>
          <strong>Snelle iteratie per klant.</strong> Een gesprek met een klant levert nieuwe inzichten
          op. Je past het profiel aan, regenereert, deelt. Geen halve-dag-opmaakwerk meer.
        </li>
        <li>
          <strong>Eerlijkheid ingebouwd.</strong> De gatekeeper-stap voorkomt dat een klant onbedoeld
          claims opklopt. Voor jou als professioneel coach een belangrijke geruststelling — je hoeft
          niet elk CV regel-voor-regel te controleren.
        </li>
        <li>
          <strong>Schaal die past bij jouw praktijk.</strong> Vanaf vijftien klanten per maand wordt
          BYOK (eigen API-key) interessant — kosten dalen van een paar tientjes naar een paar euro per
          maand. Voor incidenteel gebruik volstaan platform-credits.
        </li>
      </ul>

      <h2>Een concreet werkpatroon</h2>
      <ol>
        <li>
          <strong>Intake met je klant.</strong> Jij verzamelt het inhoudelijke beeld — ervaring,
          richting, zorgen.
        </li>
        <li>
          <strong>Profielinrichting in CVeetje.</strong> Tien tot vijftien minuten. Je vult of laat je
          klant invullen.
        </li>
        <li>
          <strong>Eerste CV in jouw huisstijl-template.</strong> Genereer met de relevante
          vacature-context als die er al is, of generaliseer naar een richting.
        </li>
        <li>
          <strong>Coachings-sessie gebaseerd op output.</strong> Niet meer op een blanco Word-blad —
          jullie discussie gaat over inhoud, niet over opmaak.
        </li>
        <li>
          <strong>Iteratie per sollicitatie.</strong> Klant doet zelf elke vacature-specifieke
          variant met jouw kader.
        </li>
      </ol>

      <h2>Wat dit voor klanten doet</h2>
      <p>
        Een klant zonder tool blijft afhankelijk van jou voor elke variatie. Een klant met toegang tot
        CVeetje (op jouw huisstijl-template) kan voor elke sollicitatie zelf doorgaan. Dat is geen
        verlies voor jou — het is uitgaande klantwaarde die je makkelijker kunt rechtvaardigen, en het
        verlaagt het &quot;wat als ik weer Word moet&quot;-blokje in hun proces.
      </p>

      <h2>Voor coaches die hun eigen praktijk professionaliseren</h2>
      <p>
        Een paar dingen die we vaak zien bij coaches die ons gebruiken:
      </p>
      <ul>
        <li>
          Een eigen klantportaal blijft handig — CVeetje is geen vervanger voor je administratie.
        </li>
        <li>
          Loopbaancoaches met overheids- of UWV-contracten geven aan: BYOK-mode is bij deze
          contracten vaak voorkeur, omdat klantdata dan niet via een extra platform stroomt.
        </li>
        <li>
          De Power-pack (600 credits voor €59,99) zit qua schaal vaak goed voor een actieve praktijk
          die niet op BYOK draait.
        </li>
      </ul>

      <h2>Wat we niet doen</h2>
      <ul>
        <li>
          We zijn geen CRM, geen factureringssoftware, geen klantportaal. We zijn de tool voor de
          schrijftaken.
        </li>
        <li>
          We doen geen psychometrische tests of beroepskeuzeanalyses. Voor dat type werk verwijzen we
          gewoon naar de bestaande gespecialiseerde aanbieders.
        </li>
        <li>
          We adviseren geen klanten — dat is jouw werk. We leveren de schrijflaag waar je advies
          omheen werkt.
        </li>
      </ul>
    </>
  );
}
