/**
 * Cveetje agent runtime — Vercel AI SDK streamText() loop met multi-step
 * tool execution. Eerste echte runtime-instantiatie van de tools-laag uit
 * `src/lib/ai/tools/*` en de system prompt uit `src/lib/ai/agent/system-prompt.ts`.
 *
 * **Status**: v2 — naast de bestaande wizard-flow. De wizard blijft de
 * default user experience; deze route is voor de toekomstige "agent mode"
 * in het dashboard.
 *
 * **Auth**: tijdelijk de bestaande 8-liner Firebase token-check. Wordt in
 * een latere stap vervangen door `withUser()`.
 *
 * **Credits**: gebruikt `cv-chat` als platform-operatie (cost = 0). Geen
 * extra credit-deductie per tool-call. PDF-download blijft het enige
 * credit-aftrekpunt — conform de plan-regel uit het agentic transitie plan.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';
import { getAdminAuth } from '@/lib/firebase/admin';
import { getModelId } from '@/lib/ai/providers';
import { resolveProvider, ProviderError } from '@/lib/ai/platform-provider';
import { CVEETJE_AGENT_SYSTEM_PROMPT } from '@/lib/ai/agent/system-prompt';
import { createAgentTools } from '@/lib/ai/agent/tools-index';
import type { ToolContext, AgentSession } from '@/lib/ai/tools/_context';
import type {
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  FitAnalysis,
  OutputLanguage,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

interface AgentRequestContext {
  linkedIn: ParsedLinkedIn;
  jobVacancy?: JobVacancy | null;
  fitAnalysis?: FitAnalysis | null;
  cvContent?: GeneratedCVContent | null;
  designTokens?: CVDesignTokens | null;
  language?: OutputLanguage;
}

interface AgentRequestBody {
  messages: UIMessage[];
  context: AgentRequestContext;
}

const MAX_AGENT_STEPS = 10;

/**
 * Bouw een korte session-context-blok dat aan de system prompt wordt
 * toegevoegd zodat de LLM weet wat al in de session zit en wat hij niet
 * opnieuw hoeft te genereren.
 *
 * Houdt het beknopt — geen volledige JSON dumps die de context window
 * opslokken.
 */
function buildSessionContextBlock(session: AgentSession): string {
  const lines: string[] = ['## Sessie context'];

  lines.push(`- **Profiel**: ${session.linkedIn.fullName}${session.linkedIn.headline ? ` (${session.linkedIn.headline})` : ''}`);
  lines.push(`  - Ervaring: ${session.linkedIn.experience.length} entries`);
  lines.push(`  - Opleiding: ${session.linkedIn.education.length} entries`);
  lines.push(`  - Skills: ${session.linkedIn.skills.length}`);

  if (session.jobVacancy) {
    lines.push(`- **Vacature**: ${session.jobVacancy.title}${session.jobVacancy.company ? ` @ ${session.jobVacancy.company}` : ''}`);
    if (session.jobVacancy.industry) {
      lines.push(`  - Industry: ${session.jobVacancy.industry}`);
    }
  } else {
    lines.push('- **Vacature**: nog niet geladen — call `parse_job` als de gebruiker een vacature plakt.');
  }

  if (session.fitAnalysis) {
    lines.push(`- **Fit-analyse**: score ${session.fitAnalysis.overallScore}/100 (${session.fitAnalysis.verdict})`);
  }

  if (session.cvContent) {
    lines.push(`- **CV-content**: gegenereerd (${session.cvContent.experience.length} experience entries)`);
  }

  if (session.designTokens) {
    lines.push(`- **Design tokens**: ${session.designTokens.styleName} (${session.designTokens.themeBase})`);
  }

  lines.push(`- **Output-taal**: ${session.language}`);

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    // ---------- Auth (tijdelijk de 8-liner; v2c migreert naar withUser) ----------
    const cookieStore = await cookies();
    const token =
      cookieStore.get('firebase-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
      const decodedToken = await getAdminAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ---------- Body parsing ----------
    const body = (await request.json()) as AgentRequestBody;
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }
    if (!context?.linkedIn) {
      return NextResponse.json(
        { error: 'context.linkedIn is required — agent needs a profile to work with' },
        { status: 400 },
      );
    }

    // ---------- Provider resolution (BYOK + credit handling) ----------
    let resolved;
    try {
      resolved = await resolveProvider({ userId, operation: 'cv-chat' });
    } catch (err) {
      if (err instanceof ProviderError) {
        return NextResponse.json({ error: err.message }, { status: err.statusCode });
      }
      throw err;
    }

    // ---------- Build mutable session ----------
    const session: AgentSession = {
      linkedIn: context.linkedIn,
      jobVacancy: context.jobVacancy ?? null,
      fitAnalysis: context.fitAnalysis ?? null,
      cvContent: context.cvContent ?? null,
      designTokens: context.designTokens ?? null,
      language: context.language ?? 'nl',
    };

    // ---------- Build tool context ----------
    const toolCtx: ToolContext = {
      provider: resolved.providerName as ToolContext['provider'],
      apiKey: resolved.apiKey,
      model: resolved.model,
      session,
    };

    const tools = createAgentTools(toolCtx);

    // ---------- Build system prompt with session context ----------
    const systemPrompt = `${CVEETJE_AGENT_SYSTEM_PROMPT}\n\n${buildSessionContextBlock(session)}`;

    // ---------- Convert UI messages to model messages ----------
    const modelMessages = (await convertToModelMessages(messages)).filter(
      (msg) => !Array.isArray(msg.content) || msg.content.length > 0,
    );

    // ---------- Stream with multi-step tool execution ----------
    const result = streamText({
      model: resolved.provider(getModelId(resolved.providerName, resolved.model)),
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[CV Agent] error:', error);
    const message = error instanceof Error ? error.message : 'Onbekende fout';

    if (message.includes('API key')) {
      return NextResponse.json(
        { error: 'Ongeldige API key. Controleer je instellingen.' },
        { status: 400 },
      );
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'API limiet bereikt. Probeer het later opnieuw.' },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
