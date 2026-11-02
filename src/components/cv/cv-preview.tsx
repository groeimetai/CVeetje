'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, FileText, Coins, Sparkles, Maximize2, Minimize2, Pencil, ChevronDown, Briefcase, User, Building2, TrendingUp, Palette, Target, DollarSign, MapPin, Clock, Award, Lightbulb, MessageSquare, Scale, Wand2 } from 'lucide-react';
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
import type { GeneratedCVContent, CVElementOverrides, ElementOverride, EditableElementType, CVContactInfo, JobVacancy, ParsedLinkedIn, FitAnalysis } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';
import { useAuth } from '@/components/auth/auth-context';
import { renderCV, isV2Tokens } from '@/lib/cv-engine/dispatch';
import { getRecipeById } from '@/lib/cv-engine/recipes/registry';
import { oklchToCSS } from '@/lib/cv-engine/render/css/oklch';
import type { CVStyleTokensV2 } from '@/lib/cv-engine/tokens';
import { fontPairings, typeScales, spacingScales, themeDefaults } from '@/lib/cv/templates/themes';
import { CVContentEditor, type ElementColorOverrides } from './cv-content-editor';
import { CVChatPanel } from './cv-chat-panel';
import { CVDisputeDialog } from './cv-dispute-dialog';
import { MotivationLetterSection } from './motivation-letter-section';
import { DesignTweaksSheet } from './design-tweaks/design-tweaks-sheet';
import { isCVContentEditMessage } from '@/lib/cv/edit-bridge';
import type { OutputLanguage, TokenUsage } from '@/types';
import { escapeHtml } from '@/lib/security/html-escape';
import { CreditBadge } from '@/components/cv/credit-badge';

interface HeaderInfo {
  fullName: string;
  headline?: string | null;
  contactInfo?: CVContactInfo | null;
}

export type PDFPageMode = 'multi-page' | 'single-page';

// ============ Inline edit-bridge helpers ============
//
// Map a data-id from the postMessage payload back to the matching field
// in GeneratedCVContent and return a new content object. Returns the
// SAME object reference when the id doesn't match anything (so the
// caller can skip an unnecessary state update).
function applyContentEdit(
  content: GeneratedCVContent,
  id: string,
  text: string,
): GeneratedCVContent {
  if (id === 'summary') {
    if (content.summary === text) return content;
    return { ...content, summary: text };
  }
  // v2-renderer toont de headline uit de content
  if (id === 'headline') {
    if (content.headline === text) return content;
    return { ...content, headline: text };
  }
  // Experience fields: exp-{i}-{title|company|period|description|highlight-{j}|location}
  let m = id.match(/^exp-(\d+)-(title|company|period|description|location)$/);
  if (m) {
    const i = Number(m[1]);
    const field = m[2] as 'title' | 'company' | 'period' | 'description' | 'location';
    if (!content.experience[i]) return content;
    const exp = { ...content.experience[i], [field]: text };
    const nextExp = content.experience.slice();
    nextExp[i] = exp;
    return { ...content, experience: nextExp };
  }
  m = id.match(/^exp-(\d+)-highlight-(\d+)$/);
  if (m) {
    const i = Number(m[1]);
    const j = Number(m[2]);
    if (!content.experience[i] || !content.experience[i].highlights?.[j]) return content;
    const highlights = content.experience[i].highlights!.slice();
    highlights[j] = text;
    const nextExp = content.experience.slice();
    nextExp[i] = { ...content.experience[i], highlights };
    return { ...content, experience: nextExp };
  }
  // Education fields: edu-{i}-{degree|institution|year}
  m = id.match(/^edu-(\d+)-(degree|institution|year)$/);
  if (m) {
    const i = Number(m[1]);
    const field = m[2] as 'degree' | 'institution' | 'year';
    if (!content.education[i]) return content;
    const edu = { ...content.education[i], [field]: text };
    const nextEdu = content.education.slice();
    nextEdu[i] = edu;
    return { ...content, education: nextEdu };
  }
  // Skills: skill-tech-{i} / skill-soft-{i}
  m = id.match(/^skill-(tech|soft)-(\d+)$/);
  if (m) {
    const group = m[1] === 'tech' ? 'technical' : 'soft';
    const i = Number(m[2]);
    const list = (content.skills?.[group] || []).slice();
    if (i < 0 || i >= list.length) return content;
    list[i] = text;
    return {
      ...content,
      skills: { ...content.skills, [group]: list },
    };
  }
  return content;
}

