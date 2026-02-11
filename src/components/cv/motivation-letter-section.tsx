'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Coins,
  Loader2,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Mail,
  FileType,
  File,
} from 'lucide-react';
import type { GeneratedMotivationLetter, OutputLanguage, TokenUsage } from '@/types';

interface MotivationLetterSectionProps {
  cvId: string;
  credits: number;
  language: OutputLanguage;
  onCreditsUsed?: () => void;
  onTokenUsage?: (usage: TokenUsage) => void;
}

// Placeholder suggestions for personal motivation
const MOTIVATION_PLACEHOLDERS = {
  nl: [
    'Ik ben al jaren fan van jullie producten/diensten...',
    'De bedrijfscultuur spreekt mij aan omdat...',
    'Ik wil graag bijdragen aan jullie missie om...',
    'Deze rol past perfect bij mijn ambitie om...',
    'Na jaren ervaring in [vakgebied] wil ik nu...',
  ],
  en: [
    "I've been following your company's innovations...",
    'Your company culture resonates with me because...',
    "I'm excited to contribute to your mission of...",
    'This role aligns perfectly with my ambition to...',
    'After years of experience in [field], I want to...',
  ],
};

export function MotivationLetterSection({
  cvId,
  credits,
  language,
  onCreditsUsed,
  onTokenUsage,
}: MotivationLetterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [personalMotivation, setPersonalMotivation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [letter, setLetter] = useState<GeneratedMotivationLetter | null>(null);
  const [error, setError] = useState<string | null>(null);

  const placeholders = MOTIVATION_PLACEHOLDERS[language];

  // Load previously saved motivation letter
  useEffect(() => {
    async function loadSavedLetter() {
      try {
        const response = await fetch(`/api/cv/${cvId}/motivation`);
        if (response.ok) {
          const result = await response.json();
          if (result.letter) {
            setLetter(result.letter);
            setIsExpanded(true);
          }
        }
      } catch {
        // Silently fail - user can still generate a new letter
      } finally {
        setIsLoadingSaved(false);
      }
    }
    loadSavedLetter();
  }, [cvId]);

  const handleGenerate = async () => {
    if (credits < 1) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/cv/${cvId}/motivation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalMotivation: personalMotivation.trim() || undefined,
          language,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate motivation letter');
      }

      setLetter(result.letter);
      onCreditsUsed?.();

      if (result.usage) {
        onTokenUsage?.(result.usage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<string | null>(null);

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!letter) return;

    setIsDownloading(true);
    setDownloadFormat(format);

    try {
      const response = await fetch(`/api/cv/${cvId}/motivation/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, letter }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const extension = format === 'pdf' ? 'pdf' : 'docx';
      a.download = `motivatiebrief-${new Date().toISOString().split('T')[0]}.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download mislukt');
    } finally {
      setIsDownloading(false);
      setDownloadFormat(null);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" />
            {letter ? 'Motivatiebrief' : 'Motivatiebrief Genereren'}
            {!letter && (
              <Badge variant="secondary" className="ml-2">
                <Coins className="h-3 w-3 mr-1" />1 credit
              </Badge>
            )}
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Loading saved letter */}
          {isLoadingSaved && (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm">Opgeslagen brief laden...</span>
            </div>
          )}

          {/* Personal motivation input */}
          {!isLoadingSaved && !letter && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">
                  Wat motiveert jou om te solliciteren? (optioneel)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Deel je persoonlijke motivatie om een meer authentieke brief te krijgen.
                </p>
                <Textarea
                  placeholder={placeholders[Math.floor(Math.random() * placeholders.length)]}
                  value={personalMotivation}
                  onChange={(e) => setPersonalMotivation(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground">Inspiratie:</span>
                {placeholders.slice(0, 3).map((placeholder, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPersonalMotivation(placeholder)}
                    className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {placeholder.slice(0, 30)}...
                  </button>
                ))}
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || credits < 1}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Brief genereren...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Genereer Motivatiebrief
                  </>
                )}
              </Button>

              {credits < 1 && (
                <p className="text-sm text-amber-600 text-center">
                  Je hebt niet genoeg credits.
                </p>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <span>{error}</span>
            </Alert>
          )}

          {/* Generated letter display */}
          {letter && (
            <div className="space-y-4">
              {/* Letter preview with copy protection */}
              <div
                className="bg-card border rounded-lg p-6 shadow-sm relative overflow-hidden select-none"
                onContextMenu={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {/* Watermark overlay */}
                <div
                  className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
                  style={{
                    background: 'repeating-linear-gradient(-30deg, transparent, transparent 100px, rgba(128,128,128,0.03) 100px, rgba(128,128,128,0.03) 200px)'
                  }}
                >
                  <div
                    className="absolute inset-0 flex flex-wrap justify-around content-around"
                    style={{ transform: 'rotate(-30deg)', transformOrigin: 'center', width: '200%', height: '200%', left: '-50%', top: '-50%' }}
                  >
                    {Array(20).fill(null).map((_, i) => (
                      <span
                        key={i}
                        className="text-muted-foreground/10 text-lg font-bold whitespace-nowrap px-8 py-6"
                        style={{ letterSpacing: '4px' }}
                      >
                        CVeetje PREVIEW
                      </span>
                    ))}
                  </div>
                </div>
                {/* Letter content */}
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed relative z-0 text-foreground">
                  {letter.fullText}
                </pre>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="flex-1 sm:flex-none"
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {downloadFormat === 'pdf' ? 'PDF genereren...' : 'DOCX genereren...'}
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                      <File className="mr-2 h-4 w-4 text-red-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">PDF</span>
                        <span className="text-xs text-muted-foreground">
                          Gestijld document met CV thema
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('docx')}>
                      <FileType className="mr-2 h-4 w-4 text-blue-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Word (.docx)</span>
                        <span className="text-xs text-muted-foreground">
                          Bewerkbaar Word document
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  onClick={() => {
                    setLetter(null);
                    setPersonalMotivation('');
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Opnieuw genereren
                </Button>
              </div>

              {/* Info */}
              <p className="text-xs text-muted-foreground text-center">
                Download de brief om deze te kunnen bewerken en versturen.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
