'use client';

import { useState, useCallback, useRef } from 'react';
import type { ParsedLinkedIn, JobVacancy, FitAnalysis, OutputLanguage } from '@/types';

export interface TemplateChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseTemplateChatOptions {
  templateId: string;
  linkedInData: ParsedLinkedIn;
  jobVacancy?: JobVacancy | null;
  fitAnalysis?: FitAnalysis | null;
  language: OutputLanguage;
  onRefillComplete: (blob: Blob) => void;
  onCreditsRefresh?: () => void;
}

/**
 * Custom hook for template chat functionality.
 * Manages chat messages and triggers template re-fills with custom instructions.
 */
export function useTemplateChat({
  templateId,
  linkedInData,
  jobVacancy,
  fitAnalysis,
  language,
  onRefillComplete,
  onCreditsRefresh,
}: UseTemplateChatOptions) {
  const [messages, setMessages] = useState<TemplateChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track accumulated instructions from the conversation
  const accumulatedInstructionsRef = useRef<string[]>([]);

  // Generate a unique message ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to chat
    const userMsg: TemplateChatMessage = {
      id: generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add this instruction to accumulated instructions
    accumulatedInstructionsRef.current.push(userMessage);

    // Show loading state
    setIsLoading(true);

    try {
      // Build combined instructions from all user messages
      const allInstructions = accumulatedInstructionsRef.current.join('\n\n');

      // Call the fill API with custom instructions
      const response = await fetch(`/api/templates/${templateId}/fill?format=docx&skipCredit=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData: linkedInData,
          customValues: {},
          useAI: true,
          jobVacancy: jobVacancy || undefined,
          language,
          fitAnalysis: fitAnalysis || undefined,
          customInstructions: allInstructions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update template');
      }

      const blob = await response.blob();

      // Add assistant response
      const assistantMsg: TemplateChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: language === 'nl'
          ? '✓ Ik heb de aanpassingen doorgevoerd. Bekijk het resultaat in de preview.'
          : '✓ I\'ve applied the changes. Check the result in the preview.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Notify parent of new blob
      onRefillComplete(blob);
      onCreditsRefresh?.();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      // Add error message to chat
      const errorMsg: TemplateChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: language === 'nl'
          ? `❌ Er ging iets mis: ${errorMessage}`
          : `❌ Something went wrong: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, templateId, linkedInData, jobVacancy, fitAnalysis, language, onRefillComplete, onCreditsRefresh]);

  // Append a message programmatically
  const append = useCallback(async (message: { role: 'user' | 'assistant'; content: string }) => {
    if (message.role === 'user') {
      setInput(message.content);
      // Need to wait for state update then submit
      setTimeout(() => {
        const form = document.querySelector('form[data-template-chat]');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }, 0);
    }
  }, []);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    accumulatedInstructionsRef.current = [];
    setError(null);
  }, []);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    clearChat,
  };
}