// Module-level debounce: one timeout per cvId, fire-and-forget PATCH
// to /api/cv/[id]/content with the latest content. The user's blur on
// successive elements coalesces into a single network call.
//
// `getToken` is passed in by the component so we can force-refresh the
// Firebase ID token before each PATCH — the `firebase-token` cookie
// expires after 55 minutes, so any long-open preview tab without an
// Authorization header would hit 401.
const contentSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debouncedSaveContent(
  cvId: string | null | undefined,
  content: GeneratedCVContent,
  getToken: () => Promise<string | null>,
) {
  if (!cvId) return;
  const existing = contentSaveTimers.get(cvId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    contentSaveTimers.delete(cvId);
    try {
      const token = await getToken();
      await fetch(`/api/cv/${cvId}/content`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ generatedContent: content }),
      });
    } catch (err) {
      console.error('[cv-preview] content save failed', err);
    }
  }, 500);
  contentSaveTimers.set(cvId, t);
}

interface CVPreviewProps {
  content: GeneratedCVContent;
  tokens: CVDesignTokens;
  /**
   * Snapshot of the original AI-generated tokens. Used by the live
   * design-tweaks panel as the Reset target. When null/undefined, the
   * Reset button is hidden.
   */
  originalDesignTokens?: CVDesignTokens | null;
  fullName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  contactInfo?: CVContactInfo | null;
  jobVacancy?: JobVacancy | null;
  linkedInData?: ParsedLinkedIn | null;
  fitAnalysis?: FitAnalysis | null;
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
  pdfDownloaded?: boolean;
  elementOverrides?: CVElementOverrides | null;
  onUpdateOverrides?: (overrides: CVElementOverrides) => void;
  onContentChange?: (content: GeneratedCVContent) => void;
  onHeaderChange?: (header: HeaderInfo) => void;
  onColorsChange?: (colors: CVDesignTokens['colors']) => void;
  onElementColorsChange?: (elementColors: ElementColorOverrides) => void;
  onTokensChange?: (tokens: CVDesignTokens) => void;
  // Dispute system state
  disputeCount?: number;
  currentCreativityLevel?: 'conservative' | 'balanced' | 'creative' | 'experimental' | 'editorial-paper';
  onDisputeApproved?: () => void;
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
  originalDesignTokens,
  fullName,
  headline,
  avatarUrl,
  contactInfo,
  jobVacancy,
  linkedInData,
  fitAnalysis,
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
  pdfDownloaded,
  elementOverrides: initialOverrides,
  onUpdateOverrides,
  onContentChange,
  onHeaderChange,
  onColorsChange,
  onElementColorsChange,
  onTokensChange,
  disputeCount = 0,
  currentCreativityLevel = 'balanced',
  onDisputeApproved,
}: CVPreviewProps) {
  const { llmMode, refreshToken } = useAuth();
  const t = useTranslations('cvPreview');
  const format = useFormatter();
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<CVElementOverrides>(
    initialOverrides || { overrides: [], lastModified: new Date() }
  );
  const [editedContent, setEditedContent] = useState<GeneratedCVContent>(content);
  const [editedHeader, setEditedHeader] = useState<HeaderInfo>({
    fullName,
    headline,
    contactInfo,
  });
  // Full tokens state — previously just `editedColors`. Live tweaks-panel
  // updates many more fields than just colors (fontPairing, paletteSaturation,
  // accentKeywords, etc.) so we need the entire tokens object as the
  // editing target. Old color-only path still works via `editedTokens.colors`.
  const [editedTokens, setEditedTokens] = useState<CVDesignTokens>(tokens);
  const [elementColors, setElementColors] = useState<ElementColorOverrides>({});
  const [isTweaksOpen, setIsTweaksOpen] = useState(false);
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

  // Sync tokens prop changes (e.g. dispute regenerate brings fresh tokens)
  useEffect(() => {
    setEditedTokens(tokens);
  }, [tokens]);

  // ============ Click-to-edit on preview (postMessage from iframe) ============
  //
  // The edit-bridge script (injected into the iframe HTML) makes every
  // element with a `data-id` contenteditable. On blur/Enter the iframe
  // postMessages `{ type: 'cv-content-edit', id, text }` to this parent.
  // We map the id back to the matching field in `editedContent` /
  // `editedHeader` and update state. The new content drives the useMemo
  // → generateCVHTML → iframe srcDoc cycle for live re-render.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Security: alleen berichten uit ónze preview-iframe accepteren. Zonder
      // deze check kon elke pagina die de app framet/opent CV-content wijzigen.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const msg = event.data;
      if (isPreviewHeightMessage(msg)) {
        iframeRef.current.style.height = `${Math.max(Math.ceil(msg.height) + 40, 800)}px`;
        return;
      }
      if (!isCVContentEditMessage(msg)) return;

      const { id, text } = msg;

      // Header path
      if (id === 'header-name') {
        setEditedHeader(prev => {
          const next = { ...prev, fullName: text };
          onHeaderChange?.(next);
          return next;
        });
        return;
      }
      if (id === 'header-headline') {
        setEditedHeader(prev => {
          const next = { ...prev, headline: text };
          onHeaderChange?.(next);
          return next;
        });
        return;
      }

      // Content paths
      setEditedContent(prev => {
        const next = applyContentEdit(prev, id, text);
        if (next === prev) return prev;
        onContentChange?.(next);
        // Debounced content-PATCH to Firestore — fire-and-forget
        debouncedSaveContent(cvId, next, refreshToken);
        return next;
      });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [cvId, onContentChange, onHeaderChange, refreshToken]);

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

  // Legacy colors-only callback for cv-content-editor — wraps the full
  // tokens update path so old callsites keep working.
  const handleColorsChange = useCallback((newColors: CVDesignTokens['colors']) => {
    setEditedTokens(prev => ({ ...prev, colors: newColors }));
    onColorsChange?.(newColors);
  }, [onColorsChange]);

  // New live-tweaks handler: replaces the whole tokens object atomically.
  const handleTokensTweak = useCallback((newTokens: CVDesignTokens) => {
    setEditedTokens(newTokens);
    onTokensChange?.(newTokens);
    // Mirror palette into the legacy onColorsChange so any downstream
    // listener that only watches colors stays in sync.
    if (JSON.stringify(newTokens.colors) !== JSON.stringify(editedTokens.colors)) {
      onColorsChange?.(newTokens.colors);
    }
  }, [onTokensChange, onColorsChange, editedTokens.colors]);

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

  // The editedTokens state IS the effective tokens — the tweaks panel
  // edits the entire object directly. No more colors-only carve-out.
  const effectiveTokens = editedTokens;

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

  // Render HTML — dispatcher picks legacy (v1) vs cv-engine (v2) on tokens.engineVersion.
  // Wrapped in try/catch so a render failure doesn't crash the whole page.
  const cvHTML = useMemo(() => {
    try {
      return withHeightReporter(renderCV(
        editedContent,
        effectiveTokens,
        {
          fullName: editedHeader.fullName,
          avatarUrl,
          headline: editedHeader.headline,
          overrides: effectiveOverrides,
          contactInfo: editedHeader.contactInfo,
          legacyOptions: { previewProtection: true, watermarkText: 'CVeetje PREVIEW' },
          // v2: click-to-edit-bridge (legacy injecteert hem zelf)
          editable: true,
          // Drive v2 section labels off the CV's output language so an English
          // CV shows "Interests/Experience" instead of defaulting to Dutch.
          locale: language,
        },
      ));
    } catch (err) {
      console.error('[cv-preview] renderCV failed:', err);
      return `<!doctype html><html><body style="font-family:system-ui;padding:40px;color:#a00"><h2>${escapeHtml(t('renderError'))}</h2><pre>${escapeHtml(err instanceof Error ? err.message : String(err))}</pre></body></html>`;
    }
  }, [editedContent, effectiveTokens, editedHeader, avatarUrl, effectiveOverrides, language, t]);

  // Check if content, header, tokens, or element colors have been edited
  const hasEdits = useMemo(() => {
    const contentChanged = JSON.stringify(content) !== JSON.stringify(editedContent);
    const headerChanged = fullName !== editedHeader.fullName ||
      headline !== editedHeader.headline ||
      JSON.stringify(contactInfo) !== JSON.stringify(editedHeader.contactInfo);
    const tokensChanged = JSON.stringify(tokens) !== JSON.stringify(editedTokens);
    const elementColorsChanged = Object.keys(elementColors).length > 0;
    return contentChanged || headerChanged || tokensChanged || elementColorsChanged;
  }, [content, editedContent, fullName, headline, contactInfo, editedHeader, tokens, editedTokens, elementColors]);

  // Auto-resize: de iframe draait sandboxed zonder allow-same-origin (opaque
  // origin), dus de hoogte komt via postMessage van withHeightReporter().

  // Get style summary from tokens — legacy v1 path only. v2 tokens have
  // none of these fields, so the derived configs become undefined; we wrap
  // each lookup in optional access so downstream JSX (guarded by isV2Tokens)
  // never tries to read .name / .primary / etc. on undefined.
  const fontConfig = tokens?.fontPairing ? fontPairings[tokens.fontPairing] : undefined;
  const typeScale = tokens?.scale ? typeScales[tokens.scale] : undefined;
  const spacingScale = tokens?.spacing ? spacingScales[tokens.spacing] : undefined;
  const themeConfig = tokens?.themeBase ? themeDefaults[tokens.themeBase] : undefined;
  // Touch _spacing/_theme/_font so linters don't flag them as unused on the v2 branch.
  void [fontConfig, spacingScale, themeConfig];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      <Card className={`w-full ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              {t('title')}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {tokens.styleName}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {cvId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDisputeOpen(true)}
                title={t('disputeTooltip')}
                aria-label={t('disputeTooltip')}
              >
                <Scale className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {linkedInData && (
              <Button
                variant={isChatOpen ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setIsChatOpen(!isChatOpen)}
                title={isChatOpen ? t('closeAssistant') : t('openAssistant')}
                aria-label={isChatOpen ? t('closeAssistant') : t('openAssistant')}
                aria-pressed={isChatOpen}
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant={isTweaksOpen ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setIsTweaksOpen(true)}
              title={t('tweaksTooltip')}
              aria-label={t('tweaksTooltip')}
            >
              <Wand2 className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              aria-label={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
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
                  <span className="font-semibold">{t('overview')}</span>
                  <Badge variant="outline" className="ml-2">{t('tldr')}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Profile Info */}
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      {t('profile')}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">{t('labelName')}</span> {editedHeader.fullName}</p>
                      {editedHeader.headline && (
                        <p><span className="font-medium">{t('labelJobTitle')}</span> {editedHeader.headline}</p>
                      )}
                      {editedHeader.contactInfo?.email && (
                        <p><span className="font-medium">{t('labelEmail')}</span> {editedHeader.contactInfo.email}</p>
                      )}
                      {editedHeader.contactInfo?.location && (
                        <p><span className="font-medium">{t('labelLocation')}</span> {editedHeader.contactInfo.location}</p>
                      )}
                    </div>
                  </div>

                  {/* Job Vacancy Info */}
                  {jobVacancy && (
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        {t('vacancy')}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">{t('labelJobTitle')}</span> {jobVacancy.title}</p>
                        {jobVacancy.company && (
                          <p><span className="font-medium">{t('labelCompany')}</span> {jobVacancy.company}</p>
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
                          <p><span className="font-medium">{t('labelIndustry')}</span> {jobVacancy.industry}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Salary Estimate */}
                  {jobVacancy?.salaryEstimate && (
                    <div className="space-y-2 p-3 border rounded-lg bg-background">
                      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        {t('salaryEstimate')}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-base">
                          €{format.number(jobVacancy.salaryEstimate.estimatedMin)} - €{format.number(jobVacancy.salaryEstimate.estimatedMax)}
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
                            {t('confidence', { level: jobVacancy.salaryEstimate.confidence })}
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
                        {t('keywords')}
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {jobVacancy.keywords.slice(0, 10).map((keyword, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {jobVacancy.keywords.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            {t('moreCount', { count: jobVacancy.keywords.length - 10 })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Style Info — v1 fields */}
                  {!isV2Tokens(tokens) && tokens?.colors && (
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      {t('style')}
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">{t('labelName')}</span> {tokens.styleName}</p>
                      <p><span className="font-medium">{t('labelTheme')}</span> {tokens.themeBase}</p>
                      <p><span className="font-medium">{t('labelIndustryFit')}</span> {tokens.industryFit}</p>
                      <div className="flex gap-1 mt-1">
                        {Object.entries(tokens.colors).map(([key, color]) => (
                          <div
                            key={key}
                            className="w-5 h-5 rounded border"
                            style={{ backgroundColor: color as string }}
                            title={`${key}: ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Style Info — v2 recipe */}
                  {isV2Tokens(tokens) && (() => {
                    const v2 = tokens as unknown as CVStyleTokensV2;
                    const recipe = getRecipeById(v2.recipeId);
                    if (!recipe) return null;
                    const roles = ['ink', 'paper', 'accent', 'muted', 'surface'] as const;
                    return (
                      <div className="space-y-2 p-3 border rounded-lg bg-background">
                        <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                          <Palette className="h-4 w-4" />
                          {t('style')}
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">{t('labelRecipe')}</span> {recipe.displayName}</p>
                          <p><span className="font-medium">{t('labelShape')}</span> {recipe.layoutShape}</p>
                          <p><span className="font-medium">{t('labelDensity')}</span> {recipe.density}</p>
                          <div className="flex gap-1 mt-1">
                            {roles.map(role => {
                              const oklch = v2.paletteOverride?.[role] ?? recipe.palette[role].anchor;
                              return (
                                <div
                                  key={role}
                                  className="w-5 h-5 rounded border"
                                  style={{ backgroundColor: oklchToCSS(oklch) }}
                                  title={`${role}: ${oklchToCSS(oklch)}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Generated Content Stats */}
                  <div className="space-y-2 p-3 border rounded-lg bg-background">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      {t('generatedContent')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="h-3 w-3 text-muted-foreground" />
                        <span>{t('skillsCount', { count: (editedContent.skills?.technical?.length || 0) + (editedContent.skills?.soft?.length || 0) })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{t('experienceCount', { count: editedContent.experience?.length || 0 })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{t('educationCount', { count: editedContent.education?.length || 0 })}</span>
                      </div>
                      {editedContent.languages && editedContent.languages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground" aria-hidden="true">🌐</span>
                          <span>{t('languagesCount', { count: editedContent.languages.length })}</span>
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
            <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
              <TabsTrigger value="preview" className="text-xs sm:text-sm">{t('tabPreview')}</TabsTrigger>
              <TabsTrigger value="edit" className="flex items-center gap-1 text-xs sm:text-sm">
                <Pencil className="h-3 w-3" />
                <span className="hidden sm:inline">{t('tabStructure')}</span>
                <span className="sm:hidden">{t('tabStructureShort')}</span>
                {hasEdits && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">{t('tabStyleDetails')}</span>
                <span className="sm:hidden">{t('style')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              {/* Preview iframe */}
              <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <iframe
                  ref={iframeRef}
                  srcDoc={cvHTML}
                  title={t('title')}
                  className="w-full min-h-[500px] sm:min-h-[800px] border-0"
                  sandbox="allow-scripts"
                />
              </div>
              {hasEdits && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    {t('editsNotice')}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              {/* Inline-edit guidance — primary path for text edits is now
                  click-on-preview. This tab remains as a back-up + for
                  structural ops (add/remove/reorder items) that don't fit
                  the inline flow yet. */}
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{t('editTipTitle')}</p>
                <p className="mt-1">
                  {t.rich('editTipBody', { strong: (chunks) => <strong>{chunks}</strong> })}
                </p>
              </div>
              <CVContentEditor
                content={editedContent}
                onContentChange={handleContentChange}
                headerInfo={editedHeader}
                onHeaderChange={handleHeaderChange}
                colors={editedTokens.colors}
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
                    setEditedTokens(tokens);
                    setElementColors({});
                  }}
                  disabled={!hasEdits}
                >
                  {t('resetToOriginal')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActiveTab('preview')}
                >
                  {t('viewPreview')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              {/* Style tokens display — v1 (legacy) layout */}
              {!isV2Tokens(tokens) && tokens?.colors && (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Theme & Colors */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('themeColors')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('theme')}</span>
                      <Badge variant="outline">{tokens.themeBase}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('industryFit')}</span>
                      <span className="text-sm text-muted-foreground">{tokens.industryFit}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.primary }}
                      title={`${t('colorPrimary')}: ${tokens.colors.primary}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.secondary }}
                      title={`${t('colorSecondary')}: ${tokens.colors.secondary}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.accent }}
                      title={`${t('colorAccent')}: ${tokens.colors.accent}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.text }}
                      title={`${t('colorText')}: ${tokens.colors.text}`}
                    />
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tokens.colors.muted }}
                      title={`${t('colorMuted')}: ${tokens.colors.muted}`}
                    />
                  </div>
                </div>

                {/* Typography */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('typography')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('fontPairing')}</span>
                      <span className="text-sm text-muted-foreground">{tokens.fontPairing}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('scale')}</span>
                      <Badge variant="outline">{tokens.scale}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('nameSize')}</span>
                      <span className="text-sm text-muted-foreground">{typeScale?.name ?? '—'}pt</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('bodySize')}</span>
                      <span className="text-sm text-muted-foreground">{typeScale?.body ?? '—'}pt</span>
                    </div>
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('layout')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('header')}</span>
                      <Badge variant="outline">{tokens.headerVariant}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('sections')}</span>
                      <Badge variant="outline">{tokens.sectionStyle}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('spacing')}</span>
                      <Badge variant="outline">{tokens.spacing}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('skills')}</span>
                      <Badge variant="outline">{tokens.skillsDisplay}</Badge>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {t('features')}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('photo')}</span>
                      <Badge variant={tokens.showPhoto ? 'default' : 'secondary'}>
                        {tokens.showPhoto ? t('on') : t('off')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('icons')}</span>
                      <Badge variant={tokens.useIcons ? 'default' : 'secondary'}>
                        {tokens.useIcons ? t('on') : t('off')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{t('roundedCorners')}</span>
                      <Badge variant={tokens.roundedCorners ? 'default' : 'secondary'}>
                        {tokens.roundedCorners ? t('on') : t('off')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rationale */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                  {t('styleRationale')}
                </h3>
                <p className="text-sm text-muted-foreground">{tokens.styleRationale}</p>
              </div>
              </>
              )}

              {/* Style tokens display — v2 (cv-engine) layout */}
              {isV2Tokens(tokens) && (() => {
                const v2 = tokens as unknown as CVStyleTokensV2;
                const recipe = getRecipeById(v2.recipeId);
                if (!recipe) {
                  return (
                    <div className="p-4 border rounded-lg bg-muted/30 text-sm text-muted-foreground">
                      {t.rich('recipeNotFound', { id: v2.recipeId, code: (chunks) => <code>{chunks}</code> })}
                    </div>
                  );
                }
                const roles = ['ink', 'paper', 'accent', 'muted', 'surface'] as const;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          {t('recipePalette')}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('recipe')}</span>
                            <Badge variant="outline">{recipe.displayName}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('route')}</span>
                            <span className="text-sm text-muted-foreground">{recipe.route}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {roles.map(role => {
                            const oklch = v2.paletteOverride?.[role] ?? recipe.palette[role].anchor;
                            return (
                              <div
                                key={role}
                                className="w-8 h-8 rounded border"
                                style={{ backgroundColor: oklchToCSS(oklch) }}
                                title={`${role}: ${oklchToCSS(oklch)}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                      <div className="space-y-3 p-4 border rounded-lg">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          {t('layoutTypography')}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('shape')}</span>
                            <Badge variant="outline">{recipe.layoutShape}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('density')}</span>
                            <Badge variant="outline">{recipe.density}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('font')}</span>
                            <span className="text-sm text-muted-foreground">
                              {v2.fontOverride ?? recipe.allowedFontPairings[0]}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{t('pageMode')}</span>
                            <Badge variant="outline">{v2.pageMode ?? 'a4-paged'}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                        {t('recipeBrief')}
                      </h3>
                      <p className="text-sm text-muted-foreground">{recipe.description}</p>
                    </div>
                  </>
                );
              })()}
            </TabsContent>

          </Tabs>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
            {isDownloading ? (
              <Button
                disabled
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4 animate-bounce" />
                {t('generatingPdf')}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* PDF-download is gratis (credits gaan op aan cv-generate) */}
                  <Button className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    {t('download')}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => onDownload('multi-page')}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t('a4Pages')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('a4PagesDesc')}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload('single-page')}>
                    <div className="flex flex-col">
                      <span className="font-medium">{t('singleLongPage')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('singleLongPageDesc')}
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
            >
              {isRegenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('regenerating')}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('regenerate')}
                  {llmMode === 'platform' && (
                    <CreditBadge operation="cv-generate" className="ml-2 hidden sm:inline-flex" />
                  )}
                </>
              )}
            </Button>

            {onNewVacancy && (
              <Button
                variant="outline"
                onClick={onNewVacancy}
                disabled={isDownloading || isRegenerating}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{t('newVacancy')}</span>
                <span className="sm:hidden">{t('newVacancyShort')}</span>
              </Button>
            )}
          </div>


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

      {/* CV Chat Panel */}
      {linkedInData && (
        <CVChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          linkedInData={linkedInData}
          jobVacancy={jobVacancy || null}
          fitAnalysis={fitAnalysis || null}
          currentContent={editedContent}
          currentTokens={effectiveTokens}
          language={language}
          onContentChange={handleContentChange}
          onTokensChange={onTokensChange}
        />
      )}

      {/* Dispute Dialog */}
      {cvId && (
        <CVDisputeDialog
          cvId={cvId}
          open={isDisputeOpen}
          onOpenChange={setIsDisputeOpen}
          currentLevel={currentCreativityLevel}
          disputeCount={disputeCount}
          onApproved={onDisputeApproved}
        />
      )}

      {cvId && (
        <DesignTweaksSheet
          open={isTweaksOpen}
          onOpenChange={setIsTweaksOpen}
          tokens={editedTokens}
          originalTokens={originalDesignTokens ?? null}
          creativityLevel={currentCreativityLevel}
          cvId={cvId}
          onTokensChange={handleTokensTweak}
        />
      )}
    </div>
  );
}

export default CVPreview;


// ============ Sandboxed preview helpers ============
//
// Security: de preview-iframe draaide met `allow-same-origin allow-scripts`,
// wat de sandbox volledig opheft — script in de CV-HTML (bijv. via
// geïnjecteerde tokens) liep dan op de app-origin, ook in de browser van een
// admin die impersoneert. Nu draait de iframe op een opaque origin en meldt
// hij zijn hoogte via postMessage.

interface PreviewHeightMessage {
  type: 'cv-preview-height';
  height: number;
}

function isPreviewHeightMessage(v: unknown): v is PreviewHeightMessage {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return m.type === 'cv-preview-height' && typeof m.height === 'number' && Number.isFinite(m.height);
}

// Zelfde timing als de oude same-origin resize (load + 500ms); geen
// ResizeObserver om een groei-feedbackloop met de iframe-hoogte te vermijden.
const HEIGHT_REPORTER_SCRIPT = `<script data-cv-height="1">(function(){function s(){try{if(document.body){parent.postMessage({type:'cv-preview-height',height:document.body.scrollHeight},'*')}}catch(e){}}window.addEventListener('load',function(){s();setTimeout(s,500)})})();</script>`;

function withHeightReporter(html: string): string {
  const idx = html.lastIndexOf('</body>');
  return idx === -1 ? html + HEIGHT_REPORTER_SCRIPT : html.slice(0, idx) + HEIGHT_REPORTER_SCRIPT + html.slice(idx);
}
