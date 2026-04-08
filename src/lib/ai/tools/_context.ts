/**
 * Gedeelde runtime-context die elke tool in `src/lib/ai/tools/*` nodig heeft.
 * Bevat zowel de provider-credentials (die de LLM nooit ziet) als een
 * **mutable session** waarin tools elkaars resultaten kunnen vinden.
 *
 * De factory-pattern (`createXxxTool(ctx)`) sluit deze context binnen een
 * closure. De host-route (bv. `src/app/api/cv/agent/route.ts`) creëert één
 * `ToolContext` per request en geeft die door aan `createAgentTools(ctx)`.
 *
 * Tools schrijven hun resultaten naar `ctx.session` zodat opvolgende tools
 * niet via `inputSchema` complexe objecten hoeven te krijgen. De LLM hoeft
 * dus geen `ParsedLinkedIn` of `JobVacancy` JSON te tikken — die zit al in
 * de session vanaf het moment dat een eerdere tool het heeft geproduceerd.
 */

import type {
  LLMProvider,
  ParsedLinkedIn,
  JobVacancy,
  GeneratedCVContent,
  FitAnalysis,
  OutputLanguage,
} from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

export interface AgentSession {
  /** Profiel — verplicht; de host-route moet dit altijd meegeven. */
  linkedIn: ParsedLinkedIn;
  /** Geparseerde vacature; null tot `parse_job` is gedraaid. */
  jobVacancy: JobVacancy | null;
  /** Fit-analyse; null tot `analyze_fit` is gedraaid. */
  fitAnalysis: FitAnalysis | null;
  /** Gegenereerde CV-content; null tot `generate_cv_content` is gedraaid. */
  cvContent: GeneratedCVContent | null;
  /** Design tokens; null tot `generate_design_tokens` is gedraaid. */
  designTokens: CVDesignTokens | null;
  /** Output-taal voor alle generators. */
  language: OutputLanguage;
}

export interface ToolContext {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  /** Mutable session — tools lezen en schrijven hier. Host-route owned lifetime. */
  session: AgentSession;
}
