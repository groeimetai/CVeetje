'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SVGDecorationToggle } from './svg-decoration-toggle';
import type {
  CVStyleConfig,
  ParsedLinkedIn,
  JobVacancy,
  TokenUsage,
  SVGDecorationConfig,
  StyleCreativityLevel,
} from '@/types';

interface DynamicStylePickerProps {
  linkedInData: ParsedLinkedIn;
  jobVacancy: JobVacancy | null;
  onStyleGenerated: (styleConfig: CVStyleConfig) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  initialStyleConfig?: CVStyleConfig | null;
}

export function DynamicStylePicker({
  linkedInData,
  jobVacancy,
  onStyleGenerated,
  onTokenUsage,
  initialStyleConfig,
}: DynamicStylePickerProps) {
  const [userPreferences, setUserPreferences] = useState('');
  const [creativityLevel, setCreativityLevel] = useState<StyleCreativityLevel>('balanced');
  const [styleConfig, setStyleConfig] = useState<CVStyleConfig | null>(initialStyleConfig || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  ];

  const handleGenerateStyle = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/cv/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedInData,
          jobVacancy,
          userPreferences: userPreferences.trim() || undefined,
          creativityLevel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate style');
      }

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }

      setStyleConfig(result.styleConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = () => {
    if (styleConfig) {
      onStyleGenerated(styleConfig);
    }
  };

  const handleSVGChange = (newConfig: SVGDecorationConfig) => {
    setStyleConfig(prev => prev ? {
      ...prev,
      decorations: {
        ...prev.decorations,
        svgDecorations: newConfig
      }
    } : null);
  };

  // Layout style display names
  const layoutLabels: Record<string, string> = {
    'single-column': 'Single Column',
    'two-column': 'Two Column',
    'sidebar-left': 'Left Sidebar',
    'sidebar-right': 'Right Sidebar',
  };

  // Font display names
  const fontLabels: Record<string, string> = {
    'inter': 'Inter',
    'georgia': 'Georgia',
    'roboto': 'Roboto',
    'merriweather': 'Merriweather',
    'source-sans': 'Source Sans',
    'playfair': 'Playfair Display',
    'open-sans': 'Open Sans',
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
        {!styleConfig && (
          <Button
            onClick={handleGenerateStyle}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Style...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Style
              </>
            )}
          </Button>
        )}

        {/* Style Preview */}
        {styleConfig && (
          <div className="space-y-4">
            {/* Style Name & Rationale */}
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{styleConfig.styleName}</h3>
                <Badge variant="secondary">{styleConfig.formalityLevel}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{styleConfig.styleRationale}</p>
              <Badge variant="outline">{styleConfig.industryFit}</Badge>
            </div>

            {/* Color Preview */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Colors</span>
              </div>
              <div className="flex gap-3">
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: styleConfig.colors.primary }}
                    title="Primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Primary</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto border shadow-sm"
                    style={{ backgroundColor: styleConfig.colors.secondary }}
                    title="Secondary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: styleConfig.colors.accent }}
                    title="Accent"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Accent</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: styleConfig.colors.text }}
                    title="Text"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Text</p>
                </div>
                <div className="text-center">
                  <div
                    className="h-10 w-10 rounded-full mx-auto shadow-sm"
                    style={{ backgroundColor: styleConfig.colors.muted }}
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
                    <span className="text-muted-foreground">Style:</span>{' '}
                    {layoutLabels[styleConfig.layout.style]}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Header:</span>{' '}
                    {styleConfig.layout.headerStyle}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Spacing:</span>{' '}
                    {styleConfig.layout.spacing}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Skills:</span>{' '}
                    {styleConfig.layout.skillDisplay}
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
                    <span className="text-muted-foreground">Headings:</span>{' '}
                    {fontLabels[styleConfig.typography.headingFont]}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Body:</span>{' '}
                    {fontLabels[styleConfig.typography.bodyFont]}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Name Size:</span>{' '}
                    {styleConfig.typography.nameSizePt}pt
                  </p>
                </div>
              </div>
            </div>

            {/* Decorations Preview */}
            <div className="rounded-lg border p-4 space-y-2">
              <span className="font-medium text-sm">Style Details</span>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Intensity: {styleConfig.decorations.intensity}
                </Badge>
                <Badge variant="outline">
                  Corners: {styleConfig.decorations.cornerStyle}
                </Badge>
                {styleConfig.decorations.useBorders && (
                  <Badge variant="outline">Borders</Badge>
                )}
                {styleConfig.decorations.useBackgrounds && (
                  <Badge variant="outline">Backgrounds</Badge>
                )}
                {styleConfig.decorations.iconStyle !== 'none' && (
                  <Badge variant="outline">Icons: {styleConfig.decorations.iconStyle}</Badge>
                )}
                <Badge variant="outline">
                  Divider: {styleConfig.layout.sectionDivider}
                </Badge>
              </div>
            </div>

            {/* SVG Decorations Toggle - User Control */}
            <SVGDecorationToggle
              config={styleConfig.decorations.svgDecorations}
              colors={styleConfig.colors}
              onChange={handleSVGChange}
              formalityLevel={styleConfig.formalityLevel}
            />

            {/* Mini CV Preview */}
            <div
              className="rounded-lg border p-4 space-y-2"
              style={{
                fontFamily: styleConfig.typography.bodyFont === 'georgia' ||
                           styleConfig.typography.bodyFont === 'merriweather' ||
                           styleConfig.typography.bodyFont === 'playfair'
                  ? 'Georgia, serif'
                  : 'system-ui, sans-serif',
              }}
            >
              <p className="text-xs text-muted-foreground mb-2">Preview</p>
              <div
                className="pb-2 mb-2"
                style={{ borderBottom: `2px solid ${styleConfig.colors.primary}` }}
              >
                <h4
                  className="font-bold"
                  style={{
                    color: styleConfig.colors.primary,
                    fontSize: `${styleConfig.typography.nameSizePt * 0.6}px`,
                  }}
                >
                  {linkedInData.fullName}
                </h4>
              </div>
              <div className="space-y-1">
                <h5
                  className="text-xs uppercase font-semibold tracking-wide"
                  style={{ color: styleConfig.colors.primary }}
                >
                  Experience
                </h5>
                <div className="flex gap-1">
                  {['Skill 1', 'Skill 2', 'Skill 3'].map((skill, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5"
                      style={{
                        backgroundColor: styleConfig.colors.secondary,
                        color: styleConfig.colors.primary,
                        borderRadius: styleConfig.decorations.cornerStyle === 'pill' ? '10px' :
                                     styleConfig.decorations.cornerStyle === 'rounded' ? '3px' : '0',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

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
