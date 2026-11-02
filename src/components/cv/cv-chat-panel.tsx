'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, MessageSquare, Bot, User, Trash2, AlertCircle, Coins, TriangleAlert, Check, Wrench } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import { useCVChat } from '@/hooks/use-cv-chat';
import type { CVChatContext } from '@/types/chat';
import type { GeneratedCVContent, ParsedLinkedIn, JobVacancy, FitAnalysis, OutputLanguage } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

interface CVChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  fitAnalysis: FitAnalysis | null;
  currentContent: GeneratedCVContent;
  currentTokens?: CVDesignTokens;
  language: OutputLanguage;
  onContentChange: (content: GeneratedCVContent) => void;
  onTokensChange?: (tokens: CVDesignTokens) => void;
}

// Quick action suggestions — label + prompt live in messages under
// `cvChat.quickActions.<id>.{label,prompt}`.
const QUICK_ACTION_IDS = ['shorterSummary', 'moreNumbers', 'orderSkills', 'improveHeadline'] as const;

// Helper to extract text content from message parts
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');
}

// Map raw tool names to short labels for the user-facing chip (messages under
// `cvChat.tools.<toolName>`). Falls back to a humanized version of the raw
// name when unknown.
type ChatTranslator = { (key: string): string; has: (key: string) => boolean };
function getToolLabel(toolName: string, t: ChatTranslator): string {
  const key = `tools.${toolName}`;
  if (/^[a-z0-9_]+$/i.test(toolName) && t.has(key)) return t(key);
  // Humanize unknown names: "do_something_cool" → "Do something cool"
  return toolName
    .replace(/^tool_/, '')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

// Pull tool-call parts out of a message so we can render them as chips.
// AI SDK v6 emits tool calls as parts with a `type` like "tool-<name>".
function getMessageToolCalls(message: { parts: Array<{ type: string; toolName?: string }> }): string[] {
  return message.parts
    .filter((part) => part.type.startsWith('tool-') || part.type === 'tool-call')
    .map((part) => {
      // Some shapes include toolName directly, others encode it in the type.
      if (part.toolName) return part.toolName;
      return part.type.replace(/^tool-/, '');
    })
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
}

export function CVChatPanel({
  isOpen,
  onClose,
  linkedInData,
  jobVacancy,
  fitAnalysis,
  currentContent,
  currentTokens,
  language,
  onContentChange,
  onTokensChange,
}: CVChatPanelProps) {
  const { llmMode } = useAuth();
  const t = useTranslations('cvChat');
  const tCommon = useTranslations('common');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);

  // Build context for the chat
  const context: CVChatContext = {
    linkedInData,
    jobVacancy,
    fitAnalysis,
    currentContent,
    currentTokens,
    language,
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    clearChat,
    creditWarning,
    totalChars,
  } = useCVChat({ context, onContentChange, onTokensChange });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Hide quick actions after first message
  useEffect(() => {
    if (messages.length > 0) {
      setShowQuickActions(false);
    }
  }, [messages.length]);

  // Handle quick action click
  const handleQuickAction = (prompt: string) => {
    append({ role: 'user', content: prompt });
  };

  // Handle form submission
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-background border-l shadow-lg z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{t('title')}</h2>
          {isLoading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('busy')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title={t('clearChat')}
              aria-label={t('clearChat')}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8" aria-label={tCommon('close')}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm bg-muted rounded-lg p-3">
                {t('welcome')}
              </p>

              {/* Quick actions */}
              {showQuickActions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_ACTION_IDS.map((id) => (
                    <Button
                      key={id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(t(`quickActions.${id}.prompt`))}
                      className="text-xs"
                    >
                      {t(`quickActions.${id}.label`)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((message) => {
          const textContent = getMessageText(message as { parts: Array<{ type: string; text?: string }> });
          const toolCalls = getMessageToolCalls(message as { parts: Array<{ type: string; toolName?: string }> });
          const hasContent = textContent || toolCalls.length > 0;

          return (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Message content */}
              <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                {/* Text content */}
                {textContent && (
                  <div
                    className={`text-sm rounded-lg p-3 max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  </div>
                )}

                {/* Tool-call activity chips — show what the assistant
                    actually changed so the user always has feedback,
                    even when the model only fires a tool without text. */}
                {message.role === 'assistant' && toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[85%]">
                    {toolCalls.map((toolName, idx) => (
                      <span
                        key={`${message.id}-tool-${idx}`}
                        className="inline-flex items-center gap-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5"
                      >
                        <Check className="h-3 w-3" />
                        {getToolLabel(toolName, t)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Fallback: assistant message with no text and no detected
                    tool calls. Show a generic "working" indicator instead
                    of a confusing empty bubble. */}
                {message.role === 'assistant' && !hasContent && (
                  <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                    <Wrench className="h-3 w-3" />
                    {t('changeApplied')}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('thinking')}</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error.message || t('genericError')}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Credit warning banner */}
      {llmMode === 'platform' && creditWarning && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30 border-t">
          <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{t('creditWarning')}</span>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[44px] w-[44px] flex-shrink-0"
            aria-label={t('send')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {t('shiftEnterHint')}
          {llmMode !== 'platform' && (
            <span className="inline-flex items-center ml-2">
              · <Coins className="h-3 w-3 mx-1" aria-hidden="true" />{t('charCount', { used: (totalChars / 1000).toFixed(1) })}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
