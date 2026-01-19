'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, FileText, Coins, Sparkles, Maximize2, Minimize2, Pencil, ChevronDown, Briefcase, User, Building2, TrendingUp, Palette, Target, DollarSign, MapPin, Clock, Award, Lightbulb } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GeneratedCVContent, CVElementOverrides, ElementOverride, EditableElementType, CVContactInfo, JobVacancy } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { generateCVHTML } from '@/lib/cv/html-generator';
import { fontPairings, typeScales, spacingScales, themeDefaults } from '@/lib/cv/templates/themes';
import { CVContentEditor, type ElementColorOverrides } from './cv-content-editor';
import { MotivationLetterSection } from './motivation-letter-section';
import type { OutputLanguage, TokenUsage } from '@/types';

interface HeaderInfo {
  fullName: string;
  headline?: string | null;
  contactInfo?: CVContactInfo | null;
}

export type PDFPageMode = 'multi-page' | 'single-page';

interface CVPreviewProps {
  content: GeneratedCVContent;
  tokens: CVDesignTokens;
  fullName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  contactInfo?: CVContactInfo | null;
  jobVacancy?: JobVacancy | null;
  cvId?: string | null;
  language?: OutputLanguage;
  onDownload: (pageMode: PDFPageMode) => void;
  onRegenerate: () => void;
  onNewVacancy?: () => void;
  onCreditsRefresh?: () => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  isDownloading: boolean;
  isRegenerating: boolean;
  credits: number;
  elementOverrides?: CVElementOverrides | null;
  onUpdateOverrides?: (overrides: CVElementOverrides) => void;
  onContentChange?: (content: GeneratedCVContent) => void;
  onHeaderChange?: (header: HeaderInfo) => void;
  onColorsChange?: (colors: CVDesignTokens['colors']) => void;
  onElementColorsChange?: (elementColors: ElementColorOverrides) => void;
}

/**
 * CVPreview - Preview component using the new token-based styling system
 *
 * This component provides:
 * - Live preview of the CV with design tokens
 * - Style token summary display
 * - Download and regenerate controls
 */
