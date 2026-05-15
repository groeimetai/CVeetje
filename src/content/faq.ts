export interface FaqGroup {
  title: { nl: string; en: string };
  items: { q: { nl: string; en: string }; a: { nl: string; en: string } }[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: { nl: 'Algemeen', en: 'General' },
    items: [
      {
        q: {
          nl: 'Wat is CVeetje precies?',
          en: 'What is CVeetje exactly?',
        },
        a: {
          nl: 'CVeetje is een AI-tool die voor elke vacature een gericht CV genereert vanuit jouw profielgegevens. Je vult één keer je werkervaring, opleiding en vaardigheden in (handmatig, vanuit LinkedIn-PDF, of vanuit een bestaand CV). Daarna plak je een vacaturetekst, en de tool genereert een gericht CV in een gekozen stijl. Output is een PDF; je kunt ook een DOCX-template gebruiken voor eigen huisstijl.',
          en: 'CVeetje is an AI tool that generates a tailored CV per job ad from your profile. You fill in your experience, education, and skills once (manually, from a LinkedIn PDF, or from an existing CV). Then paste a job ad and the tool produces a targeted CV in your chosen style. Output is a PDF; you can also use a DOCX template for your own house style.',
        },
      },
      {
        q: {
          nl: 'Wie zit er achter CVeetje?',
          en: 'Who is behind CVeetje?',
        },
        a: {
          nl: 'CVeetje is een product van GroeimetAI uit Apeldoorn (KvK 90102304). We bouwen het sinds 2025 als specifieke tool voor het Nederlandse en Europese sollicitatieproces. Data wordt opgeslagen in Nederland (europe-west4).',
          en: 'CVeetje is a product of GroeimetAI based in Apeldoorn, the Netherlands (KvK 90102304). Built since 2025 as a tool specifically tuned to the Dutch and European job application process. Data is stored in the Netherlands (europe-west4).',
        },
      },
      {
        q: {
          nl: 'Voor wie is dit bedoeld?',
          en: 'Who is this for?',
        },
        a: {
          nl: 'Voor werkzoekenden die meer dan een paar keer per jaar solliciteren, voor zzp&apos;ers en consultants die per opdracht een gericht CV willen, voor recruiters en loopbaancoaches die voor klanten en kandidaten CV&apos;s maken, en voor product owners en hiring managers die team-CV&apos;s consistent willen houden. Voor wie eenmalig per jaar solliciteert is het waarschijnlijk overkill.',
          en: 'For job seekers applying more than a few times a year; for freelancers and consultants who want a tailored CV per proposal; for recruiters and career coaches building CVs for clients; for product owners and hiring managers keeping team CVs consistent. Probably overkill for one-application-per-year users.',
        },
      },
    ],
  },
  {
    title: { nl: 'Hoe het werkt', en: 'How it works' },
    items: [
      {
        q: {
          nl: 'Hoe lang duurt een CV-generatie?',
          en: 'How long does a CV generation take?',
        },
        a: {
          nl: 'Ongeveer 20–60 seconden voor de generatie zelf. Inclusief de tijd om de output te lezen en eventueel te finetune, ben je vier tot vijf minuten kwijt per sollicitatie — een orde van grootte sneller dan handmatig in Word.',
          en: 'About 20–60 seconds for the generation itself. Including time to read and finetune the output, around four to five minutes per application — an order of magnitude faster than manual Word work.',
        },
      },
      {
        q: {
          nl: 'Wat zijn de vijf stijlen?',
          en: 'What are the five styles?',
        },
        a: {
          nl: 'Conservative (rustig, klassiek), Balanced (default, warm), Creative (twee-koloms, sterkere typografie), Experimental (eigentijds, ruim), Editorial (tijdschrift-stijl). Conservative en Balanced zijn ATS-veilig in ééncoloms structuur; Creative is single-column met meer typografisch ritme; Editorial en Experimental gebruiken visuele kolommen maar bevatten een lineaire tekstlaag waardoor ATS-parsing intact blijft.',
          en: 'Conservative (calm, classic), Balanced (default, warm), Creative (two-column, stronger typography), Experimental (modern, spacious), Editorial (magazine style). Conservative and Balanced are ATS-safe single-column; Creative is single-column with more typographic rhythm; Editorial and Experimental use visual columns but the PDF text layer remains linear for ATS parsing.',
        },
      },
      {
        q: {
          nl: 'Kan ik mijn eigen sjabloon gebruiken?',
          en: 'Can I use my own template?',
        },
        a: {
          nl: 'Ja. Upload een DOCX-template — de AI vult jouw lay-out met je profielgegevens. Werkt voor tabel-gebaseerde, tab-gescheiden, label-met-dubbelpunt, en mixed layouts. Profielfoto-vervanging is ingebouwd.',
          en: 'Yes. Upload a DOCX template — AI fills your layout with profile data. Works for table-based, tab-separated, label-with-colon, and mixed layouts. Profile photo replacement is supported.',
        },
      },
      {
        q: {
          nl: 'Kan ik regenereren als ik niet tevreden ben?',
          en: 'Can I regenerate if I&apos;m not happy?',
        },
        a: {
          nl: 'Ja, onbeperkt. Regeneratie van het hele CV of van specifieke secties. Bij oneerlijkheidsverzoeken (claim opkloppen) vraagt de gatekeeper-stap om bewijs voor er een herziening wordt gemaakt.',
          en: 'Yes, unlimited. Regenerate the full CV or specific sections. If a request inflates a claim, a gatekeeper step asks for supporting evidence before revising.',
        },
      },
    ],
  },
  {
    title: { nl: 'Prijs en credits', en: 'Pricing and credits' },
    items: [
      {
        q: {
          nl: 'Is er een gratis tier?',
          en: 'Is there a free tier?',
        },
        a: {
          nl: 'Ja. 15 credits per maand, voldoende voor één volledige CV-generatie inclusief PDF-download. Vernieuwt elke maand op de 1e.',
          en: 'Yes. 15 credits per month, enough for one full CV generation plus PDF download. Renews on the 1st of each month.',
        },
      },
      {
        q: {
          nl: 'Wat kost een CV?',
          en: 'What does a CV cost?',
        },
        a: {
          nl: 'In platform-modus kost een volledig gegenereerd CV inclusief één PDF-download tussen €1,00 en €1,66, afhankelijk van welk credit-pack je koopt. Starter (€4,99 voor 30 credits) zit op €1,66/CV; Pro (€29,99 voor 300 credits) en Power (€59,99 voor 600 credits) zitten op €1,00/CV. Credits verlopen niet.',
          en: 'In platform mode a full CV generation with one PDF download costs between €1.00 and €1.66 depending on which credit pack you buy. Starter (€4.99 for 30 credits) is €1.66/CV; Pro (€29.99 for 300 credits) and Power (€59.99 for 600 credits) are €1.00/CV. Credits never expire.',
        },
      },
      {
        q: {
          nl: 'Waarom geen abonnement?',
          en: 'Why no subscription?',
        },
        a: {
          nl: 'Sollicitaties komen in bursts — een paar weken intensief, dan stil. Een abonnement past niet bij dat patroon. Credits zonder vervaldatum zijn eerlijker voor de gebruiker.',
          en: 'Job applications come in bursts — a few intense weeks, then quiet. Subscriptions don&apos;t fit that pattern. Non-expiring credits are fairer to the user.',
        },
      },
      {
        q: {
          nl: 'Kan ik mijn eigen AI-key gebruiken (BYOK)?',
          en: 'Can I use my own AI key (BYOK)?',
        },
        a: {
          nl: 'Ja. Sla je Claude-, OpenAI- of Google-API-key versleuteld op (AES-256) en alle AI-stappen kosten 0 platform-credits. Alleen de PDF-download kost 1 credit aan onze kant. Je betaalt direct aan de provider — typisch een paar eurocent per CV. Aanrader voor wie meer dan ~20 CV&apos;s per maand maakt.',
          en: 'Yes. Store your Claude, OpenAI, or Google API key encrypted (AES-256) and all AI steps cost 0 platform credits. Only the PDF download costs 1 credit on our side. You pay your provider directly — typically a few cents per CV. Recommended above ~20 CVs/month.',
        },
      },
      {
        q: {
          nl: 'Wat als ik halverwege wil opzeggen?',
          en: 'What if I want to cancel mid-way?',
        },
        a: {
          nl: 'Er is niets om op te zeggen — geen abonnement. Credits die je hebt gekocht blijven van jou; ze verlopen niet. Je account kun je altijd verwijderen vanuit je instellingen.',
          en: 'Nothing to cancel — no subscription. Credits you bought stay yours; they don&apos;t expire. Account deletion is in your settings.',
        },
      },
    ],
  },
  {
    title: { nl: 'Data en privacy', en: 'Data and privacy' },
    items: [
      {
        q: {
          nl: 'Waar staat mijn data?',
          en: 'Where is my data stored?',
        },
        a: {
          nl: 'In Nederland — Firebase europe-west4 (Eemshaven). Je profielgegevens, gegenereerde CV&apos;s en versleutelde API-keys staan in Firestore en Cloud Storage in deze regio.',
          en: 'In the Netherlands — Firebase europe-west4 (Eemshaven). Your profile data, generated CVs, and encrypted API keys live in Firestore and Cloud Storage in that region.',
        },
      },
      {
        q: {
          nl: 'Wie kan mijn data zien?',
          en: 'Who can see my data?',
        },
        a: {
          nl: 'Je gegevens zijn alleen toegankelijk voor jou (en in noodgevallen voor een admin met expliciete audit-logging). Bij platform-mode wordt je CV-data tijdens generatie verwerkt door Anthropic (Claude). Bij BYOK wordt het verwerkt door de provider waar jouw key toe behoort. Zie ons privacybeleid en de sub-processors-pagina voor de volledige lijst.',
          en: 'Your data is accessible only to you (and to an admin in emergencies with explicit audit logging). In platform mode your CV data is processed by Anthropic (Claude) during generation. In BYOK mode it&apos;s processed by your chosen provider. See our privacy policy and sub-processors page for the full list.',
        },
      },
      {
        q: {
          nl: 'Hoe wordt mijn API-key opgeslagen?',
          en: 'How is my API key stored?',
        },
        a: {
          nl: 'AES-256-versleuteld in Firestore. De sleutel om te ontsleutelen kent alleen onze applicatieserver. De key wordt nooit naar de browser of naar logs gestuurd; bij elke AI-call wordt de key in geheugen ontsleuteld, gebruikt, en weggegooid.',
          en: 'AES-256 encrypted in Firestore. The decryption key is known only to our application server. The key is never sent to the browser or to logs; on each AI call the key is decrypted in memory, used for one request, then discarded.',
        },
      },
      {
        q: {
          nl: 'Worden mijn CV&apos;s gebruikt om AI mee te trainen?',
          en: 'Are my CVs used to train AI?',
        },
        a: {
          nl: 'Nee. We trainen geen modellen op gebruikersdata. De providers waar wij API-calls naar doen (Anthropic via platform-mode) hanteren in hun zakelijke voorwaarden geen training op API-input. Bij BYOK is dit afhankelijk van je provider — onze data-flow voegt geen training-pad toe.',
          en: 'No. We don&apos;t train models on user data. The providers we call (Anthropic via platform mode) don&apos;t train on enterprise API input per their terms. In BYOK mode this depends on your provider — our data flow doesn&apos;t add a training path.',
        },
      },
      {
        q: {
          nl: 'Kan ik mijn data verwijderen?',
          en: 'Can I delete my data?',
        },
        a: {
          nl: 'Ja. Vanuit je instellingen kun je je account verwijderen — al je profielgegevens, gegenereerde CV&apos;s en API-keys worden definitief gewist. Audit-logs van admin-acties die op jouw account betrekking hadden blijven beperkt opgeslagen volgens onze retentie-policy (zie AVG-dossier).',
          en: 'Yes. Settings → Delete account permanently erases profile data, generated CVs, and API keys. Audit logs of admin actions related to your account are retained briefly per our retention policy (see GDPR documentation).',
        },
      },
    ],
  },
  {
    title: { nl: 'Eerlijkheid en AI-gebruik', en: 'Honesty and AI use' },
    items: [
      {
        q: {
          nl: 'Verzint CVeetje ervaring of skills?',
          en: 'Does CVeetje invent experience or skills?',
        },
        a: {
          nl: 'Nee. Eerlijkheidsregels zijn in de prompts ingebouwd. De AI mag herordenen, framen en herwoorden — niet erbij verzinnen. Bij regeneratie-verzoeken die een claim opkloppen vraagt een aparte gatekeeper-stap om concreet bewijsmateriaal voor de wijziging.',
          en: 'No. Honesty rules are built into the prompts. The AI may reorder, reframe, and reword — never fabricate. Regeneration requests that inflate a claim trigger a gatekeeper step asking for concrete evidence before applying the change.',
        },
      },
      {
        q: {
          nl: 'Kunnen recruiters zien dat een CV door AI is gemaakt?',
          en: 'Can recruiters tell a CV was AI-generated?',
        },
        a: {
          nl: 'Soms. Onbewerkte AI-CV&apos;s hebben patronen (vaste bullet-lengtes, drie-deelzinnen, AI-vocabulaire) die ervaren recruiters herkennen. De humanizer-pass op motivatiebrieven verwijdert de bekendste patronen actief, en de tool maakt geen verborgen watermerk in PDF&apos;s. We vinden dat een hiring manager gelijk speelveld moet hebben — geen detector op de rug van kandidaten.',
          en: 'Sometimes. Raw AI CVs have patterns (uniform bullet lengths, rule-of-three, AI vocabulary) experienced recruiters recognise. Our humanizer pass for cover letters actively removes the best-known patterns, and we don&apos;t embed any hidden watermark in PDFs. We believe hiring managers deserve a level playing field — not a detector hidden on candidates&apos; backs.',
        },
      },
      {
        q: {
          nl: 'Wat is de dispute-flow?',
          en: 'What is the dispute flow?',
        },
        a: {
          nl: 'Als je een gegenereerd CV niet eens bent met iets, klik je op &quot;Niet eens&quot; en leg je uit waarom. Een aparte AI-call beoordeelt of je punt feitelijk klopt (gratis herziening), of een opwaardering vraagt zonder bewijs (bewijsverzoek), of een redelijke toon-/opmaakwijziging is (vrij voor herziening).',
          en: 'If you disagree with something in a generated CV, click &quot;Disagree&quot; and explain why. A separate AI call assesses whether your point is factually right (free revision), an upgrade without evidence (evidence request), or a reasonable tone/format change (free revision).',
        },
      },
    ],
  },
  {
    title: { nl: 'ATS en compatibiliteit', en: 'ATS and compatibility' },
    items: [
      {
        q: {
          nl: 'Zijn CVeetje-CV&apos;s ATS-vriendelijk?',
          en: 'Are CVeetje CVs ATS-friendly?',
        },
        a: {
          nl: 'Ja. Alle vijf stijlen gebruiken Puppeteer met expliciete print-CSS. Geen transforms die parsers verwarren, geen tekst in afbeeldingen, en hyperlinks zijn klikbaar. Conservative, Balanced en Creative zijn één-koloms; Editorial en Experimental gebruiken visuele kolommen maar de PDF tekstlaag is lineair.',
          en: 'Yes. All five styles use Puppeteer with explicit print CSS. No transforms that confuse parsers, no text in images, and links are clickable. Conservative, Balanced, and Creative are single column; Editorial and Experimental use visual columns but the PDF text layer is linear.',
        },
      },
      {
        q: {
          nl: 'Welke export-formaten zijn er?',
          en: 'What export formats are available?',
        },
        a: {
          nl: 'Standaard: PDF met echte tekstlaag. Voor DOCX-template-flow: jouw eigen Word-template ingevuld. Standaard DOCX-export is op de roadmap — we werken eraan.',
          en: 'Default: PDF with a real text layer. For DOCX template flow: your own Word template filled in. Standard DOCX export is on the roadmap.',
        },
      },
      {
        q: {
          nl: 'Welke talen worden ondersteund?',
          en: 'Which languages are supported?',
        },
        a: {
          nl: 'Negen talen voor zowel CV als motivatiebrief: Nederlands, Engels, Duits, Frans, Spaans, Italiaans, Portugees, Pools en Roemeens. De interface zelf is in NL en EN.',
          en: 'Nine languages for both CV and cover letter: Dutch, English, German, French, Spanish, Italian, Portuguese, Polish, and Romanian. The interface itself is in NL and EN.',
        },
      },
    ],
  },
];
