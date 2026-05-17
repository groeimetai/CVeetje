'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Wand2,
  Loader2,
  RefreshCw,
  Sparkles,
  Layout,
  Type,
  Palette,
  Check,
  AlertTriangle,
  Shield,
  Scale,
  Zap,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import { cn } from '@/lib/utils';
import { renderCV, isV2Tokens } from '@/lib/cv-engine/dispatch';
import { getRecipeById } from '@/lib/cv-engine/recipes/registry';
import type { CVStyleTokensV2 } from '@/lib/cv-engine/tokens';
import { oklchToCSS } from '@/lib/cv-engine/render/css/oklch';
import { typeScales } from '@/lib/cv/templates/themes';
import type {
  ParsedLinkedIn,
  JobVacancy,
  TokenUsage,
  GeneratedCVContent,
  StyleCreativityLevel,
} from '@/types';
import type { CVDesignTokens, DecorationIntensity, ExperienceDescriptionFormat } from '@/types/design-tokens';

const SAMPLE_CONTENT: GeneratedCVContent = {
  headline: 'Senior Professional',
  summary: 'Ervaren professional met een bewezen track record in het leveren van resultaten. Beschikt over sterke analytische vaardigheden en een passie voor innovatie.',
  experience: [{
    title: 'Senior Functie',
    company: 'Voorbeeldbedrijf',
    location: 'Amsterdam',
    period: '2021 - Heden',
    highlights: ['Leidde team van 5 medewerkers', 'Verbeterde processen met 30%'],
    description: 'Verantwoordelijk voor het aansturen van een team van 5 medewerkers en het optimaliseren van bedrijfsprocessen, wat resulteerde in een efficiëntieverbetering van 30%.',
  }],
  education: [{
    degree: 'Master of Science',
    institution: 'Universiteit van Amsterdam',
    year: '2018',
    details: null,
  }],
  skills: {
    technical: ['React', 'TypeScript', 'Node.js', 'Python'],
    soft: ['Leiderschap', 'Communicatie'],
  },
  languages: [
    { language: 'Nederlands', level: 'Moedertaal' },
    { language: 'Engels', level: 'Vloeiend' },
  ],
  certifications: [],
};

// A4 dimensions in px (96 dpi: 210mm ≈ 794px, 297mm ≈ 1123px)
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

