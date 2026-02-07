'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import type { PDFTemplateSummary } from '@/types';

export function TemplatesPage() {
  const t = useTranslations('templatesPage');
  const tTemplates = useTranslations('templates');
  const [personalTemplates, setPersonalTemplates] = useState<PDFTemplateSummary[]>([]);
  const [assignedTemplates, setAssignedTemplates] = useState<PDFTemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<PDFTemplateSummary | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewStyleRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const templates: PDFTemplateSummary[] = data.templates || [];
      setPersonalTemplates(templates.filter((t: PDFTemplateSummary) => !t.isGlobal));
      setAssignedTemplates(templates.filter((t: PDFTemplateSummary) => t.isGlobal));
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
    ];
    if (!validTypes.includes(file.type)) {
      alert(tTemplates('errors.invalidFileType'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(tTemplates('errors.fileTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.(docx|pdf)$/i, ''));

      const response = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      await fetchTemplates();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (!response.ok) throw new Error('Rename failed');
      setRenamingId(null);
      setRenameValue('');
      await fetchTemplates();
    } catch (error) {
      console.error('Rename failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Delete failed');
      await fetchTemplates();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handlePreview = async (template: PDFTemplateSummary) => {
    setPreviewTemplate(template);
    setPreviewLoading(true);

    try {
      const response = await fetch(`/api/templates/${template.id}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      const data = await response.json();
      const storageUrl = data.template?.storageUrl;
      if (!storageUrl) throw new Error('No storage URL');

      const fileResponse = await fetch(storageUrl);
      if (!fileResponse.ok) throw new Error('Failed to fetch file');
      const blob = await fileResponse.blob();

      // Wait for dialog to render
      await new Promise(resolve => setTimeout(resolve, 100));

      if (previewContainerRef.current && template.fileType === 'docx') {
        previewContainerRef.current.innerHTML = '';
        if (previewStyleRef.current) previewStyleRef.current.innerHTML = '';

        const { renderAsync } = await import('docx-preview');
        await renderAsync(blob, previewContainerRef.current, previewStyleRef.current ?? undefined, {
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          useBase64URL: true,
          className: 'docx-preview-wrapper',
        });
      }
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const TemplateCard = ({ template, isGlobal }: { template: PDFTemplateSummary; isGlobal: boolean }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{template.name}</p>
            {isGlobal && (
              <Badge variant="secondary" className="shrink-0">{t('assignedBadge')}</Badge>
            )}
            <Badge variant="outline" className="shrink-0 uppercase text-xs">
              {template.fileType}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {template.fileName} &middot; {template.pageCount} {tTemplates('pages')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {template.fileType === 'docx' && (
          <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {!isGlobal && (
          <>
            {renamingId === template.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder={t('newName')}
                  className="h-8 w-40"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename(template.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRename(template.id)}
                >
                  {t('rename')}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRenamingId(template.id);
                  setRenameValue(template.name);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('confirmDelete')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('rename')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(template.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Personal Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('myTemplates')}</CardTitle>
              <CardDescription>{t('myTemplatesDescription')}</CardDescription>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? t('uploading') : t('upload')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : personalTemplates.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t('emptyPersonal')}</p>
          ) : (
            <div className="space-y-2">
              {personalTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} isGlobal={false} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Templates */}
      {(assignedTemplates.length > 0 || !loading) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('assignedTemplates')}</CardTitle>
            <CardDescription>{t('assignedTemplatesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : assignedTemplates.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t('emptyAssigned')}</p>
            ) : (
              <div className="space-y-2">
                {assignedTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} isGlobal={true} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DOCX Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div ref={previewStyleRef} />
              <div
                ref={previewContainerRef}
                className="[&_.docx-preview-wrapper]:p-0 [&_.docx-preview-wrapper]:m-0 [&_.docx-preview-wrapper]:bg-transparent [&_.docx-wrapper]:shadow-none [&_.docx-wrapper]:mx-auto [&_.docx-wrapper]:my-2"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
