'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Upload,
  Loader2,
  FileText,
  Sparkles,
  Palette,
  Layout,
  Type,
  Check,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  CVStyleConfig,
  ParsedLinkedIn,
  JobVacancy,
  TokenUsage,
} from '@/types';
import type { CVDesignTokens, DecorationIntensity } from '@/types/design-tokens';
import { tokensToStyleConfig } from '@/lib/cv/templates/adapter';

interface TemplateStylePickerProps {
  linkedInData: ParsedLinkedIn;
  jobVacancy?: JobVacancy | null;
  onStyleSelected: (styleConfig: CVStyleConfig, tokens: CVDesignTokens) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  onBack: () => void;
}

export function TemplateStylePicker({
  linkedInData,
  onStyleSelected,
  onTokenUsage,
  onBack,
}: TemplateStylePickerProps) {
  const t = useTranslations('templateStyle');

  // State
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [tokens, setTokens] = useState<CVDesignTokens | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError(t('errors.invalidType'));
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(t('errors.tooLarge'));
      return;
    }

    setFile(selectedFile);
    setError(null);
    setWarning(null);
    setTokens(null);
    setTemplatePreview(null);
    setConfidence(null);
  }, [t]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  // Analyze template
  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setWarning(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cv/style-from-template', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to analyze template');
      }

      setTokens(result.tokens);
      setTemplatePreview(result.templatePreview);
      setConfidence(result.confidence);

      if (result.warning) {
        setWarning(result.warning);
      }

      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }
    } catch (err) {
      console.error('[Template Style] Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  }, [file, onTokenUsage]);

  // Handle continue with selected style
  const handleContinue = () => {
    if (tokens) {
      const styleConfig = tokensToStyleConfig(tokens);
      onStyleSelected(styleConfig, tokens);
    }
  };

  // Handle decoration intensity change
  const handleDecorationIntensityChange = (intensity: DecorationIntensity) => {
    setTokens(prev => prev ? { ...prev, decorations: intensity } : null);
  };

  // Reset to try another file
  const handleReset = () => {
    setFile(null);
    setTokens(null);
    setTemplatePreview(null);
    setError(null);
    setWarning(null);
    setConfidence(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  // Confidence badge
  const ConfidenceBadge = ({ level }: { level: 'high' | 'medium' | 'low' }) => {
    const variants = {
      high: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100', label: t('confidence.high') },
      medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100', label: t('confidence.medium') },
      low: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100', label: t('confidence.low') },
    };
    const variant = variants[level];
    return (
      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', variant.color)}>
        {variant.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="ml-2">{error}</span>
            </Alert>
          )}

          {/* Warning Display */}
          {warning && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <span className="ml-2">{warning}</span>
            </Alert>
          )}

          {/* File Upload Area */}
          {!tokens && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                  "hover:border-primary hover:bg-primary/5",
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={handleInputChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <FileText className="h-12 w-12 mx-auto text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                    >
                      {t('changeFile')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="font-medium">{t('dropzone.title')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('dropzone.subtitle')}
                    </p>
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              {file && (
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('analyzing')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('analyzeButton')}
                    </>
                  )}
                </Button>
              )}

              {/* Instructions */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium">{t('instructions.title')}</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>{t('instructions.item1')}</li>
                  <li>{t('instructions.item2')}</li>
                  <li>{t('instructions.item3')}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Loading state during analysis */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Eye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-primary">
                  {t('analyzingProgress.step1')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('analyzingProgress.step2')}
                </p>
              </div>
            </div>
          )}

          {/* Style Preview (after analysis) */}
          {tokens && !isAnalyzing && (
            <div className="space-y-4">
              {/* Side-by-side preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Template Preview */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    {t('preview.template')}
                  </Label>
                  <div className="rounded-lg border overflow-hidden bg-muted/50">
                    {templatePreview && (
                      <img
                        src={`data:image/png;base64,${templatePreview}`}
                        alt="Template preview"
                        className="w-full h-auto"
                      />
                    )}
                  </div>
                </div>

                {/* Style Preview */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {t('preview.extracted')}
                  </Label>
                  <div className="rounded-lg border p-4 space-y-3 bg-card">
                    {/* Style Name & Confidence */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{tokens.styleName}</h3>
                      {confidence && <ConfidenceBadge level={confidence} />}
                    </div>
                    <p className="text-sm text-muted-foreground">{tokens.styleRationale}</p>

                    {/* Color Preview */}
                    <div className="flex gap-2">
                      {Object.entries(tokens.colors).map(([name, color]) => (
                        <div key={name} className="text-center flex-1">
                          <div
                            className="h-8 w-full rounded shadow-sm border"
                            style={{ backgroundColor: color }}
                            title={`${name}: ${color}`}
                          />
                          <p className="text-xs text-muted-foreground mt-1 capitalize">{name}</p>
                        </div>
                      ))}
                    </div>

                    {/* Mini CV Preview */}
                    <div
                      className="rounded border p-3 space-y-2"
                      style={{ backgroundColor: tokens.colors.secondary }}
                    >
                      <div
                        className="pb-2"
                        style={{ borderBottom: `2px solid ${tokens.colors.primary}` }}
                      >
                        <h4
                          className="font-bold text-lg"
                          style={{ color: tokens.colors.primary }}
                        >
                          {linkedInData.fullName}
                        </h4>
                      </div>
                      <div className="space-y-1">
                        <h5
                          className="text-xs uppercase font-semibold tracking-wide"
                          style={{ color: tokens.colors.primary }}
                        >
                          Experience
                        </h5>
                        <div className="flex gap-1 flex-wrap">
                          {['Skill 1', 'Skill 2', 'Skill 3'].map((skill, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5"
                              style={{
                                backgroundColor: tokens.colors.accent + '20',
                                color: tokens.colors.text,
                                borderRadius: tokens.roundedCorners ? '10px' : '2px',
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout & Typography Details */}
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
                      <span className="text-muted-foreground">Spacing:</span>{' '}
                      {tokens.spacing}
                    </p>
                  </div>
                </div>
              </div>

              {/* Style Details */}
              <div className="rounded-lg border p-4 space-y-2">
                <span className="font-medium text-sm">{t('details.title')}</span>
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
                  {tokens.headerFullBleed && (
                    <Badge variant="outline">Full-bleed</Badge>
                  )}
                  <Badge variant="outline">
                    Industry: {tokens.industryFit}
                  </Badge>
                </div>
              </div>

              {/* Decoration Intensity Selector */}
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <span className="font-medium text-sm">{t('decorations.title')}</span>
                  <p className="text-xs text-muted-foreground">
                    {t('decorations.description')}
                  </p>
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
                      {t(`decorations.${intensity}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('tryAnother')}
                </Button>
                <Button onClick={handleContinue} className="flex-1">
                  <Check className="mr-2 h-4 w-4" />
                  {t('useStyle')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
