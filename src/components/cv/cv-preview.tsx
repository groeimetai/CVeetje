'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, FileText, Coins, Sparkles, Maximize2, Minimize2, Pencil, Save } from 'lucide-react';
import type { GeneratedCVContent, CVStyleConfig, CVElementOverrides, ElementOverride, EditableElementType } from '@/types';
import { generateCVHTML } from '@/lib/cv/html-generator';
import { ElementEditor } from './element-editor';

interface SelectedElement {
  elementId: string;
  elementType: EditableElementType;
  elementLabel: string;
}

interface CVPreviewProps {
  content: GeneratedCVContent;
  styleConfig: CVStyleConfig;
  fullName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  onDownload: () => void;
  onRegenerate: () => void;
  isDownloading: boolean;
  isRegenerating: boolean;
  credits: number;
  elementOverrides?: CVElementOverrides | null;
  onUpdateOverrides?: (overrides: CVElementOverrides) => void;
}

export function CVPreview({
  content,
  styleConfig,
  fullName,
  headline,
  avatarUrl,
  onDownload,
  onRegenerate,
  isDownloading,
  isRegenerating,
  credits,
  elementOverrides: initialOverrides,
  onUpdateOverrides,
}: CVPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [localOverrides, setLocalOverrides] = useState<CVElementOverrides>(
    initialOverrides || { overrides: [], lastModified: new Date() }
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { colors, typography, layout, decorations } = styleConfig;

  // Update local overrides when prop changes
  useEffect(() => {
    if (initialOverrides) {
      setLocalOverrides(initialOverrides);
    }
  }, [initialOverrides]);

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elementSelected') {
        setSelectedElement({
          elementId: event.data.elementId,
          elementType: event.data.elementType as EditableElementType,
          elementLabel: event.data.elementLabel,
        });
      } else if (event.data.type === 'elementDeselected') {
        setSelectedElement(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Toggle edit mode in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'setEditMode', enabled: editMode }, '*');
    }
  }, [editMode]);

  // Handle override updates
  const handleUpdateOverride = useCallback((override: ElementOverride) => {
    setLocalOverrides(prev => {
      const existing = prev.overrides.findIndex(o => o.elementId === override.elementId);
      const newOverrides = [...prev.overrides];

      if (existing >= 0) {
        newOverrides[existing] = override;
      } else {
        newOverrides.push(override);
      }

      return {
        overrides: newOverrides,
        lastModified: new Date(),
      };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Handle remove override
  const handleRemoveOverride = useCallback((elementId: string) => {
    setLocalOverrides(prev => ({
      overrides: prev.overrides.filter(o => o.elementId !== elementId),
      lastModified: new Date(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Save overrides
  const handleSaveOverrides = useCallback(() => {
    if (onUpdateOverrides) {
      onUpdateOverrides(localOverrides);
      setHasUnsavedChanges(false);
    }
  }, [localOverrides, onUpdateOverrides]);

  // Generate HTML with edit mode and overrides
  const cvHTML = useMemo(() =>
    generateCVHTML(content, styleConfig, fullName, avatarUrl, headline, localOverrides, editMode),
    [content, styleConfig, fullName, avatarUrl, headline, localOverrides, editMode]
  );

  // Auto-resize iframe to content height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resizeIframe = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          // Add some padding to prevent scrollbars
          const height = doc.body.scrollHeight + 40;
          iframe.style.height = `${Math.max(height, 800)}px`;
        }
      } catch {
        // Cross-origin errors are expected, ignore them
      }
    };

    // Resize after content loads
    iframe.addEventListener('load', resizeIframe);
    return () => iframe.removeEventListener('load', resizeIframe);
  }, [cvHTML]);

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CV Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Style: {styleConfig.styleName}
            </Badge>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {credits} credits
            </Badge>
            {/* Edit Mode Toggle */}
            <Button
              variant={editMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setEditMode(!editMode);
                if (editMode) setSelectedElement(null);
              }}
              className="h-8 text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              {editMode ? 'Exit Edit' : 'Edit'}
            </Button>
            {/* Save Changes Button */}
            {hasUnsavedChanges && onUpdateOverrides && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveOverrides}
                className="h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="preview">Visual Preview</TabsTrigger>
            <TabsTrigger value="content">Content View</TabsTrigger>
            <TabsTrigger value="style-debug">Style Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="preview">
            <div className="flex gap-4">
              {/* Main Preview */}
              <div className={`border rounded-lg bg-white overflow-hidden ${editMode ? 'flex-1' : 'w-full'}`}>
                {/* Info banner */}
                <div className={`px-4 py-2 border-b text-xs flex items-center gap-2 ${editMode ? 'bg-blue-50 text-blue-700' : 'bg-muted/50 text-muted-foreground'}`}>
                  {editMode ? (
                    <>
                      <Pencil className="h-3 w-3" />
                      <span>Click on any element to select and edit it. Changes are applied in real-time.</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      <span>This preview shows exactly what your PDF will look like</span>
                    </>
                  )}
                </div>
                {/* Hidden elements count */}
                {localOverrides.overrides.filter(o => o.hidden).length > 0 && (
                  <div className="bg-amber-50 px-4 py-1 border-b text-xs text-amber-700 flex items-center gap-2">
                    <span>{localOverrides.overrides.filter(o => o.hidden).length} element(s) hidden</span>
                  </div>
                )}
                {/* Iframe with exact PDF HTML */}
                <iframe
                  ref={iframeRef}
                  srcDoc={cvHTML}
                  className="w-full border-0 bg-white"
                  style={{
                    minHeight: '800px',
                    display: 'block',
                  }}
                  title="CV Preview"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>

              {/* Element Editor Panel - Only shown in edit mode */}
              {editMode && (
                <div className="w-80 flex-shrink-0">
                  <ElementEditor
                    selectedElement={selectedElement}
                    elementOverrides={localOverrides}
                    onUpdateOverride={handleUpdateOverride}
                    onRemoveOverride={handleRemoveOverride}
                    onClose={() => setSelectedElement(null)}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Professional Summary
                </h3>
                <p className="text-muted-foreground">{content.summary}</p>
              </div>

              {/* Experience */}
              <div>
                <h3 className="font-semibold mb-3">Experience ({content.experience.length})</h3>
                <div className="space-y-4">
                  {content.experience.map((exp, i) => (
                    <div key={i} className="border-l-2 pl-4" style={{ borderColor: colors.primary }}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{exp.title}</span>
                        <Badge variant="outline">{exp.company}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{exp.period}</p>
                      <ul className="mt-2 space-y-1">
                        {exp.highlights.map((h, j) => (
                          <li key={j} className="text-sm list-disc ml-4">{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div>
                <h3 className="font-semibold mb-3">Education ({content.education.length})</h3>
                <div className="space-y-2">
                  {content.education.map((edu, i) => (
                    <div key={i}>
                      <span className="font-medium">{edu.degree}</span>
                      <span className="text-muted-foreground"> - {edu.institution} ({edu.year})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <h3 className="font-semibold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {content.skills.technical.map((skill, i) => (
                    <Badge key={i}>{skill}</Badge>
                  ))}
                  {content.skills.soft.map((skill, i) => (
                    <Badge key={i} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Languages */}
              {content.languages.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Languages</h3>
                  <div className="flex gap-4">
                    {content.languages.map((lang, i) => (
                      <span key={i}>
                        {lang.language} <span className="text-muted-foreground">({lang.level})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {content.certifications.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Certifications</h3>
                  <ul className="list-disc ml-4 space-y-1">
                    {content.certifications.map((cert, i) => (
                      <li key={i} className="text-sm">{cert}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="style-debug">
            <div className="space-y-4 p-4 bg-muted rounded-lg font-mono text-sm">
              <div>
                <h4 className="font-bold mb-2">Style Config Debug</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">Colors:</p>
                    <div className="space-y-1 ml-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ background: colors.primary }} />
                        <span>Primary: {colors.primary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ background: colors.secondary }} />
                        <span>Secondary: {colors.secondary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ background: colors.accent }} />
                        <span>Accent: {colors.accent}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ background: colors.text }} />
                        <span>Text: {colors.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ background: colors.muted }} />
                        <span>Muted: {colors.muted}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Typography:</p>
                    <div className="space-y-1 ml-2">
                      <p>Heading Font: {typography.headingFont}</p>
                      <p>Body Font: {typography.bodyFont}</p>
                      <p>Name Size: {typography.nameSizePt}pt</p>
                      <p>Heading Size: {typography.headingSizePt}pt</p>
                      <p>Body Size: {typography.bodySizePt}pt</p>
                      <p>Line Height: {typography.lineHeight}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Layout:</p>
                    <div className="space-y-1 ml-2">
                      <p>Style: {layout.style}</p>
                      <p>Header Style: {layout.headerStyle}</p>
                      <p>Section Divider: {layout.sectionDivider}</p>
                      <p>Skill Display: {layout.skillDisplay}</p>
                      <p>Spacing: {layout.spacing}</p>
                      <p>Show Photo: {layout.showPhoto ? 'Yes' : 'No'}</p>
                      <p>Section Order: {layout.sectionOrder.join(', ')}</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">Decorations:</p>
                    <div className="space-y-1 ml-2">
                      <p>Intensity: {decorations.intensity}</p>
                      <p>Use Borders: {decorations.useBorders ? 'Yes' : 'No'}</p>
                      <p>Use Backgrounds: {decorations.useBackgrounds ? 'Yes' : 'No'}</p>
                      <p>Icon Style: {decorations.iconStyle}</p>
                      <p>Corner Style: {decorations.cornerStyle}</p>
                      <p>Item Style: {decorations.itemStyle || 'inline'}</p>
                      <p>Header Accent: {decorations.headerAccent || 'none'}</p>
                    </div>
                  </div>
                </div>
                {/* SVG Decorations Debug Info */}
                {decorations.svgDecorations && (
                  <div className="mt-4 p-3 bg-muted/50 rounded">
                    <p className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      SVG Decorations:
                    </p>
                    <div className="space-y-1 ml-2 mt-2">
                      <p>Enabled: {decorations.svgDecorations.enabled ? 'Yes' : 'No'}</p>
                      <p>Theme: {decorations.svgDecorations.theme}</p>
                      <p>Placement: {decorations.svgDecorations.placement}</p>
                      <p>Opacity: {decorations.svgDecorations.opacity}</p>
                      <p>Scale: {decorations.svgDecorations.scale}</p>
                      <p>Color Source: {decorations.svgDecorations.colorSource}</p>
                    </div>
                  </div>
                )}
                {/* Custom CSS Debug Info */}
                {styleConfig.customCSS && (
                  <div className="mt-4 p-3 bg-muted/50 rounded">
                    <p className="font-semibold">Custom CSS:</p>
                    <div className="space-y-1 ml-2 mt-2 text-xs">
                      {styleConfig.customCSS.headerCSS && (
                        <p>Header: <code className="bg-background px-1 rounded">{styleConfig.customCSS.headerCSS}</code></p>
                      )}
                      {styleConfig.customCSS.itemCSS && (
                        <p>Item: <code className="bg-background px-1 rounded">{styleConfig.customCSS.itemCSS}</code></p>
                      )}
                      {styleConfig.customCSS.sectionCSS && (
                        <p>Section: <code className="bg-background px-1 rounded">{styleConfig.customCSS.sectionCSS}</code></p>
                      )}
                      {styleConfig.customCSS.skillsCSS && (
                        <p>Skills: <code className="bg-background px-1 rounded">{styleConfig.customCSS.skillsCSS}</code></p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">Style Name: {styleConfig.styleName}</p>
                <p className="text-muted-foreground">{styleConfig.styleRationale}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Action Buttons */}
      <div className="p-6 pt-0 flex gap-3">
        <Button
          onClick={onDownload}
          disabled={isDownloading || credits < 1}
          className="flex-1"
        >
          {isDownloading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF (1 credit)
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}