export function CVPreview({
  content,
  tokens,
  fullName,
  headline,
  avatarUrl,
  contactInfo,
  jobVacancy,
  cvId,
  language = 'nl',
  onDownload,
  onRegenerate,
  onNewVacancy,
  onCreditsRefresh,
  onTokenUsage,
  isDownloading,
  isRegenerating,
  credits,
  elementOverrides: initialOverrides,
  onUpdateOverrides,
  onContentChange,
  onHeaderChange,
  onColorsChange,
  onElementColorsChange,
}: CVPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<CVElementOverrides>(
    initialOverrides || { overrides: [], lastModified: new Date() }
  );
  const [editedContent, setEditedContent] = useState<GeneratedCVContent>(content);
  const [editedHeader, setEditedHeader] = useState<HeaderInfo>({
    fullName,
    headline,
    contactInfo,
  });
  const [editedColors, setEditedColors] = useState<CVDesignTokens['colors']>(tokens.colors);
  const [elementColors, setElementColors] = useState<ElementColorOverrides>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update local overrides when prop changes
  useEffect(() => {
    if (initialOverrides) {
      setLocalOverrides(initialOverrides);
    }
  }, [initialOverrides]);

  // Update edited content when prop changes
  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  // Update edited header when props change
  useEffect(() => {
    setEditedHeader({ fullName, headline, contactInfo });
  }, [fullName, headline, contactInfo]);

  // Update edited colors when tokens change
  useEffect(() => {
    setEditedColors(tokens.colors);
  }, [tokens.colors]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: GeneratedCVContent) => {
    setEditedContent(newContent);
    onContentChange?.(newContent);
  }, [onContentChange]);

  // Handle header changes
  const handleHeaderChange = useCallback((newHeader: HeaderInfo) => {
    setEditedHeader(newHeader);
    onHeaderChange?.(newHeader);
  }, [onHeaderChange]);

  // Handle colors changes
  const handleColorsChange = useCallback((newColors: CVDesignTokens['colors']) => {
    setEditedColors(newColors);
    onColorsChange?.(newColors);
  }, [onColorsChange]);

  // Handle element color changes
  const handleElementColorChange = useCallback((elementId: string, color: string | undefined) => {
    setElementColors(prev => {
      const newColors = { ...prev };
      if (color === undefined) {
        delete newColors[elementId];
      } else {
        newColors[elementId] = color;
      }
      onElementColorsChange?.(newColors);
      return newColors;
    });
  }, [onElementColorsChange]);

  // Build tokens with edited colors
  const effectiveTokens = useMemo(() => ({
    ...tokens,
    colors: editedColors,
  }), [tokens, editedColors]);

  // Build element overrides from elementColors for HTML generator
  const effectiveOverrides = useMemo(() => {
    const overrides: ElementOverride[] = Object.entries(elementColors)
      .filter(([, color]) => color !== undefined)
      .map(([elementId, color]) => ({
        elementId,
        elementType: 'text' as EditableElementType,
        hidden: false,
        colorOverride: color,
      }));

    // Merge with any existing localOverrides
    const existingIds = new Set(overrides.map(o => o.elementId));
    const mergedOverrides = [
      ...overrides,
      ...localOverrides.overrides.filter(o => !existingIds.has(o.elementId)),
    ];

    return {
      overrides: mergedOverrides,
      lastModified: new Date(),
    };
  }, [elementColors, localOverrides]);

  // Generate HTML using v2 generator (use edited values)
  // Enable preview protection (watermark, copy protection) for preview mode
  const cvHTML = useMemo(() =>
    generateCVHTML(
      editedContent,
      effectiveTokens,
      editedHeader.fullName,
      avatarUrl,
      editedHeader.headline,
      effectiveOverrides,
      editedHeader.contactInfo,
      { previewProtection: true, watermarkText: 'CVeetje PREVIEW' }
    ),
    [editedContent, effectiveTokens, editedHeader, avatarUrl, effectiveOverrides]
  );

  // Check if content, header, colors, or element colors have been edited
  const hasEdits = useMemo(() => {
    const contentChanged = JSON.stringify(content) !== JSON.stringify(editedContent);
    const headerChanged = fullName !== editedHeader.fullName ||
      headline !== editedHeader.headline ||
      JSON.stringify(contactInfo) !== JSON.stringify(editedHeader.contactInfo);
    const colorsChanged = JSON.stringify(tokens.colors) !== JSON.stringify(editedColors);
    const elementColorsChanged = Object.keys(elementColors).length > 0;
    return contentChanged || headerChanged || colorsChanged || elementColorsChanged;
  }, [content, editedContent, fullName, headline, contactInfo, editedHeader, tokens.colors, editedColors, elementColors]);

  // Auto-resize iframe to content height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeIframe = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          const height = doc.body.scrollHeight + 40;
          iframe.style.height = `${Math.max(height, 800)}px`;
        }
      } catch {
        // Cross-origin errors are expected, ignore them
      }
    };

    const handleLoad = () => {
      resizeIframe();
      setTimeout(resizeIframe, 500);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [cvHTML]);

  // Get style summary from tokens
  const fontConfig = fontPairings[tokens.fontPairing];
  const typeScale = typeScales[tokens.scale];
  const spacingScale = spacingScales[tokens.spacing];
  const themeConfig = themeDefaults[tokens.themeBase];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      <Card className={`w-full ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              CV Preview
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {tokens.styleName}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className={`${isFullscreen ? 'flex-1 overflow-auto' : ''}`}>
          {/* TLDR Summary Accordion */}
          <Accordion type="single" collapsible className="mb-6">
            <AccordionItem value="tldr" className="border rounded-lg bg-muted/20">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Overzicht</span>
                  <Badge variant="outline" className="ml-2">TLDR</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Profile Info */}
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      Profiel
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Naam:</span> {editedHeader.fullName}</p>
                      {editedHeader.headline && (
                        <p><span className="font-medium">Functie:</span> {editedHeader.headline}</p>
                      )}
                      {editedHeader.contactInfo?.email && (
                        <p><span className="font-medium">Email:</span> {editedHeader.contactInfo.email}</p>
                      )}
                      {editedHeader.contactInfo?.location && (
                        <p><span className="font-medium">Locatie:</span> {editedHeader.contactInfo.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Job Vacancy Info */}
                  {jobVacancy && (
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        Vacature
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Functie:</span> {jobVacancy.title}</p>
                        {jobVacancy.company && (
                          <p><span className="font-medium">Bedrijf:</span> {jobVacancy.company}</p>
                        )}
                        {jobVacancy.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {jobVacancy.location}
                          </p>
                        )}
                        {jobVacancy.employmentType && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {jobVacancy.employmentType}
                          </p>
                        )}
                        {jobVacancy.industry && (
                          <p><span className="font-medium">Industrie:</span> {jobVacancy.industry}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Salary Estimate */}
                  {jobVacancy?.salaryEstimate && (
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        Salaris Inschatting
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-base">
                          €{jobVacancy.salaryEstimate.estimatedMin.toLocaleString('nl-NL')} - €{jobVacancy.salaryEstimate.estimatedMax.toLocaleString('nl-NL')}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {jobVacancy.salaryEstimate.experienceLevel}
                          </Badge>
                          <Badge
                            variant={
                              jobVacancy.salaryEstimate.confidence === 'high' ? 'default' :
                              jobVacancy.salaryEstimate.confidence === 'medium' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {jobVacancy.salaryEstimate.confidence} confidence
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{jobVacancy.salaryEstimate.reasoning}</p>
                      </div>
                    </div>
                  )}

                  {/* Keywords */}
                  {jobVacancy?.keywords && jobVacancy.keywords.length > 0 && (
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Keywords
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {jobVacancy.keywords.slice(0, 10).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {jobVacancy.keywords.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{jobVacancy.keywords.length - 10} meer
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Style Info */}
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      Stijl
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Naam:</span> {tokens.styleName}</p>
                      <p><span className="font-medium">Theme:</span> {tokens.themeBase}</p>
                      <p><span className="font-medium">Industrie fit:</span> {tokens.industryFit}</p>
                      <div className="flex gap-1 mt-1">
                        {Object.entries(tokens.colors).map(([key, color]) => (
                          <div
                            key={key}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: color }}
                            title={`${key}: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generated Content Stats */}
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Gegenereerde Content
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-muted-foreground" />
                        <span>{(editedContent.skills?.technical?.length || 0) + (editedContent.skills?.soft?.length || 0)} skills</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{editedContent.experience?.length || 0} ervaringen</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{editedContent.education?.length || 0} opleidingen</span>
                      </div>
                      {editedContent.languages && editedContent.languages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">🌐</span>
                          <span>{editedContent.languages.length} talen</span>
                        </div>
                      )}
                    </div>
                    {editedContent.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{editedContent.summary}</p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 h-auto">
              <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-1 text-xs sm:text-sm">
                <Pencil className="h-3 w-3" />
                <span className="hidden sm:inline">Bewerken</span>
                <span className="sm:hidden">Edit</span>
                {hasEdits && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Stijl Details</span>
                <span className="sm:hidden">Stijl</span>
              </TabsTrigger>
              <TabsTrigger value="html" className="text-xs sm:text-sm">HTML</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              {/* Preview iframe */}
              <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <iframe
                  ref={iframeRef}
                  srcDoc={cvHTML}
                  title="CV Preview"
                  className="w-full min-h-[800px] border-0"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
              {hasEdits && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Je hebt wijzigingen aangebracht aan de CV inhoud. Deze worden meegenomen bij het downloaden.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              {/* Content Editor */}
              <CVContentEditor
                content={editedContent}
                onContentChange={handleContentChange}
                headerInfo={editedHeader}
                onHeaderChange={handleHeaderChange}
                colors={editedColors}
                onColorsChange={handleColorsChange}
                elementColors={elementColors}
                onElementColorChange={handleElementColorChange}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditedContent(content);
                    setEditedHeader({ fullName, headline, contactInfo });
                    setEditedColors(tokens.colors);
                    setElementColors({});
                  }}
                  disabled={!hasEdits}
                >
                  Reset naar origineel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActiveTab('preview')}
                >
                  Bekijk preview
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              {/* Style tokens display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme & Colors */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Theme & Kleuren
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Theme</span>
                      <Badge variant="outline">{tokens.themeBase}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Industry Fit</span>
                      <span className="text-sm text-muted-foreground">{tokens.industryFit}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.primary }}
                      title={`Primary: ${tokens.colors.primary}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.secondary }}
                      title={`Secondary: ${tokens.colors.secondary}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.accent }}
                      title={`Accent: ${tokens.colors.accent}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.text }}
                      title={`Text: ${tokens.colors.text}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.muted }}
                      title={`Muted: ${tokens.colors.muted}`}
                    />
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Typography
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Font Pairing</span>
                      <span className="text-sm text-muted-foreground">{tokens.fontPairing}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Scale</span>
                      <Badge variant="outline">{tokens.scale}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Name Size</span>
                      <span className="text-sm text-muted-foreground">{typeScale.name}pt</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Body Size</span>
                      <span className="text-sm text-muted-foreground">{typeScale.body}pt</span>
                    </div>
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Layout
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Header</span>
                      <Badge variant="outline">{tokens.headerVariant}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sections</span>
                      <Badge variant="outline">{tokens.sectionStyle}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Spacing</span>
                      <Badge variant="outline">{tokens.spacing}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Skills</span>
                      <Badge variant="outline">{tokens.skillsDisplay}</Badge>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Features
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Foto</span>
                      <Badge variant={tokens.showPhoto ? 'default' : 'secondary'}>
                        {tokens.showPhoto ? 'Aan' : 'Uit'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Iconen</span>
                      <Badge variant={tokens.useIcons ? 'default' : 'secondary'}>
                        {tokens.useIcons ? 'Aan' : 'Uit'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Afgeronde hoeken</span>
                      <Badge variant={tokens.roundedCorners ? 'default' : 'secondary'}>
                        {tokens.roundedCorners ? 'Aan' : 'Uit'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  Stijl Rationale
                </h3>
                <p className="text-sm text-muted-foreground">{tokens.styleRationale}</p>
              </div>
            </TabsContent>

            <TabsContent value="html" className="space-y-4">
              {/* HTML source */}
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[600px]">
                  <code>{cvHTML}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
            {isDownloading ? (
              <Button
                disabled
                className="flex-1"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4 animate-bounce" />
                PDF Genereren...
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={credits < 1}
                    className="flex-1"
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                    <Badge variant="secondary" className="ml-2">
                      <Coins className="h-3 w-3 mr-1" />1 credit
                    </Badge>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => onDownload('multi-page')}>
                    <div className="flex flex-col">
                      <span className="font-medium">A4 Pagina&apos;s</span>
                      <span className="text-xs text-muted-foreground">
                        Standaard PDF met meerdere pagina&apos;s
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload('single-page')}>
                    <div className="flex flex-col">
                      <span className="font-medium">Enkele Lange Pagina</span>
                      <span className="text-xs text-muted-foreground">
                        Eén doorlopende pagina zonder witruimte
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              onClick={onRegenerate}
              disabled={isRegenerating}
              size="lg"
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Regenereren...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenereer
                </>
              )}
            </Button>

            {onNewVacancy && (
              <Button
                variant="outline"
                onClick={onNewVacancy}
                disabled={isDownloading || isRegenerating}
                size="lg"
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Nieuwe Vacature
              </Button>
            )}
          </div>

          {/* Credits warning */}
          {credits < 1 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Je hebt niet genoeg credits om een PDF te downloaden.
              </p>
            </div>
          )}

          {/* Motivation Letter Section */}
          {cvId && (
            <MotivationLetterSection
              cvId={cvId}
              credits={credits}
              language={language}
              onCreditsUsed={onCreditsRefresh}
              onTokenUsage={onTokenUsage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CVPreview;
