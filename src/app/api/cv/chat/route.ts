import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getModelId } from '@/lib/ai/providers';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import type { CVChatContext } from '@/types/chat';
import type { UIMessage } from 'ai';

// Build the system prompt with full context
function buildSystemPrompt(context: CVChatContext): string {
  const { linkedInData, jobVacancy, fitAnalysis, currentContent, currentTokens, language } = context;

  const langInstructions = language === 'nl'
    ? 'Je bent een Nederlandse CV-assistent. Beantwoord in het Nederlands tenzij de gebruiker Engels spreekt.'
    : 'You are a CV assistant. Respond in English.';

  const jobSection = jobVacancy
    ? `
## Target Job
- **Title:** ${jobVacancy.title}
${jobVacancy.company ? `- **Company:** ${jobVacancy.company}` : ''}
${jobVacancy.industry ? `- **Industry:** ${jobVacancy.industry}` : ''}
- **Key Requirements:** ${jobVacancy.requirements.slice(0, 5).join(', ')}
- **Keywords:** ${jobVacancy.keywords.slice(0, 10).join(', ')}
`
    : '';

  const fitSection = fitAnalysis
    ? `
## Fit Analysis
- **Score:** ${fitAnalysis.overallScore}/100 (${fitAnalysis.verdict})
- **Matched Skills:** ${fitAnalysis.skillMatch.matched.slice(0, 5).join(', ')}
- **Missing Skills:** ${fitAnalysis.skillMatch.missing.slice(0, 5).join(', ')}
- **Strengths:** ${fitAnalysis.strengths.slice(0, 3).map(s => s.message).join('; ')}
`
    : '';

  const styleSection = currentTokens
    ? `
## Huidige CV Styling
- **Theme:** ${currentTokens.themeBase}
- **Header variant:** ${currentTokens.headerVariant}
- **Font pairing:** ${currentTokens.fontPairing}
- **Spacing:** ${currentTokens.spacing}
- **Section stijl:** ${currentTokens.sectionStyle}
- **Kleuren:** primary ${currentTokens.colors.primary}, secondary ${currentTokens.colors.secondary}, accent ${currentTokens.colors.accent}
- **Layout:** ${currentTokens.layout || 'single-column'}${currentTokens.sidebarSections ? ` (sidebar: ${currentTokens.sidebarSections.join(', ')})` : ''}
- **Contact layout:** ${currentTokens.contactLayout || 'single-row'}
- **Skills weergave:** ${currentTokens.skillsDisplay}
- **Accent stijl:** ${currentTokens.accentStyle || 'none'}
- **Naam stijl:** ${currentTokens.nameStyle || 'normal'}
- **Skill tag stijl:** ${currentTokens.skillTagStyle || 'filled'}
- **Tekst schaal:** ${currentTokens.scale}
- **Features:** foto=${currentTokens.showPhoto}, iconen=${currentTokens.useIcons}, ronde hoeken=${currentTokens.roundedCorners}
`
    : '';

  const styleToolsSection = currentTokens
    ? `
## Style Tools
- update_header_variant: Wijzig de header layout (simple, accented, banner, split)
- update_colors: Pas kleuren aan (primary, secondary, accent, text, muted)
- update_font_pairing: Wijzig het lettertype
- update_spacing: Pas de ruimte tussen elementen aan (compact, comfortable, spacious)
- update_section_style: Wijzig de stijl van secties (clean, underlined, boxed, timeline, accent-left, card)
- update_layout: Wijzig de pagina layout (single-column, sidebar-left, sidebar-right) en optioneel welke secties in de sidebar staan
- update_contact_layout: Wijzig hoe contactgegevens worden weergegeven (single-row, double-row, single-column, double-column)
- update_skills_display: Wijzig hoe skills worden weergegeven (tags, list, compact)
- update_accent_style: Wijzig de samenvatting styling (none, border-left, background, quote)
- update_name_style: Wijzig de naam styling (normal, uppercase, extra-bold)
- update_skill_tag_style: Wijzig skill tag variant (filled, outlined, pill)
- update_scale: Wijzig de tekst schaal (small, medium, large)
- toggle_feature: Schakel features aan/uit (showPhoto, useIcons, roundedCorners)`
    : '';

  return `${langInstructions}

Je helpt gebruikers hun CV te verfijnen door conversationeel te praten over wijzigingen.
Je hebt toegang tot tools om directe wijzigingen in de CV aan te brengen.${currentTokens ? ' Je kunt ook de visuele stijl en layout aanpassen via style tools.' : ''}

## BELANGRIJKE REGELS
1. **Wees eerlijk** - Verzin NOOIT ervaring, skills of kwalificaties die de kandidaat niet heeft
2. **Behoud de taal** - Schrijf content in ${language === 'nl' ? 'het Nederlands' : 'English'}
3. **Focus op relevantie** - Help de CV af te stemmen op de doelvacature indien beschikbaar
4. **Leg uit** - Vertel wat je wijzigt en waarom
5. **Vraag bevestiging** - Bij grote of onzekere wijzigingen, vraag eerst of de gebruiker dit wil
6. **Gebruik tools** - Maak wijzigingen via de beschikbare tools, niet via tekstsuggesties

## Kandidaat Profiel
- **Naam:** ${linkedInData.fullName}
${linkedInData.headline ? `- **Huidige Titel:** ${linkedInData.headline}` : ''}
- **Ervaringen:** ${linkedInData.experience.length} posities
- **Skills:** ${linkedInData.skills.slice(0, 10).map(s => s.name).join(', ')}
${jobSection}
${fitSection}
${styleSection}

## Huidige CV Content
- **Headline:** ${currentContent.headline}
- **Samenvatting:** ${currentContent.summary.substring(0, 200)}...
- **Ervaringen:** ${currentContent.experience.map((e, i) => `[${i}] ${e.title} @ ${e.company}`).join(', ')}
- **Technische Skills:** ${currentContent.skills.technical.slice(0, 10).join(', ')}
- **Soft Skills:** ${currentContent.skills.soft.join(', ')}

## Beschikbare Content Tools
- update_summary: Pas de profiel samenvatting aan
- update_headline: Wijzig de professionele headline
- update_experience: Pas ervaring metadata aan (titel, bedrijf, periode)
- update_experience_highlight: Wijzig een specifieke bullet point
- add_experience_highlight: Voeg een nieuwe bullet point toe
- remove_experience_highlight: Verwijder een bullet point
- update_education: Pas opleiding aan
- add_skill: Voeg een skill toe
- remove_skill: Verwijder een skill
- reorder_skills: Herorden skills op relevantie
${styleToolsSection}

Wanneer je wijzigingen maakt:
1. Gebruik de juiste tool
2. Leg kort uit wat je hebt gedaan
3. Vraag of er nog iets aangepast moet worden`;
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from cookie or header
    const cookieStore = await cookies();
    const token = cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const body = await request.json();
    const { messages, context } = body as {
      messages: UIMessage[];
      context: CVChatContext;
    };

    if (!messages || !context || !context.currentContent) {
      return new Response(JSON.stringify({ error: 'Onvolledige request data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert UIMessage[] to ModelMessage[] for streamText
    const modelMessages = (await convertToModelMessages(messages))
      // Filter out messages with empty content arrays — can happen when multi-step
      // tool responses produce empty intermediate blocks (e.g. step-start splitting)
      .filter(msg => !Array.isArray(msg.content) || msg.content.length > 0);

    // Resolve AI provider (handles own-key vs platform mode + credit deduction)
    // Streaming: credit upfront, no refund on failure
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'cv-chat' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw err;
    }

    const aiProvider = resolved.provider;
    const modelId = getModelId(resolved.providerName, resolved.model);

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Define tools for CV editing using tool() helper with inputSchema (AI SDK v6)
    const tools = {
      update_summary: tool({
        description: 'Pas de professionele samenvatting van de CV aan. Gebruik dit om de samenvatting te herschrijven, korter te maken, of te focussen op specifieke aspecten.',
        inputSchema: z.object({
          newSummary: z.string().describe('De nieuwe samenvatting (2-3 zinnen, professioneel, impactvol)'),
        }),
      }),

      update_headline: tool({
        description: 'Wijzig de professionele headline die onder de naam staat. Format: "[Rol] | [Specialisatie]"',
        inputSchema: z.object({
          newHeadline: z.string().describe('De nieuwe headline (bijv. "Senior Developer | Cloud & DevOps")'),
        }),
      }),

      update_experience: tool({
        description: 'Pas de metadata van een werkervaring aan (titel, bedrijf, locatie of periode). Gebruik experienceIndex om aan te geven welke ervaring.',
        inputSchema: z.object({
          experienceIndex: z.number().describe('Index van de ervaring (0 = eerste/meest recente)'),
          title: z.string().optional().describe('Nieuwe functietitel'),
          company: z.string().optional().describe('Nieuwe bedrijfsnaam'),
          location: z.string().nullable().optional().describe('Nieuwe locatie'),
          period: z.string().optional().describe('Nieuwe periode (bijv. "Jan 2020 - Heden")'),
        }),
      }),

      update_experience_highlight: tool({
        description: 'Wijzig een specifieke bullet point van een werkervaring.',
        inputSchema: z.object({
          experienceIndex: z.number().describe('Index van de ervaring'),
          highlightIndex: z.number().describe('Index van de bullet point'),
          newHighlight: z.string().describe('De nieuwe bullet point tekst (actief, met resultaat)'),
        }),
      }),

      add_experience_highlight: tool({
        description: 'Voeg een nieuwe bullet point toe aan een werkervaring.',
        inputSchema: z.object({
          experienceIndex: z.number().describe('Index van de ervaring'),
          newHighlight: z.string().describe('De nieuwe bullet point (actief werkwoord, meetbaar resultaat)'),
          position: z.enum(['start', 'end']).optional().describe('Positie: start of end (default: end)'),
        }),
      }),

      remove_experience_highlight: tool({
        description: 'Verwijder een bullet point van een werkervaring.',
        inputSchema: z.object({
          experienceIndex: z.number().describe('Index van de ervaring'),
          highlightIndex: z.number().describe('Index van de te verwijderen bullet point'),
        }),
      }),

      update_education: tool({
        description: 'Pas een opleiding aan.',
        inputSchema: z.object({
          educationIndex: z.number().describe('Index van de opleiding'),
          degree: z.string().optional().describe('Nieuwe graad/diploma'),
          institution: z.string().optional().describe('Nieuwe instelling'),
          year: z.string().optional().describe('Nieuw jaar/periode'),
          details: z.string().nullable().optional().describe('Nieuwe details (bijv. specialisatie, honours)'),
        }),
      }),

      add_skill: tool({
        description: 'Voeg een nieuwe skill toe aan de CV.',
        inputSchema: z.object({
          skill: z.string().describe('De skill om toe te voegen'),
          category: z.enum(['technical', 'soft']).describe('Categorie: technical of soft'),
          position: z.enum(['start', 'end']).optional().describe('Positie in de lijst (default: end)'),
        }),
      }),

      remove_skill: tool({
        description: 'Verwijder een skill van de CV.',
        inputSchema: z.object({
          skill: z.string().describe('De skill om te verwijderen'),
          category: z.enum(['technical', 'soft']).describe('Categorie: technical of soft'),
        }),
      }),

      reorder_skills: tool({
        description: 'Herorden skills op relevantie voor de doelvacature.',
        inputSchema: z.object({
          category: z.enum(['technical', 'soft']).describe('Welke categorie te herordenen'),
          newOrder: z.array(z.string()).describe('Volledige lijst van skills in nieuwe volgorde'),
        }),
      }),

      // Style tools - only available when design tokens are present
      ...(context.currentTokens ? {
        update_header_variant: tool({
          description: 'Wijzig de header layout van de CV. Kies uit: simple (simpel met lijn), accented (accent balk links), banner (volle achtergrondkleur), split (naam links, contact rechts).',
          inputSchema: z.object({
            variant: z.enum(['simple', 'accented', 'banner', 'split']).describe('De gewenste header variant'),
          }),
        }),

        update_colors: tool({
          description: 'Pas een of meer kleuren van de CV aan. Geef hex kleurwaarden op voor de kleuren die je wilt wijzigen.',
          inputSchema: z.object({
            primary: z.string().optional().describe('Primaire kleur voor naam en kopjes (hex, bijv. "#1a1a1a")'),
            secondary: z.string().optional().describe('Subtiele achtergrondkleur (hex, bijv. "#f5f5f5")'),
            accent: z.string().optional().describe('Accentkleur voor links en highlights (hex, bijv. "#0066cc")'),
            text: z.string().optional().describe('Tekst kleur (hex, bijv. "#333333")'),
            muted: z.string().optional().describe('Kleur voor secundaire tekst zoals datums (hex, bijv. "#666666")'),
          }),
        }),

        update_font_pairing: tool({
          description: 'Wijzig het lettertype van de CV.',
          inputSchema: z.object({
            fontPairing: z.enum([
              'inter-inter', 'playfair-inter', 'montserrat-open-sans',
              'raleway-lato', 'poppins-nunito', 'roboto-roboto',
              'lato-lato', 'merriweather-source-sans', 'oswald-source-sans',
              'dm-serif-dm-sans', 'space-grotesk-work-sans', 'libre-baskerville-source-sans',
            ]).describe('Het gewenste lettertype paar'),
          }),
        }),

        update_spacing: tool({
          description: 'Pas de ruimte tussen elementen aan. Compact = meer inhoud op de pagina, spacious = meer witruimte.',
          inputSchema: z.object({
            spacing: z.enum(['compact', 'comfortable', 'spacious']).describe('De gewenste ruimte'),
          }),
        }),

        update_section_style: tool({
          description: 'Wijzig de stijl van de secties (bijv. werkervaring, opleiding). Kies uit: clean (simpel), underlined (onderstreept), boxed (in box), timeline (tijdlijn), accent-left (accent links), card (kaart).',
          inputSchema: z.object({
            sectionStyle: z.enum(['clean', 'underlined', 'boxed', 'timeline', 'accent-left', 'card']).describe('De gewenste sectie stijl'),
          }),
        }),

        update_layout: tool({
          description: 'Wijzig de pagina layout van de CV. single-column = standaard, sidebar-left = smalle kolom links met skills/talen, sidebar-right = smalle kolom rechts. Je kunt ook aangeven welke secties in de sidebar komen.',
          inputSchema: z.object({
            layout: z.enum(['single-column', 'sidebar-left', 'sidebar-right']).describe('De gewenste layout'),
            sidebarSections: z.array(z.string()).optional().describe('Welke secties in de sidebar (bijv. ["skills", "languages", "certifications"]). Alleen relevant bij sidebar layouts.'),
          }),
        }),

        update_contact_layout: tool({
          description: 'Wijzig hoe contactgegevens in de header worden weergegeven. single-row = alles op één regel, double-row = twee regels, single-column = onder elkaar, double-column = twee kolommen.',
          inputSchema: z.object({
            contactLayout: z.enum(['single-row', 'double-row', 'single-column', 'double-column']).describe('De gewenste contact layout'),
          }),
        }),

        update_skills_display: tool({
          description: 'Wijzig hoe skills worden weergegeven. tags = gekleurde labels, list = opsomming in kolommen, compact = doorlopende tekst met punten.',
          inputSchema: z.object({
            skillsDisplay: z.enum(['tags', 'list', 'compact']).describe('De gewenste skills weergave'),
          }),
        }),

        update_accent_style: tool({
          description: 'Wijzig de styling van de samenvatting/profiel sectie. none = geen extra styling, border-left = accent balk links, background = subtiele achtergrond, quote = cursief met accent balk.',
          inputSchema: z.object({
            accentStyle: z.enum(['none', 'border-left', 'background', 'quote']).describe('De gewenste accent stijl'),
          }),
        }),

        update_name_style: tool({
          description: 'Wijzig hoe de naam wordt weergegeven. normal = standaard, uppercase = hoofdletters met letterspatiëring, extra-bold = extra vet.',
          inputSchema: z.object({
            nameStyle: z.enum(['normal', 'uppercase', 'extra-bold']).describe('De gewenste naam stijl'),
          }),
        }),

        update_skill_tag_style: tool({
          description: 'Wijzig de stijl van skill tags (alleen relevant bij skills weergave "tags"). filled = gevulde achtergrond, outlined = rand zonder vulling, pill = afgeronde pillen.',
          inputSchema: z.object({
            skillTagStyle: z.enum(['filled', 'outlined', 'pill']).describe('De gewenste skill tag stijl'),
          }),
        }),

        update_scale: tool({
          description: 'Wijzig de tekst schaal van de CV. small = kleinere tekst (meer inhoud op pagina), medium = standaard, large = grotere tekst.',
          inputSchema: z.object({
            scale: z.enum(['small', 'medium', 'large']).describe('De gewenste tekst schaal'),
          }),
        }),

        toggle_feature: tool({
          description: 'Schakel een visuele feature aan of uit.',
          inputSchema: z.object({
            feature: z.enum(['showPhoto', 'useIcons', 'roundedCorners']).describe('De feature: showPhoto (profielfoto), useIcons (iconen bij contactgegevens), roundedCorners (ronde hoeken)'),
            enabled: z.boolean().describe('Aan (true) of uit (false)'),
          }),
        }),
      } : {}),
    };

    // Stream the response with tools
    const result = streamText({
      model: aiProvider(modelId),
      system: systemPrompt,
      messages: modelMessages,
      tools,
    });

    // Return UI message stream response (required for useChat with tool calls)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('CV Chat error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Er is een fout opgetreden';

    // Check for specific API errors
    if (errorMessage.includes('API key')) {
      return new Response(
        JSON.stringify({ error: 'Ongeldige API key. Controleer je instellingen.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      return new Response(
        JSON.stringify({ error: 'API limiet bereikt. Probeer het later opnieuw.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
