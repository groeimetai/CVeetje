'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Loader2,
  AlertTriangle,
  Check,
  Download,
  ArrowRight,
} from 'lucide-react';
import type { PDFTemplate, PDFTemplateSummary, ParsedLinkedIn } from '@/types';

interface TemplateSelectorProps {
  profileData: ParsedLinkedIn;
  onFill: (pdfBlob: Blob, templateName: string) => void;
  onBack: () => void;
}

export function TemplateSelector({ profileData, onFill, onBack }: TemplateSelectorProps) {
  const t = useTranslations('templates.selector');
  const [templates, setTemplates] = useState<PDFTemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilling, setIsFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom values for fields not in LinkedIn data
  const [customValues, setCustomValues] = useState<Record<string, string>>({
    birthDate: '',
    nationality: '',
  });

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/templates');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch templates');
      }

      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = async (templateId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch template');
      }

      setSelectedTemplate(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch template');
    }
  };

  const handleFill = async () => {
    if (!selectedTemplate) return;

    // Check if template has fields
    if (!selectedTemplate.fields || selectedTemplate.fields.length === 0) {
      setError(t('noFieldsConfigured'));
      return;
    }

    try {
      setIsFilling(true);
      setError(null);

      const response = await fetch(`/api/templates/${selectedTemplate.id}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileData,
          customValues,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fill template');
      }

      // Get the PDF blob
      const blob = await response.blob();
      onFill(blob, selectedTemplate.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fill template');
    } finally {
      setIsFilling(false);
    }
  };

  // Check which custom fields are needed
  const needsBirthDate = selectedTemplate?.fields?.some(
    (f) => f.mapping.type === 'personal' && (f.mapping as { field: string }).field === 'birthDate'
  );
  const needsNationality = selectedTemplate?.fields?.some(
    (f) => f.mapping.type === 'personal' && (f.mapping as { field: string }).field === 'nationality'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {/* Template selection */}
      {!selectedTemplate ? (
        <>
          <div>
            <h3 className="text-lg font-medium mb-2">{t('title')}</h3>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">{t('noTemplates')}</p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  {t('noTemplatesHint')}
                </p>
                <Button variant="outline" onClick={onBack} className="mt-4">
                  {t('back')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => selectTemplate(template.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {template.fileName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {template.pageCount} {t('pages')} • {template.fieldCount} {t('fields')}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected template details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {selectedTemplate.name}
              </CardTitle>
              <CardDescription>
                {selectedTemplate.fileName} • {selectedTemplate.pageCount} {t('pages')} • {selectedTemplate.fields?.length || 0} {t('fields')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show profile data that will be used */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('dataToFill')}</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('name')}:</span>
                    <span>{profileData.fullName}</span>
                  </div>
                  {profileData.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('email')}:</span>
                      <span>{profileData.email}</span>
                    </div>
                  )}
                  {profileData.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('location')}:</span>
                      <span>{profileData.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('experience')}:</span>
                    <span>{profileData.experience.length} {t('items')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('education')}:</span>
                    <span>{profileData.education.length} {t('items')}</span>
                  </div>
                </div>
              </div>

              {/* Custom values input (for fields not in LinkedIn) */}
              {(needsBirthDate || needsNationality) && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-medium text-sm">{t('additionalInfo')}</h4>
                  {needsBirthDate && (
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">{t('birthDate')}</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={customValues.birthDate}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, birthDate: e.target.value }))
                        }
                      />
                    </div>
                  )}
                  {needsNationality && (
                    <div className="space-y-2">
                      <Label htmlFor="nationality">{t('nationality')}</Label>
                      <Input
                        id="nationality"
                        value={customValues.nationality}
                        onChange={(e) =>
                          setCustomValues((prev) => ({ ...prev, nationality: e.target.value }))
                        }
                        placeholder="bijv. Nederlands"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                  {t('changeTemplate')}
                </Button>
                <Button onClick={handleFill} disabled={isFilling} className="flex-1">
                  {isFilling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('filling')}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t('fillAndDownload')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
