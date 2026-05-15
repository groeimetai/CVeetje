import type { PersonaPage } from '..';

export const slug: PersonaPage['slug'] = 'zzp';
export const locale: PersonaPage['locale'] = 'nl';
export const title = 'CVeetje voor zzp&apos;ers — een CV per klant zonder veel werk';
export const description =
  'Voor freelancers, consultants en interim-mensen. Hoe je voor elke offerte een gericht CV meestuurt waarmee je tarief beter verdedigbaar is en je hit-rate omhoog gaat.';
export const hero =
  'Als zzp&apos;er is je CV een verkooptool, geen sollicitatiedocument. Per klant aanpassen scheelt — als het je geen uren kost.';
export const keywords = [
  'zzp CV',
  'freelance CV',
  'consultant CV',
  'CV per offerte',
  'interim CV',
  'CV voor opdracht',
];
export const relatedBlogSlugs = [
  'zzp-acquisitie-cv-per-klant',
  'docx-template-als-bureau',
  'byok-eigen-ai-key',
  'welke-stijl-kies-je',
];

export function Body() {
  return (
    <>
      <h2>De zzp-werkelijkheid</h2>
      <p>
        Een werknemer-CV vertelt &quot;neem me aan&quot;. Een zzp-CV vertelt &quot;je krijgt waar je
        voor betaalt&quot;. Verschillend doel, andere keuzes — outcomes voorop, klanten genoemd,
        framing toegespitst op de vraag van die specifieke opdracht.
      </p>

      <h2>Wat CVeetje voor jou doet</h2>
      <ul>
        <li>
          <strong>Eén profiel, alle opdrachten erin.</strong> Klant, sector, omvang, periode, jouw rol,
          resultaten. Eén keer goed inrichten, daarna een fundament voor elke variant.
        </li>
        <li>
          <strong>Per offerte een gerichte variant.</strong> Plak de opdrachtbeschrijving (of mail van
          de opdrachtgever), genereer. De juiste opdrachten staan vooraan; de framing past bij wat de
          klant zoekt.
        </li>
        <li>
          <strong>Tarief-signaal door framing.</strong> &quot;Omdat&quot; en &quot;waardoor&quot; in je
          bullets — een dashboard bouwen wordt &quot;bouwde dashboard omdat ... waardoor ...&quot;. Twee
          woorden, ander tarief.
        </li>
        <li>
          <strong>Eigen huisstijl-template mogelijk.</strong> Heb je een eigen lay-out die je elke
          keer gebruikt? Upload &apos;m als DOCX. De AI vult &apos;m. Geen Word meer.
        </li>
      </ul>

      <h2>Wat een gericht zzp-CV typisch onderscheidt</h2>
      <ol>
        <li>
          <strong>Specifieke positionering bovenaan.</strong> Niet &quot;freelance software
          engineer&quot;. Wel &quot;freelance software engineer | backend + DevOps voor scale-ups in
          fintech&quot;.
        </li>
        <li>
          <strong>Recente opdrachten in detail.</strong> Drie tot vijf opdrachten, per opdracht het
          probleem dat speelde + jouw rol + het meetbare resultaat.
        </li>
        <li>
          <strong>Focus-toolset.</strong> Niet alle technologieën — de drie tot vijf waar je nu echt
          goed in bent.
        </li>
        <li>
          <strong>Eerlijke beperking.</strong> Wat je niet doet of bewust niet meer aanneemt. Maakt je
          serieuzer over je vak.
        </li>
      </ol>

      <h2>Wat dit voor je acquisitie doet</h2>
      <p>
        De zzp&apos;ers die ons gebruiken voor offertes melden allemaal hetzelfde: een gerichte
        CV-variant bij je offerte vergroot de kans dat de klant doorklikt naar een eerste
        kennismakingsgesprek. Het signaleert dat je voor déze opdracht hebt gekozen, niet vissen in
        een breed net.
      </p>

      <h2>BYOK is voor jou meestal het juiste model</h2>
      <p>
        Als je elke offerte een CV-variant maakt zit je al snel op tien tot dertig CV-generaties per
        maand. Op platform-credits kost dat €15 tot €40. Op BYOK (je eigen Claude- of OpenAI-key) kost
        het een paar euro aan eigen API-kosten + één credit per PDF-download bij ons (10 credits voor
        €4,99 per 30 stuks). Dus voor actieve zzp-acquisitie: BYOK aanzetten.
      </p>

      <h2>Wat niet doen</h2>
      <ul>
        <li>
          <strong>Niet claims opkloppen.</strong> Een &quot;leidde&quot; in plaats van
          &quot;werkte mee aan&quot; klinkt sterker maar komt terug op je bord in een eerste call. De
          gatekeeper-stap helpt hierbij, maar de eerlijkheid begint bij je eigen input.
        </li>
        <li>
          <strong>Niet één CV voor alle klanten.</strong> Voor zzp-acquisitie is dat dezelfde fout als
          voor sollicitanten: een algemeen document raakt niemand.
        </li>
        <li>
          <strong>Niet onnodig lang.</strong> Twee pagina&apos;s is meestal genoeg. Drie alleen voor
          zeer senior consultancy-rollen waar diepte over meerdere opdrachten ertoe doet.
        </li>
      </ul>
    </>
  );
}
