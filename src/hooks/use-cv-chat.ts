'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { CHAT_CHAR_LIMIT } from '@/lib/ai/platform-config';
import type { CVChatContext, CVChatToolName } from '@/types/chat';
import type { GeneratedCVContent, GeneratedCVExperience, GeneratedCVEducation } from '@/types';
import type { CVDesignTokens, HeaderVariant, FontPairing, SpacingScale, SectionStyle, CVLayout, ContactLayout, SkillsDisplay, AccentStyle, NameStyle, SkillTagStyle, TypeScale } from '@/types/design-tokens';

interface UseCVChatOptions {
  context: CVChatContext;
  onContentChange: (content: GeneratedCVContent) => void;
  onTokensChange?: (tokens: CVDesignTokens) => void;
}

interface ToolCallArgs {
  newSummary?: string;
  newHeadline?: string;
  experienceIndex?: number;
  highlightIndex?: number;
  newHighlight?: string;
  position?: 'start' | 'end';
  educationIndex?: number;
  title?: string;
  company?: string;
  location?: string | null;
  period?: string;
  degree?: string;
  institution?: string;
  year?: string;
  details?: string | null;
  skill?: string;
  category?: 'technical' | 'soft';
  newOrder?: string[];
  // Style tool args
  layout?: string;
  sidebarSections?: string[];
  variant?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  text?: string;
  muted?: string;
  fontPairing?: string;
  spacing?: string;
  sectionStyle?: string;
  contactLayout?: string;
  skillsDisplay?: string;
  accentStyle?: string;
  nameStyle?: string;
  skillTagStyle?: string;
  scale?: string;
  feature?: string;
  enabled?: boolean;
}

const STYLE_TOOL_NAMES: CVChatToolName[] = [
  'update_header_variant',
  'update_colors',
  'update_font_pairing',
  'update_spacing',
  'update_section_style',
  'update_layout',
  'update_contact_layout',
  'update_skills_display',
  'update_accent_style',
  'update_name_style',
  'update_skill_tag_style',
  'update_scale',
  'toggle_feature',
];

// Apply style tool call to tokens - pure function
function applyStyleToolCall(
  toolName: CVChatToolName,
  args: ToolCallArgs,
  currentTokens: CVDesignTokens
): CVDesignTokens | null {
  switch (toolName) {
    case 'update_header_variant': {
      if (args.variant) {
        return { ...currentTokens, headerVariant: args.variant as HeaderVariant };
      }
      break;
    }
    case 'update_colors': {
      const newColors = { ...currentTokens.colors };
      if (args.primary) newColors.primary = args.primary;
      if (args.secondary) newColors.secondary = args.secondary;
      if (args.accent) newColors.accent = args.accent;
      if (args.text) newColors.text = args.text;
      if (args.muted) newColors.muted = args.muted;
      return { ...currentTokens, colors: newColors };
    }
    case 'update_font_pairing': {
      if (args.fontPairing) {
        return { ...currentTokens, fontPairing: args.fontPairing as FontPairing };
      }
      break;
    }
    case 'update_spacing': {
      if (args.spacing) {
        return { ...currentTokens, spacing: args.spacing as SpacingScale };
      }
      break;
    }
    case 'update_section_style': {
      if (args.sectionStyle) {
        return { ...currentTokens, sectionStyle: args.sectionStyle as SectionStyle };
      }
      break;
    }
    case 'update_layout': {
      if (args.layout) {
        const updated: CVDesignTokens = { ...currentTokens, layout: args.layout as CVLayout };
        if (args.sidebarSections) {
          updated.sidebarSections = args.sidebarSections;
        }
        return updated;
      }
      break;
    }
    case 'update_contact_layout': {
      if (args.contactLayout) {
        return { ...currentTokens, contactLayout: args.contactLayout as ContactLayout };
      }
      break;
    }
    case 'update_skills_display': {
      if (args.skillsDisplay) {
        return { ...currentTokens, skillsDisplay: args.skillsDisplay as SkillsDisplay };
      }
      break;
    }
    case 'update_accent_style': {
      if (args.accentStyle) {
        return { ...currentTokens, accentStyle: args.accentStyle as AccentStyle };
      }
      break;
    }
    case 'update_name_style': {
      if (args.nameStyle) {
        return { ...currentTokens, nameStyle: args.nameStyle as NameStyle };
      }
      break;
    }
    case 'update_skill_tag_style': {
      if (args.skillTagStyle) {
        return { ...currentTokens, skillTagStyle: args.skillTagStyle as SkillTagStyle };
      }
      break;
    }
    case 'update_scale': {
      if (args.scale) {
        return { ...currentTokens, scale: args.scale as TypeScale };
      }
      break;
    }
    case 'toggle_feature': {
      if (args.feature && typeof args.enabled === 'boolean') {
        const key = args.feature as 'showPhoto' | 'useIcons' | 'roundedCorners';
        return { ...currentTokens, [key]: args.enabled };
      }
      break;
    }
  }
  return null;
}

