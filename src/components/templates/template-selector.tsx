'use client';

import { useState, useEffect, useRef } from 'react';
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
  FileType,
  Loader2,
  AlertTriangle,
  Download,
  ArrowRight,
  Upload,
  Plus,
  Settings,
  CheckCircle,
  Sparkles,
  Brain,
} from 'lucide-react';
import type { PDFTemplate, PDFTemplateSummary, ParsedLinkedIn, JobVacancy, OutputLanguage, FitAnalysis } from '@/types';

interface TemplateSelectorProps {
  profileData: ParsedLinkedIn;
  jobVacancy?: JobVacancy;
  fitAnalysis?: FitAnalysis;
  language?: OutputLanguage;
  onFill: (templateId: string, templateName: string) => void;
  onBack: () => void;
}

export function TemplateSelector({ profileData, jobVacancy, fitAnalysis, language = 'nl', onFill, onBack }: TemplateSelectorProps) {
  const t = useTranslations('templates.selector');
  const tUpload = useTranslations('templates.upload');
  const tConfig = useTranslations('templates.configurator');
  const [templates, setTemplates] = useState<PDFTemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configure state - show after upload
  const [showConfigurePrompt, setShowConfigurePrompt] = useState(false);
  const [newlyUploadedTemplate, setNewlyUploadedTemplate] = useState<PDFTemplate | null>(null);

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

  const SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(t('errors.invalidFileType'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t('errors.fileTooLarge'));
        return;
      }
      setSelectedFile(file);
      // Auto-fill name from filename if empty
      if (!newTemplateName) {
        const nameWithoutExt = file.name.replace(/\.(pdf|docx)$/i, '');
        setNewTemplateName(nameWithoutExt);
      }
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newTemplateName.trim()) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', newTemplateName.trim());

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload template');
      }

      // Refresh templates list
      await fetchTemplates();

      // Store newly uploaded template and show configure prompt
      setNewlyUploadedTemplate(data.template);
      setShowConfigurePrompt(true);

      // Close upload dialog and reset
      setUploadDialogOpen(false);
      setNewTemplateName('');
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(t('errors.invalidFileType'));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(t('errors.fileTooLarge'));
        return;
      }
      setSelectedFile(file);
      if (!newTemplateName) {
        const nameWithoutExt = file.name.replace(/\.(pdf|docx)$/i, '');
        setNewTemplateName(nameWithoutExt);
      }
      setError(null);
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

    // Check if template is ready to fill
    const isDocx = selectedTemplate.fileType === 'docx';
    const hasContent = isDocx
      ? true // AI handles everything for DOCX
      : (selectedTemplate.fields && selectedTemplate.fields.length > 0);

    if (!hasContent) {
      setError(t('noFieldsConfigured'));
      return;
    }

    // Pass templateId to parent - parent will handle the API call and preview
    onFill(selectedTemplate.id, selectedTemplate.name);
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

  // Show configure prompt after upload
  if (showConfigurePrompt && newlyUploadedTemplate) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <FileText className="h-5 w-5" />
              {t('uploadSuccess')}
            </CardTitle>
            <CardDescription>
              {t('uploadSuccessDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{newlyUploadedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {newlyUploadedTemplate.fileName} • {newlyUploadedTemplate.pageCount} {t('pages')}
                  </p>
                </div>
              </div>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <span className="ml-2">{t('configureHint')}</span>
            </Alert>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfigurePrompt(false);
                  setNewlyUploadedTemplate(null);
                }}
                className="flex-1"
              >
                {t('configureLater')}
              </Button>
              <Button
                onClick={() => {
                  // Open settings in new tab for configuration
                  window.open(`/settings?tab=templates&configure=${newlyUploadedTemplate.id}`, '_blank');
                  setShowConfigurePrompt(false);
                  setNewlyUploadedTemplate(null);
                }}
                className="flex-1"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t('configureNow')}
              </Button>
            </div>
          </CardContent>
        </Card>
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

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tUpload('title')}</DialogTitle>
            <DialogDescription>{tUpload('description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{tUpload('nameLabel')}</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder={tUpload('namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{tUpload('fileLabel')}</Label>
              <div
                onClick={handleDropzoneClick}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('dropzone')}
                </p>
              </div>
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !newTemplateName.trim() || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tUpload('uploading')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {tUpload('submit')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template selection */}
      {!selectedTemplate ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">{t('title')}</h3>
              <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {tUpload('button')}
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div
                  onClick={() => setUploadDialogOpen(true)}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-medium">{t('uploadFirst')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('dropzone')}
                  </p>
                </div>
                <Button variant="outline" onClick={onBack} className="mt-4">
                  {t('back')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => {
                const isDocx = template.fileType === 'docx';
                const hasDetectedItems = isDocx
                  ? (template.placeholderCount || 0) > 0
                  : template.fieldCount > 0;

                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => selectTemplate(template.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {isDocx ? (
                          <FileType className="h-4 w-4 text-blue-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                        {template.name}
                        {template.autoAnalyzed && hasDetectedItems && (
                          <span className="flex items-center gap-1 text-xs font-normal bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            <Sparkles className="h-3 w-3" />
                            {t('autoDetected')}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs flex items-center gap-1">
                        <span className="uppercase text-[10px] font-medium bg-muted px-1 rounded">
                          {template.fileType}
                        </span>
                        {template.fileName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {template.pageCount} {t('pages')}
                          {isDocx
                            ? ` • ${template.placeholderCount || 0} ${t('placeholders')}`
                            : ` • ${template.fieldCount} ${t('fields')}`}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected template details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedTemplate.fileType === 'docx' ? (
                  <FileType className="h-5 w-5 text-blue-600" />
                ) : (
                  <FileText className="h-5 w-5 text-red-600" />
                )}
                {selectedTemplate.name}
                {selectedTemplate.autoAnalyzed && (
                  <span className="flex items-center gap-1 text-xs font-normal bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    {t('readyToFill')}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                <span className="uppercase text-[10px] font-medium bg-muted px-1 rounded mr-1">
                  {selectedTemplate.fileType}
                </span>
                {selectedTemplate.fileName} • {selectedTemplate.pageCount} {t('pages')}
                {selectedTemplate.fileType === 'docx'
                  ? ` • ${selectedTemplate.placeholders?.length || 0} ${t('placeholders')}`
                  : ` • ${selectedTemplate.fields?.length || 0} ${t('fields')}`}
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

              {/* AI Mode Info for DOCX templates */}
              {selectedTemplate.fileType === 'docx' && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{t('aiMode.title')}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('aiMode.enabledDescription')}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600">{t('aiMode.creditWarning')}</span>
                  </div>
                </div>
              )}

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
                <Button onClick={handleFill} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  {t('fillAndDownload')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
