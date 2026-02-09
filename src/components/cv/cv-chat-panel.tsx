'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, MessageSquare, Bot, User, Trash2, AlertCircle, Coins } from 'lucide-react';
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

// Quick action suggestions
const quickActions = [
  { label: 'Samenvatting korter', prompt: 'Maak mijn samenvatting korter en krachtiger.' },
  { label: 'Meer cijfers', prompt: 'Voeg meer cijfers en statistieken toe aan mijn werkervaring bullets.' },
  { label: 'Skills ordenen', prompt: 'Orden mijn technische skills op relevantie voor de vacature.' },
  { label: 'Headline verbeteren', prompt: 'Verbeter mijn headline zodat het beter aansluit bij de vacature.' },
];

// Helper to extract text content from message parts
function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('');
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
          <h2 className="font-semibold">CV Assistent</h2>
          {isLoading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Bezig...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title="Chat wissen"
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
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
                Hoi! Ik ben je CV-assistent. Ik kan je helpen om je CV te verfijnen. Vertel me wat je wilt aanpassen, of kies een snelle actie hieronder.
              </p>

              {/* Quick actions */}
              {showQuickActions && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickAction(action.prompt)}
                      className="text-xs"
                    >
                      {action.label}
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
              <span>Denken...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error.message || 'Er is een fout opgetreden. Probeer het opnieuw.'}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Typ je vraag of verzoek..."
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shift+Enter voor nieuwe regel
          {llmMode === 'platform' && (
            <span className="inline-flex items-center ml-2">
              · <Coins className="h-3 w-3 mx-1" />1 credit per bericht
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