// Apply tool call to content - pure function
function applyToolCallToContent(
  toolName: CVChatToolName,
  args: ToolCallArgs,
  currentContent: GeneratedCVContent
): GeneratedCVContent | null {
  const updatedContent = { ...currentContent };

  switch (toolName) {
    case 'update_summary':
      if (args.newSummary) {
        return { ...updatedContent, summary: args.newSummary };
      }
      break;

    case 'update_headline':
      if (args.newHeadline) {
        return { ...updatedContent, headline: args.newHeadline };
      }
      break;

    case 'update_experience': {
      const expIndex = args.experienceIndex;
      if (typeof expIndex === 'number' && expIndex < updatedContent.experience.length) {
        const newExperience = [...updatedContent.experience];
        const updates: Partial<GeneratedCVExperience> = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.company !== undefined) updates.company = args.company;
        if (args.location !== undefined) updates.location = args.location;
        if (args.period !== undefined) updates.period = args.period;
        newExperience[expIndex] = { ...newExperience[expIndex], ...updates };
        return { ...updatedContent, experience: newExperience };
      }
      break;
    }

    case 'update_experience_highlight': {
      const expIdx = args.experienceIndex;
      const highlightIdx = args.highlightIndex;
      const newHighlight = args.newHighlight;
      if (
        typeof expIdx === 'number' &&
        typeof highlightIdx === 'number' &&
        typeof newHighlight === 'string' &&
        expIdx < updatedContent.experience.length &&
        highlightIdx < updatedContent.experience[expIdx].highlights.length
      ) {
        const newExperience = [...updatedContent.experience];
        const newHighlights = [...newExperience[expIdx].highlights];
        newHighlights[highlightIdx] = newHighlight;
        newExperience[expIdx] = { ...newExperience[expIdx], highlights: newHighlights };
        return { ...updatedContent, experience: newExperience };
      }
      break;
    }

    case 'add_experience_highlight': {
      const expIndex2 = args.experienceIndex;
      const newHighlight2 = args.newHighlight;
      const position = args.position || 'end';
      if (
        typeof expIndex2 === 'number' &&
        typeof newHighlight2 === 'string' &&
        expIndex2 < updatedContent.experience.length
      ) {
        const newExperience = [...updatedContent.experience];
        const newHighlights = [...newExperience[expIndex2].highlights];
        if (position === 'start') {
          newHighlights.unshift(newHighlight2);
        } else {
          newHighlights.push(newHighlight2);
        }
        newExperience[expIndex2] = { ...newExperience[expIndex2], highlights: newHighlights };
        return { ...updatedContent, experience: newExperience };
      }
      break;
    }

    case 'remove_experience_highlight': {
      const expIdx2 = args.experienceIndex;
      const highlightIdx2 = args.highlightIndex;
      if (
        typeof expIdx2 === 'number' &&
        typeof highlightIdx2 === 'number' &&
        expIdx2 < updatedContent.experience.length &&
        highlightIdx2 < updatedContent.experience[expIdx2].highlights.length
      ) {
        const newExperience = [...updatedContent.experience];
        const newHighlights = [...newExperience[expIdx2].highlights];
        newHighlights.splice(highlightIdx2, 1);
        newExperience[expIdx2] = { ...newExperience[expIdx2], highlights: newHighlights };
        return { ...updatedContent, experience: newExperience };
      }
      break;
    }

    case 'update_education': {
      const eduIndex = args.educationIndex;
      if (typeof eduIndex === 'number' && eduIndex < updatedContent.education.length) {
        const newEducation = [...updatedContent.education];
        const eduUpdates: Partial<GeneratedCVEducation> = {};
        if (args.degree !== undefined) eduUpdates.degree = args.degree;
        if (args.institution !== undefined) eduUpdates.institution = args.institution;
        if (args.year !== undefined) eduUpdates.year = args.year;
        if (args.details !== undefined) eduUpdates.details = args.details;
        newEducation[eduIndex] = { ...newEducation[eduIndex], ...eduUpdates };
        return { ...updatedContent, education: newEducation };
      }
      break;
    }

    case 'add_skill': {
      const skill = args.skill;
      const category = args.category;
      const pos = args.position || 'end';
      if (typeof skill === 'string' && category) {
        const newSkills = { ...updatedContent.skills };
        const currentSkills = [...newSkills[category]];
        if (!currentSkills.includes(skill)) {
          if (pos === 'start') {
            currentSkills.unshift(skill);
          } else {
            currentSkills.push(skill);
          }
          newSkills[category] = currentSkills;
          return { ...updatedContent, skills: newSkills };
        }
      }
      break;
    }

    case 'remove_skill': {
      const skillToRemove = args.skill;
      const cat = args.category;
      if (typeof skillToRemove === 'string' && cat) {
        const newSkills = { ...updatedContent.skills };
        const currentSkills = newSkills[cat].filter((s) => s !== skillToRemove);
        if (currentSkills.length !== newSkills[cat].length) {
          newSkills[cat] = currentSkills;
          return { ...updatedContent, skills: newSkills };
        }
      }
      break;
    }

    case 'reorder_skills': {
      const reorderCategory = args.category;
      const newOrder = args.newOrder;
      if (reorderCategory && Array.isArray(newOrder)) {
        const newSkills = { ...updatedContent.skills };
        newSkills[reorderCategory] = newOrder;
        return { ...updatedContent, skills: newSkills };
      }
      break;
    }
  }

  return null;
}

