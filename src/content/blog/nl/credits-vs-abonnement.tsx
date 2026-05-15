import type { Article } from '../../types';

export const meta: Article['meta'] = {
  slug: 'credits-vs-abonnement',
  locale: 'nl',
  title: 'Waarom credits en geen abonnement — over de prijs van een CV',
  description:
    'Vrijwel elke CV-tool werkt met abonnementen. Wij niet. Hier is waarom credits eerlijker zijn — en wat een CV ons echt kost.',
  publishedAt: '2025-11-10',
  updatedAt: '2026-05-15',
  readingMinutes: 5,
  category: 'opinion',
  personas: ['werkzoekenden', 'zzp'],
  keywords: ['CV prijs', 'CV abonnement', 'credits CV', 'CVeetje prijzen', 'pay as you go CV'],
  author: 'niels',
};

export function Body() {
  return (
    <>
      <p className="lede">
        De meeste CV-tools willen €15 of €25 per maand. Klinkt goedkoop tot je beseft dat je &apos;m
        twee keer per jaar gebruikt. Wij doen het anders, en hier is waarom.
      </p>

      <h2>Het abonnementsmodel klopt niet voor CV-tools</h2>
      <p>
        Een CV maak je in bursts. Je hebt een week waarin je vier sollicitaties stuurt, en dan maanden
        waarin je niets doet. Een abonnement van €19/maand kost je over een jaar €228 — terwijl je in dat
        jaar misschien tien sollicitaties hebt verstuurd. Dat is ruim €22 per CV. En dan moet je nog
        opletten dat je niet vergeet op te zeggen.
      </p>
      <p>
        Het is een prijsmodel dat is gekopieerd van streamingdiensten, waar abonnementen wel passen omdat
        je elke maand kijkt. Voor een tool die je in pieken gebruikt, is het ongunstig.
      </p>

      <h2>Wat een gegenereerd CV ons kost</h2>
      <p>
        Eerlijk gezegd: een paar dollarcent aan AI-kosten. Een volledige CV-generatie kost ongeveer
        negen credits in onze platform-modus, en dat correspondeert grofweg met een paar Claude
        Opus-API-calls. We rekenen daar onze marge bovenop — niet veel, want we willen dat het
        toegankelijk blijft.
      </p>
      <p>
        Met onze prijslijst zit een gegenereerd CV inclusief één PDF-download tussen €1,00 en €1,66
        — afhankelijk van welk pack je koopt. Voor wie het rekensommetje wil:
      </p>
      <table>
        <thead>
          <tr>
            <th>Pack</th>
            <th>Prijs</th>
            <th>Credits</th>
            <th>Per CV (≈10 credits)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gratis</td>
            <td>€0</td>
            <td>15/maand</td>
            <td>1 volledig CV per maand</td>
          </tr>
          <tr>
            <td>Starter</td>
            <td>€4,99</td>
            <td>30</td>
            <td>≈ €1,66 per CV</td>
          </tr>
          <tr>
            <td>Popular</td>
            <td>€12,99</td>
            <td>100</td>
            <td>≈ €1,30 per CV</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>€29,99</td>
            <td>300</td>
            <td>≈ €1,00 per CV</td>
          </tr>
          <tr>
            <td>Power</td>
            <td>€59,99</td>
            <td>600</td>
            <td>≈ €1,00 per CV</td>
          </tr>
        </tbody>
      </table>

      <h2>Credits verlopen niet</h2>
      <p>
        Een principe-keuze. Als je €12,99 betaalt voor 100 credits, dan zijn die over een jaar nog van
        jou. Geen &quot;dit pakket vervalt op 31 mei&quot;-bullshit. Het zou raar zijn om wat je
        gekocht hebt af te pakken omdat je een tijdje geen sollicitatie hebt gestuurd.
      </p>

      <h2>De gratis tier is geen lokmiddel</h2>
      <p>
        15 credits per maand. Dat is genoeg voor één volledig gegenereerd CV plus PDF-download, of
        twee/drie kleinere regeneraties. Het is niet veel — maar het is iets. En het verloopt automatisch
        elke maand op de eerste, dus je hebt elke maand opnieuw die ruimte om iets te proberen.
      </p>
      <p>
        Dit is bewust afgesteld op &quot;genoeg om een goed beeld te krijgen of het iets voor je is&quot;,
        niet op &quot;net iets te weinig zodat je betaalt&quot;. Als de gratis tier voor jouw frequentie
        genoeg is, geweldig. Wij hebben er niets aan om je naar credits te dwingen die je niet zou
        gebruiken.
      </p>

      <h2>BYOK als alternatief — gratis behalve je eigen API-kosten</h2>
      <p>
        Voor wie een eigen Claude- of OpenAI-key heeft: je kunt &apos;m versleuteld opslaan in je
        account, en dan kost een AI-generatie aan onze kant nul credits. Je betaalt direct aan de
        provider — wat per CV op een paar dollarcent uitkomt. Voor zware gebruikers (recruiters,
        coaches, bureaus) is dit het schoonste model.
      </p>
      <p>
        We rekenen één credit voor de PDF-download zelf, omdat dat op onze infrastructuur loopt.
        Verder kost dezelfde tool die je in platform-modus op €1,30 per CV uitkomt, in BYOK-modus
        ongeveer €0,15.
      </p>

      <h2>Waarom we dit ook publiekelijk uitleggen</h2>
      <p>
        Twee redenen. Eén: we vinden &quot;maandelijks abonnement op tooling die je nauwelijks
        gebruikt&quot; een vorm van consumentenuitbuiting die we niet willen ondersteunen, ook niet als
        de markt dat doet. Twee: dit soort prijsstructuur uitleggen is in onze ervaring de beste manier om
        het juiste type gebruiker te trekken — mensen die de waarde zien, niet mensen die zijn
        ingelijfd door een goedkope eerste maand.
      </p>

      <div className="callout callout--success">
        <div className="callout-title">In één regel</div>
        <p>
          €0 voor één CV per maand, vanaf €1 voor een gegenereerd CV als je meer wilt, en niets
          dat onbedoeld blijft afschrijven van je rekening.
        </p>
      </div>
    </>
  );
}
