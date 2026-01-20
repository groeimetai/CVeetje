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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Trash2,
  Settings,
  Loader2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import type { PDFTemplateSummary } from '@/types';

interface TemplateListProps {
  onSelect?: (templateId: string) => void;
  onConfigure?: (templateId: string) => void;
  selectable?: boolean;
}

export function TemplateList({ onSelect, onConfigure, selectable = false }: TemplateListProps) {
  const t = useTranslations('templates');
  const [templates, setTemplates] = useState<PDFTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      // Refresh list and close dialog
      await fetchTemplates();
      setUploadDialogOpen(false);
      setNewTemplateName('');
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload template');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    try {
      setDeletingId(templateId);
      setError(null);

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete template');
      }

      // Remove from list
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
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
        const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
        setNewTemplateName(nameWithoutExt);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {/* Upload button */}
      <div className="flex justify-end">
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('upload.button')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('upload.title')}</DialogTitle>
              <DialogDescription>{t('upload.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">{t('upload.nameLabel')}</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={t('upload.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-file">{t('upload.fileLabel')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="template-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
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
                    {t('upload.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('upload.submit')}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">{t('empty.title')}</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {t('empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={selectable ? 'cursor-pointer hover:border-primary transition-colors' : ''}
              onClick={selectable ? () => onSelect?.(template.id) : undefined}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {template.fileName} • {template.pageCount} {t('pages')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {template.fieldCount} {t('fieldsConfigured')}
                  </span>
                  <div className="flex gap-1">
                    {onConfigure && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigure(template.id);
                        }}
                        title={t('configure')}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                      disabled={deletingId === template.id}
                      title={t('delete')}
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