/**
 * Custom hook for CV chat functionality.
 * Wraps useChat and handles tool calls to update CV content.
 */
export function useCVChat({ context, onContentChange, onTokensChange }: UseCVChatOptions) {
  const [input, setInput] = useState('');
  const [chargedCredits, setChargedCredits] = useState(0);
  const chargedCreditsRef = useRef(0);

  // Use refs to avoid stale closures in callbacks
  const contextRef = useRef(context);
  const onContentChangeRef = useRef(onContentChange);
  const onTokensChangeRef = useRef(onTokensChange);
  contextRef.current = context;
  onContentChangeRef.current = onContentChange;
  onTokensChangeRef.current = onTokensChange;

  // Ref for addToolOutput — needed inside onToolCall which is defined before useChat returns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addToolOutputRef = useRef<(args: any) => Promise<void>>(undefined);

  // Create transport with context + chargedCredits in body
  // chargedCredits uses a getter so the transport always reads the latest ref value
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/cv/chat',
    body: {
      context,
      get chargedCredits() { return chargedCreditsRef.current; },
    },
  }), [context]);

  const {
    messages,
    setMessages,
    error,
    status,
    sendMessage,
    stop,
    addToolOutput,
  } = useChat({
    transport,
    onToolCall: ({ toolCall }) => {
      // Extract args from the tool call input
      const args = (toolCall as { input?: ToolCallArgs }).input || {};
      const toolName = toolCall.toolName as CVChatToolName;

      let applied = false;

      // Check if this is a style tool
      if (STYLE_TOOL_NAMES.includes(toolName) && contextRef.current.currentTokens) {
        const updatedTokens = applyStyleToolCall(
          toolName,
          args,
          contextRef.current.currentTokens
        );
        if (updatedTokens) {
          onTokensChangeRef.current?.(updatedTokens);
          applied = true;
        }
      } else {
        // Content tool
        const updatedContent = applyToolCallToContent(
          toolName,
          args,
          contextRef.current.currentContent
        );
        if (updatedContent) {
          onContentChangeRef.current(updatedContent);
          applied = true;
        }
      }

      // Mark the tool call as completed with output so the AI SDK includes
      // a tool-result in subsequent messages (prevents MissingToolResultsError)
      addToolOutputRef.current?.({
        tool: toolCall.toolName,
        toolCallId: (toolCall as { toolCallId: string }).toolCallId,
        output: applied
          ? `Applied ${toolCall.toolName} successfully`
          : `No changes needed for ${toolCall.toolName}`,
      });
    },
  });

  // Store addToolOutput in ref (available before onToolCall fires during streaming)
  addToolOutputRef.current = addToolOutput;

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || status === 'streaming') return;

    const message = input.trim();

    setInput('');
    await sendMessage({ text: message });
  }, [input, sendMessage, status]);

  // Append a message programmatically (e.g. quick actions)
  const append = useCallback(async (message: { role: 'user' | 'assistant'; content: string }) => {
    if (message.role === 'user') {
      await sendMessage({ text: message.content });
    }
  }, [sendMessage]);

  // Clear chat history and reset credits
  const clearChat = useCallback(() => {
    setMessages([]);
    chargedCreditsRef.current = 0;
    setChargedCredits(0);
  }, [setMessages]);

  // Compute total chars across all messages for the UI counter
  const totalChars = useMemo(() => {
    return messages.reduce((sum, msg) => {
      const text = (msg.parts ?? [])
        .filter((p) => p.type === 'text')
        .map((p) => ('text' in p ? (p as { text: string }).text : ''))
        .join('');
      return sum + text.length;
    }, 0);
  }, [messages]);

  // When AI responds we may have crossed a credit boundary — update chargedCredits
  // so the next request sends the correct value
  useEffect(() => {
    const required = Math.max(messages.length > 0 ? 1 : 0, Math.ceil(totalChars / CHAT_CHAR_LIMIT));
    if (required > chargedCreditsRef.current) {
      chargedCreditsRef.current = required;
      setChargedCredits(required);
    }
  }, [totalChars, messages.length]);

  // Warning: next message will cost another credit
  const creditWarning = messages.length > 0 && Math.ceil(totalChars / CHAT_CHAR_LIMIT) >= chargedCredits;

  const isLoading = status === 'streaming' || status === 'submitted';

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    stop,
    clearChat,
    creditWarning,
    chargedCredits,
    totalChars,
  };
}