// Scaled iframe that renders the real CV HTML with sample content
function StylePreviewFrame({
  tokens,
  fullName,
  avatarUrl,
}: {
  tokens: CVDesignTokens | CVStyleTokensV2;
  fullName: string;
  avatarUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const html = useMemo(
    () => renderCV(SAMPLE_CONTENT, tokens, { fullName, avatarUrl }),
    [tokens, fullName, avatarUrl]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setScale(w / A4_WIDTH_PX);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scaledHeight = A4_HEIGHT_PX * scale;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <p className="text-xs text-muted-foreground mb-2">Preview</p>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-md border bg-white"
        style={{ height: `${scaledHeight}px` }}
      >
        <iframe
          srcDoc={html}
          title="Style preview"
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: `${A4_WIDTH_PX}px`,
            height: `${A4_HEIGHT_PX}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

interface DynamicStylePickerProps {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  avatarUrl?: string | null;
  onStyleGenerated: (tokens: CVDesignTokens, creativityLevel: StyleCreativityLevel) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  onCreditsRefresh?: () => void;
  initialTokens?: CVDesignTokens | null;
}

export function DynamicStylePicker({
  linkedInData,
  jobVacancy,
  avatarUrl,
  onStyleGenerated,
  onTokenUsage,
  onCreditsRefresh,
  initialTokens,
}: DynamicStylePickerProps) {
  const { llmMode } = useAuth();
  const [userPreferences, setUserPreferences] = useState('');
  const [creativityLevel, setCreativityLevel] = useState<StyleCreativityLevel>('balanced');
  const [tokens, setTokens] = useState<CVDesignTokens | null>(initialTokens || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState('');

  // Reset tokens when initialTokens changes from a value to null (new vacancy)
  const prevInitialTokensRef = useRef<CVDesignTokens | null | undefined>(initialTokens);
  useEffect(() => {
    if (prevInitialTokensRef.current !== null && initialTokens === null) {
      setTokens(null);
      setError(null);
    }
    prevInitialTokensRef.current = initialTokens;
  }, [initialTokens]);

  // Creativity level options
  const creativityLevels = [
    {
      value: 'conservative' as StyleCreativityLevel,
      label: 'Veilig',
      icon: Shield,
      desc: 'ATS-vriendelijk, geen risico'
    },
    {
      value: 'balanced' as StyleCreativityLevel,
      label: 'Gebalanceerd',
      icon: Scale,
      desc: 'Professioneel met accenten'
    },
    {
      value: 'creative' as StyleCreativityLevel,
      label: 'Creatief',
      icon: Sparkles,
      desc: 'Moderne, opvallende designs'
    },
    {
      value: 'experimental' as StyleCreativityLevel,
      label: 'Experimenteel',
      icon: Zap,
      desc: 'Maximale visuele impact'
    },
    // 'editorial-paper' is intentionally omitted — in the cv-engine its
    // brand palette lives in `balanced/press`. Legacy CVs that used it still
    // render via the v1 renderer.
  ];

  const handleGenerateStyle = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationMessage('Initialiseren...');
    setTokens(null);

    try {
      const response = await fetch('/api/cv/style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          linkedInData,
          jobVacancy,
          avatarUrl,
          userPreferences: userPreferences.trim() || undefined,
          creativityLevel,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to generate style');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer after stream ends
          if (buffer.trim()) {
            console.log('[Style Picker] Processing final buffer:', buffer.substring(0, 100));
            const finalLines = buffer.split('\n\n').filter(l => l.trim());
            for (const line of finalLines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log('[Style Picker] Final SSE event:', data.type || 'unknown');
                  if (data.type === 'complete' && data.tokens) {
                    console.log('[Style Picker] Complete from final buffer! Theme:', data.tokens.themeBase);
                    setTokens(data.tokens);
                    if (data.usage && onTokenUsage) {
                      onTokenUsage(data.usage);
                    }
                    onCreditsRefresh?.();
                  }
                  if (data.type === 'error') {
                    throw new Error(data.error || 'Failed to generate style');
                  }
                } catch (e) {
                  if (!(e instanceof SyntaxError)) throw e;
                }
              }
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[Style Picker] SSE event received:', data.type || 'unknown');

              // Handle progress update (v2 API format)
              if (data.type === 'progress') {
                setGenerationMessage(data.message || 'Stijl genereren...');
                console.log('[Style Picker] Progress:', data.message);
              }

              // Handle completion
              if (data.type === 'complete' && data.tokens) {
                console.log('[Style Picker] Complete! Theme:', data.tokens.themeBase);
                setTokens(data.tokens);
                setGenerationMessage('');
                if (data.usage && onTokenUsage) {
                  onTokenUsage(data.usage);
                }
                onCreditsRefresh?.();
              }

              // Handle error
              if (data.type === 'error') {
                throw new Error(data.error || 'Failed to generate style');
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete data
              if (parseError instanceof SyntaxError) {
                console.log('[Style Picker] Parse error, incomplete chunk');
                continue;
              }
              throw parseError;
            }
          }
        }
      }
    } catch (err) {
      console.error('[Style Picker] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
      setGenerationMessage('');
    }
  }, [linkedInData, jobVacancy, avatarUrl, userPreferences, creativityLevel, onTokenUsage, onCreditsRefresh]);

  const handleContinue = () => {
    if (tokens) {
      onStyleGenerated(tokens, creativityLevel);
    }
  };

  const handleDecorationIntensityChange = (intensity: DecorationIntensity) => {
    setTokens(prev => prev ? { ...prev, decorations: intensity } : null);
  };

  const handleDescriptionFormatChange = (format: ExperienceDescriptionFormat) => {
    setTokens(prev => prev ? { ...prev, experienceDescriptionFormat: format } : null);
  };

  // Font pairing display names
  const fontPairingLabels: Record<string, string> = {
    'inter-inter': 'Inter',
    'playfair-inter': 'Playfair + Inter',
    'montserrat-open-sans': 'Montserrat + Open Sans',
    'raleway-lato': 'Raleway + Lato',
    'poppins-nunito': 'Poppins + Nunito',
    'roboto-roboto': 'Roboto',
    'lato-lato': 'Lato',
    'merriweather-source-sans': 'Merriweather + Source Sans',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          AI Style Generation
        </CardTitle>
        <CardDescription>
          Let AI create a unique style based on the job and your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Creativity Level Selector */}
        <div className="space-y-3">
          <Label>Creativiteit Niveau</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {creativityLevels.map((level) => {
              const Icon = level.icon;
              return (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setCreativityLevel(level.value)}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-lg border-2 transition-all text-center",
                    creativityLevel === level.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <div className="text-sm font-medium">{level.label}</div>
                  <div className="text-xs text-muted-foreground leading-tight mt-0.5">{level.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferences Input */}
        <div className="space-y-3">
          <Label htmlFor="preferences">Style Preferences (optional)</Label>
          <Textarea
            id="preferences"
            value={userPreferences}
            onChange={(e) => setUserPreferences(e.target.value)}
            placeholder="e.g., 'formal and traditional', 'modern with blue accents', 'minimalistic', 'creative and bold'..."
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Describe your preferred style, colors, or vibe. Leave empty for AI to decide based on the job.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        {/* Generate Button */}
        {!tokens && !isGenerating && (
          <Button
            onClick={handleGenerateStyle}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate AI Style
            {llmMode === 'platform' && (
              <Badge variant="secondary" className="ml-2">
                <Coins className="h-3 w-3 mr-1" />1 credit
              </Badge>
            )}
          </Button>
        )}

        {/* Loading state during generation */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-primary">
                {generationMessage || 'Stijl genereren...'}
              </p>
              <p className="text-xs text-muted-foreground">
                AI analyseert je profiel en vacature
              </p>
            </div>
          </div>
        )}

        {/* Style Preview */}
        {tokens && (
          <div className="space-y-4">
            {/* v2 (cv-engine) info card */}
            {isV2Tokens(tokens) && (() => {
              const v2 = tokens as unknown as CVStyleTokensV2;
              const recipe = getRecipeById(v2.recipeId);
              if (!recipe) return null;
              return (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{recipe.displayName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{recipe.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      <Badge variant="secondary">{recipe.layoutShape}</Badge>
                      <Badge variant="outline">{recipe.density}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{recipe.description}</p>
                  <div className="flex gap-1.5 pt-1">
                    {(['ink', 'paper', 'accent', 'muted', 'surface'] as const).map(role => {
                      const oklch = v2.paletteOverride?.[role] ?? recipe.palette[role].anchor;
                      return (
                        <div
                          key={role}
                          className="h-7 flex-1 rounded-md border"
                          style={{ backgroundColor: oklchToCSS(oklch) }}
                          title={`${role}: ${oklchToCSS(oklch)}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Legacy v1 preview blocks — only render for v1 tokens */}
            {!isV2Tokens(tokens) && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{tokens.styleName}</h3>
                <Badge variant="secondary">
                  {tokens.themeBase === 'creative' || tokens.themeBase === 'bold' ? 'casual' : 'professional'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{tokens.styleRationale}</p>
              <Badge variant="outline">{tokens.industryFit}</Badge>
            </div>
            )}

            {!isV2Tokens(tokens) && (<>
            {/* Color Preview — v1 only */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Colors</span>
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: tokens.colors.primary }}
                    title="Primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Primary</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto border shadow-sm"
                    style={{ backgroundColor: tokens.colors.secondary }}
                    title="Secondary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: tokens.colors.accent }}
                    title="Accent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Accent</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: tokens.colors.text }}
                    title="Text"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Text</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: tokens.colors.muted }}
                    title="Muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Muted</p>
                </div>
              </div>
            </div>

            {/* Layout & Typography Preview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Layout</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Theme:</span>{' '}
                    {tokens.themeBase}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Header:</span>{' '}
                    {tokens.headerVariant}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sections:</span>{' '}
                    {tokens.sectionStyle}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Skills:</span>{' '}
                    {tokens.skillsDisplay}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Typography</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Fonts:</span>{' '}
                    {fontPairingLabels[tokens.fontPairing] || tokens.fontPairing}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Scale:</span>{' '}
                    {tokens.scale}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Name Size:</span>{' '}
                    {typeScales[tokens.scale].name}pt
                  </p>
                </div>
              </div>
            </div>

            {/* Style Details Preview */}
            <div className="rounded-lg border p-4 space-y-2">
              <span className="font-medium text-sm">Style Details</span>
              <div className="flex flex-wrap gap-2">
                {tokens.showPhoto && (
                  <Badge variant="default">Photo</Badge>
                )}
                {tokens.useIcons && (
                  <Badge variant="outline">Icons</Badge>
                )}
                {tokens.roundedCorners && (
                  <Badge variant="outline">Rounded</Badge>
                )}
                <Badge variant="outline">
                  Spacing: {tokens.spacing}
                </Badge>
                <Badge variant="outline">
                  Contact: {tokens.contactLayout}
                </Badge>
              </div>
            </div>

            {/* Background Decorations Selector */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Achtergrond Decoraties</span>
                  <p className="text-xs text-muted-foreground">
                    Subtiele SVG vormen als achtergrond
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(['none', 'minimal', 'moderate', 'abundant'] as DecorationIntensity[]).map((intensity) => (
                  <button
                    key={intensity}
                    type="button"
                    onClick={() => handleDecorationIntensityChange(intensity)}
                    className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      tokens.decorations === intensity
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {intensity === 'none' && 'Geen'}
                    {intensity === 'minimal' && 'Minimaal'}
                    {intensity === 'moderate' && 'Gemiddeld'}
                    {intensity === 'abundant' && 'Veel'}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience Description Format Selector */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">Werkervaring Formaat</span>
                  <p className="text-xs text-muted-foreground">
                    Kies tussen opsommingstekens of doorlopende tekst
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'bullets' as ExperienceDescriptionFormat, label: 'Bullets', desc: 'Opsommingstekens' },
                  { value: 'paragraph' as ExperienceDescriptionFormat, label: 'Paragraaf', desc: 'Doorlopende tekst' },
                ] as const).map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => handleDescriptionFormatChange(format.value)}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                      tokens.experienceDescriptionFormat === format.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <span className="text-sm font-medium">{format.label}</span>
                    <span className="text-xs text-muted-foreground">{format.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            </>)}

            {/* Real CV Preview (iframe — dispatcher renders both v1 + v2) */}
            <StylePreviewFrame
              tokens={tokens}
              fullName={linkedInData.fullName}
              avatarUrl={avatarUrl}
            />

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleGenerateStyle}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
                {llmMode === 'platform' && (
                  <Badge variant="secondary" className="ml-2">
                    <Coins className="h-3 w-3 mr-1" />1
                  </Badge>
                )}
              </Button>
              <Button onClick={handleContinue} className="flex-1">
                <Check className="mr-2 h-4 w-4" />
                Use This Style
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
