import type {
  ParsedLinkedIn,
  JobVacancy,
  FitAnalysis,
  GeneratedCVContent,
  GeneratedCVExperience,
  GeneratedCVSkills,
} from './index';

// ============ CV Chat Context ============

/**
 * Full context provided to the AI for CV editing conversations
 */
export interface CVChatContext {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  fitAnalysis: FitAnalysis | null;
  currentContent: GeneratedCVContent;
  language: 'nl' | 'en';
}

// ============ Tool Names ============

export type CVChatToolName =
  | 'update_summary'
  | 'update_headline'
  | 'update_experience'
  | 'update_experience_highlight'
  | 'add_experience_highlight'
  | 'remove_experience_highlight'
  | 'update_education'
  | 'add_skill'
  | 'remove_skill'
  | 'reorder_skills';

// ============ Tool Parameters ============

export interface UpdateSummaryParams {
  newSummary: string;
}

export interface UpdateHeadlineParams {
  newHeadline: string;
}

export interface UpdateExperienceParams {
  experienceIndex: number;
  updates: Partial<Pick<GeneratedCVExperience, 'title' | 'company' | 'location' | 'period'>>;
}

export interface UpdateExperienceHighlightParams {
  experienceIndex: number;
  highlightIndex: number;
  newHighlight: string;
}

export interface AddExperienceHighlightParams {
  experienceIndex: number;
  newHighlight: string;
  position?: 'start' | 'end'; // Default: 'end'
}

export interface RemoveExperienceHighlightParams {
  experienceIndex: number;
  highlightIndex: number;
}

export interface UpdateEducationParams {
  educationIndex: number;
  updates: {
    degree?: string;
    institution?: string;
    year?: string;
    details?: string | null;
  };
}

export interface AddSkillParams {
  skill: string;
  category: 'technical' | 'soft';
  position?: 'start' | 'end'; // Default: 'end'
}

export interface RemoveSkillParams {
  skill: string;
  category: 'technical' | 'soft';
}

export interface ReorderSkillsParams {
  category: 'technical' | 'soft';
  newOrder: string[]; // Full list in new order
}

// ============ Tool Results ============

export interface CVToolResult {
  success: boolean;
  toolName: CVChatToolName;
  updatedContent?: Partial<GeneratedCVContent>;
  error?: string;
}

// ============ Chat Message Types ============

export interface CVChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: CVToolCall[];
  createdAt: Date;
}

export interface CVToolCall {
  toolName: CVChatToolName;
  args: Record<string, unknown>;
  result?: CVToolResult;
  status: 'pending' | 'executing' | 'completed' | 'error';
}

// ============ API Request/Response ============

export interface CVChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context: CVChatContext;
}

export interface CVChatStreamEvent {
  type: 'text-delta' | 'tool-call' | 'tool-result' | 'finish';
  content?: string;
  toolCall?: {
    toolName: CVChatToolName;
    args: Record<string, unknown>;
  };
  toolResult?: CVToolResult;
}
