'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, MessageSquare, Bot, User, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTemplateChat } from '@/hooks/use-template-chat';
import type { ParsedLinkedIn, JobVacancy, FitAnalysis, OutputLanguage } from '@/types';

interface TemplateChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  fitAnalysis: FitAnalysis | null;
  language: OutputLanguage;
  onRefillComplete: (blob: Blob) => void;
  onCreditsRefresh?: () => void;
}

// Quick action suggestions for template modifications
const getQuickActions = (language: OutputLanguage) => language === 'nl' ? [
  { label: 'Korter & krachtiger', prompt: 'Maak alle teksten korter en krachtiger. Focus op de kern.' },
  { label: 'Meer cijfers', prompt: 'Voeg waar mogelijk concrete cijfers en resultaten toe aan de werkervaring.' },
  { label: 'Meer actiewoorden', prompt: 'Gebruik sterkere actiewoorden aan het begin van elke bullet point.' },
  { label: 'Focus op vacature', prompt: 'Pas de beschrijvingen aan zodat ze beter aansluiten bij de vacature.' },
] : [
  { label: 'Shorter & stronger', prompt: 'Make all text shorter and more impactful. Focus on the essentials.' },
  { label: 'More numbers', prompt: 'Add concrete numbers and results to work experience where possible.' },
  { label: 'Action verbs', prompt: 'Use stronger action verbs at the start of each bullet point.' },
  { label: 'Focus on job', prompt: 'Adjust descriptions to better match the target job vacancy.' },
];

export function TemplateChatPanel({
  isOpen,
  onClose,
  templateId,
  linkedInData,
  jobVacancy,
  fitAnalysis,
  language,
  onRefillComplete,
  onCreditsRefresh,
}: TemplateChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    clearChat,
  } = useTemplateChat({
    templateId,
    linkedInData,
    jobVacancy,
    fitAnalysis,
    language,
    onRefillComplete,
    onCreditsRefresh,
  });

  const quickActions = getQuickActions(language);

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
    // Set input and trigger submit
    const textarea = textareaRef.current;
    if (textarea) {
      // Manually set the value and trigger change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(textarea, prompt);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Submit after a brief delay
      setTimeout(() => {
        handleSubmit();
      }, 50);
    }
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
          <h2 className="font-semibold">
            {language === 'nl' ? 'Template Assistent' : 'Template Assistant'}
          </h2>
          {isLoading && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {language === 'nl' ? 'Bijwerken...' : 'Updating...'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              title={language === 'nl' ? 'Chat wissen' : 'Clear chat'}
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
                {language === 'nl'
                  ? 'Hoi! Ik kan je helpen de ingevulde template aan te passen. Vertel me wat je wilt veranderen, of kies een snelle actie hieronder.'
                  : 'Hi! I can help you adjust the filled template. Tell me what you\'d like to change, or choose a quick action below.'}
              </p>

              {/* Info about how it works */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mt-2">
                <p className="font-medium mb-1">
                  {language === 'nl' ? 'Hoe het werkt:' : 'How it works:'}
                </p>
                <p>
                  {language === 'nl'
                    ? 'Elke aanpassing wordt direct toegepast op de template. Je kunt meerdere aanpassingen na elkaar doen - ze worden gecombineerd.'
                    : 'Each adjustment is applied directly to the template. You can make multiple adjustments - they will be combined.'}
                </p>
              </div>

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
                      disabled={isLoading}
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
        {messages.map((message) => (
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
              <div
                className={`text-sm rounded-lg p-3 max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{language === 'nl' ? 'Template wordt bijgewerkt...' : 'Updating template...'}</span>
            </div>
          </div>
        )}

        {/* Error message (in addition to chat error) */}
        {error && !messages.some(m => m.content.includes(error)) && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={onSubmit} data-template-chat className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={language === 'nl' ? 'Beschrijf je aanpassing...' : 'Describe your change...'}
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
          {language === 'nl' ? 'Shift+Enter voor nieuwe regel' : 'Shift+Enter for new line'}
        </p>
      </div>
    </div>
  );
}
