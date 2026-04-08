/**
 * Centrale tool-registry voor de toekomstige cveetje productie-agent.
 *
 * `createAgentTools(ctx)` retourneert het volledige toolset object dat aan
 * Vercel AI SDK's `streamText({ tools: ... })` doorgegeven kan worden. De
 * snake_case keys hier zijn de tool-namen die de LLM ziet en gebruikt in
 * tool-calls.
 *
 * In v1 wordt deze functie nog door geen runtime aangeroepen — het is een
 * fundament voor v2 wanneer `src/app/api/cv/agent/route.ts` wordt gebouwd.
 * Het schrijven nu zorgt er wel voor dat alle tools type-correct zijn én
 * dat we kunnen valideren dat de naming consistent is met
 * `system-prompt.md`.
 */

import { createParseJobTool } from '../tools/parse-job';
import { createAnalyzeFitTool } from '../tools/analyze-fit';
import { createGenerateCvContentTool } from '../tools/generate-cv-content';
import { createGenerateDesignTokensTool } from '../tools/generate-design-tokens';
import { createGenerateMotivationTool } from '../tools/generate-motivation';
import { createAnalyzeTemplateTool } from '../tools/analyze-template';
import { createFillDocxTool } from '../tools/fill-docx';
import type { ToolContext } from '../tools/_context';

export function createAgentTools(ctx: ToolContext) {
  return {
    parse_job: createParseJobTool(ctx),
    analyze_fit: createAnalyzeFitTool(ctx),
    generate_cv_content: createGenerateCvContentTool(ctx),
    generate_design_tokens: createGenerateDesignTokensTool(ctx),
    generate_motivation: createGenerateMotivationTool(ctx),
    analyze_template: createAnalyzeTemplateTool(ctx),
    fill_docx: createFillDocxTool(ctx),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;
