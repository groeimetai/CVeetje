import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { decrypt } from '@/lib/encryption';
import { createAIProvider, getModelId } from '@/lib/ai/providers';
import type { CVChatContext } from '@/types/chat';
import type { LLMProvider } from '@/types';
import type { UIMessage } from 'ai';

// Build the system prompt with full context
function buildSystemPrompt(context: CVChatContext): string {
  const { linkedInData, jobVacancy, fitAnalysis, currentContent, language } = context;

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

  return `${langInstructions}

Je helpt gebruikers hun CV te verfijnen door conversationeel te praten over wijzigingen.
Je hebt toegang tot tools om directe wijzigingen in de CV aan te brengen.

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

## Huidige CV Content
- **Headline:** ${currentContent.headline}
- **Samenvatting:** ${currentContent.summary.substring(0, 200)}...
- **Ervaringen:** ${currentContent.experience.map((e, i) => `[${i}] ${e.title} @ ${e.company}`).join(', ')}
- **Technische Skills:** ${currentContent.skills.technical.slice(0, 10).join(', ')}
- **Soft Skills:** ${currentContent.skills.soft.join(', ')}

## Beschikbare Tools
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

    // Get user data with API key
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = userDoc.data();
    if (!userData?.apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key niet geconfigureerd. Voeg je API key toe in Instellingen.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt API key and create provider
    const apiKey = decrypt(userData.apiKey.encryptedKey);
    const provider = userData.apiKey.provider as LLMProvider;
    const model = userData.apiKey.model;

    const aiProvider = createAIProvider(provider, apiKey);
    const modelId = getModelId(provider, model);

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
