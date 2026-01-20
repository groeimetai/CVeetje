'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  Wand2,
  Save,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import type { PDFTemplate, PDFTemplateField, DetectedTemplateField, ProfileFieldMapping } from '@/types';

interface TemplateConfiguratorProps {
  templateId: string;
  onBack: () => void;
  onSave?: () => void;
}

// Field mapping options
const PERSONAL_FIELDS = [
  { value: 'firstName', label: 'Voornaam' },
  { value: 'lastName', label: 'Achternaam' },
  { value: 'fullName', label: 'Volledige naam' },
  { value: 'birthDate', label: 'Geboortedatum' },
  { value: 'nationality', label: 'Nationaliteit' },
  { value: 'city', label: 'Woonplaats' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefoon' },
];

const EXPERIENCE_FIELDS = [
  { value: 'company', label: 'Bedrijf' },
  { value: 'title', label: 'Functie' },
  { value: 'period', label: 'Periode' },
  { value: 'description', label: 'Beschrijving' },
  { value: 'location', label: 'Locatie' },
];

const EDUCATION_FIELDS = [
  { value: 'school', label: 'School/Instelling' },
  { value: 'degree', label: 'Opleiding' },
  { value: 'fieldOfStudy', label: 'Studierichting' },
  { value: 'period', label: 'Periode' },
];

const LANGUAGE_FIELDS = [
  { value: 'language', label: 'Taal' },
  { value: 'proficiency', label: 'Niveau' },
];

export function TemplateConfigurator({ templateId, onBack, onSave }: TemplateConfiguratorProps) {
  const t = useTranslations('templates.configurator');
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [fields, setFields] = useState<PDFTemplateField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Fetch template
  const fetchTemplate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/templates/${templateId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch template');
      }

      setTemplate(data.template);
      setFields(data.template.fields || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch template');
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  // Save fields
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      setSuccessMessage(t('saved'));
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // AI analysis (requires page images - simplified for now)
  const handleAnalyze = async () => {
    setError('AI-analyse vereist afbeeldingen van de PDF-paginas. Deze functie wordt binnenkort toegevoegd.');
    // In a full implementation, you would:
    // 1. Convert PDF pages to images (client-side or via an API)
    // 2. Send images to /api/templates/[id]/analyze
    // 3. Apply detected fields
  };

  // Add a new field
  const addField = () => {
    const newField: PDFTemplateField = {
      id: `field-${Date.now()}`,
      name: `field${fields.length + 1}`,
      label: '',
      page: 0,
      x: 100,
      y: 700,
      fontSize: 11,
      mapping: { type: 'personal', field: 'firstName' },
    };
    setFields([...fields, newField]);
  };

  // Remove a field
  const removeField = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  // Update a field
  const updateField = (fieldId: string, updates: Partial<PDFTemplateField>) => {
    setFields(
      fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  };

  // Update field mapping
  const updateFieldMapping = (fieldId: string, type: string, field?: string, index?: number) => {
    let mapping: ProfileFieldMapping;

    switch (type) {
      case 'personal':
        mapping = { type: 'personal', field: (field || 'firstName') as 'firstName' };
        break;
      case 'experience':
        mapping = { type: 'experience', index: index || 0, field: (field || 'company') as 'company' };
        break;
      case 'education':
        mapping = { type: 'education', index: index || 0, field: (field || 'school') as 'school' };
        break;
      case 'skill':
        mapping = { type: 'skill', index: index || 0 };
        break;
      case 'language':
        mapping = { type: 'language', index: index || 0, field: (field || 'language') as 'language' };
        break;
      case 'certification':
        mapping = { type: 'certification', index: index || 0 };
        break;
      default:
        mapping = { type: 'custom', value: '' };
    }

    updateField(fieldId, { mapping });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <span className="ml-2">{t('notFound')}</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">
              {template.fileName} • {template.pageCount} {t('pages')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {t('analyzeWithAI')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('save')}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}
      {successMessage && (
        <Alert>
          <span>{successMessage}</span>
        </Alert>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('instructions.title')}</CardTitle>
          <CardDescription>{t('instructions.description')}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• {t('instructions.step1')}</p>
          <p>• {t('instructions.step2')}</p>
          <p>• {t('instructions.step3')}</p>
        </CardContent>
      </Card>

      {/* Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{t('fields')} ({fields.length})</h3>
          <Button variant="outline" size="sm" onClick={addField}>
            <Plus className="mr-2 h-4 w-4" />
            {t('addField')}
          </Button>
        </div>

        {fields.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('noFields')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Label */}
                    <div className="space-y-2">
                      <Label>{t('fieldLabel')}</Label>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        placeholder="bijv. Voornaam"
                      />
                    </div>

                    {/* Mapping Type */}
                    <div className="space-y-2">
                      <Label>{t('mappingType')}</Label>
                      <Select
                        value={field.mapping.type}
                        onValueChange={(value) => updateFieldMapping(field.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="personal">Persoonlijk</SelectItem>
                          <SelectItem value="experience">Werkervaring</SelectItem>
                          <SelectItem value="education">Opleiding</SelectItem>
                          <SelectItem value="skill">Vaardigheid</SelectItem>
                          <SelectItem value="language">Taal</SelectItem>
                          <SelectItem value="certification">Certificaat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field Selection based on type */}
                    {field.mapping.type === 'personal' && (
                      <div className="space-y-2">
                        <Label>{t('field')}</Label>
                        <Select
                          value={(field.mapping as { type: 'personal'; field: string }).field}
                          onValueChange={(value) =>
                            updateFieldMapping(field.id, 'personal', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERSONAL_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(field.mapping.type === 'experience' ||
                      field.mapping.type === 'education' ||
                      field.mapping.type === 'skill' ||
                      field.mapping.type === 'language' ||
                      field.mapping.type === 'certification') && (
                      <div className="space-y-2">
                        <Label>{t('index')}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={(field.mapping as { index: number }).index}
                          onChange={(e) =>
                            updateFieldMapping(
                              field.id,
                              field.mapping.type,
                              'field' in field.mapping ? (field.mapping as { field: string }).field : undefined,
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    )}

                    {field.mapping.type === 'experience' && (
                      <div className="space-y-2">
                        <Label>{t('field')}</Label>
                        <Select
                          value={(field.mapping as { field: string }).field}
                          onValueChange={(value) =>
                            updateFieldMapping(
                              field.id,
                              'experience',
                              value,
                              (field.mapping as { index: number }).index
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPERIENCE_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {field.mapping.type === 'education' && (
                      <div className="space-y-2">
                        <Label>{t('field')}</Label>
                        <Select
                          value={(field.mapping as { field: string }).field}
                          onValueChange={(value) =>
                            updateFieldMapping(
                              field.id,
                              'education',
                              value,
                              (field.mapping as { index: number }).index
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EDUCATION_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {field.mapping.type === 'language' && (
                      <div className="space-y-2">
                        <Label>{t('field')}</Label>
                        <Select
                          value={(field.mapping as { field: string }).field}
                          onValueChange={(value) =>
                            updateFieldMapping(
                              field.id,
                              'language',
                              value,
                              (field.mapping as { index: number }).index
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Position inputs */}
                  <div className="grid gap-4 sm:grid-cols-5 mt-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>{t('page')}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={(template.pageCount || 1) - 1}
                        value={field.page}
                        onChange={(e) =>
                          updateField(field.id, { page: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>X (pts)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={field.x}
                        onChange={(e) =>
                          updateField(field.id, { x: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Y (pts)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={field.y}
                        onChange={(e) =>
                          updateField(field.id, { y: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('fontSize')}</Label>
                      <Input
                        type="number"
                        min={6}
                        max={72}
                        value={field.fontSize || 11}
                        onChange={(e) =>
                          updateField(field.id, { fontSize: parseInt(e.target.value) || 11 })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(field.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Help text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 text-sm text-muted-foreground">
          <p className="font-medium mb-2">{t('help.title')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('help.coordinates')}</li>
            <li>{t('help.a4Size')}</li>
            <li>{t('help.yAxis')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
