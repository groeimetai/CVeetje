'use client';

import { useState, useCallback, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, Info, Upload, FileText, X, Loader2, Pencil, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import type { ParsedLinkedIn, LinkedInInputSource, LinkedInExperience, LinkedInEducation, LinkedInSkill, LinkedInLanguage, LinkedInCertification, TokenUsage } from '@/types';
import type { ModelInfo } from '@/lib/ai/models-registry';
import { supportsFileInput } from '@/lib/ai/models-registry';

interface LinkedInInputProps {
  onParsed: (data: ParsedLinkedIn) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  initialData?: ParsedLinkedIn | null;
  modelInfo?: ModelInfo | null;
  apiKey?: { provider: string; model: string } | null;
}

type Mode = 'input' | 'preview' | 'edit';

// Helper to create empty objects for editing
const createEmptyExperience = (): LinkedInExperience => ({
  title: '',
  company: '',
  location: null,
  startDate: '',
  endDate: null,
  description: null,
  isCurrentRole: false,
});

const createEmptyEducation = (): LinkedInEducation => ({
  school: '',
  degree: null,
  fieldOfStudy: null,
  startYear: null,
  endYear: null,
});

const createEmptyLanguage = (): LinkedInLanguage => ({
  language: '',
  proficiency: null,
});

const createEmptyCertification = (): LinkedInCertification => ({
  name: '',
  issuer: null,
  issueDate: null,
});

// Deep clone for editing
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export function LinkedInInput({ onParsed, onTokenUsage, initialData, modelInfo, apiKey }: LinkedInInputProps) {
  const [mode, setMode] = useState<Mode>(initialData ? 'preview' : 'input');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedLinkedIn | null>(initialData || null);
  const [editData, setEditData] = useState<ParsedLinkedIn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; mediaType: string; base64: string } | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if file input is supported by the model
  const fileInputSupported = modelInfo ? supportsFileInput(modelInfo) : false;

  const handleParse = () => {
    setError(null);

    if (!rawText.trim()) {
      setError('Please paste your LinkedIn profile text');
      return;
    }

    try {
      const result = parseLinkedInProfile(rawText);

      if (!result.fullName) {
        setError('Could not find your name. Please make sure you copied the complete profile.');
        return;
      }

      setParsed(result);
      setMode('preview');
      onParsed(result);
    } catch {
      setError('Failed to parse LinkedIn data. Please try copying the profile again.');
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PDF or image file (PNG, JPG, WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 from data URL (remove "data:type;base64," prefix)
      const base64 = dataUrl.split(',')[1];

      setUploadedFile({
        name: file.name,
        mediaType: file.type,
        base64,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleParseFile = async () => {
    if (!uploadedFile || !apiKey) {
      setError('Please upload a file and ensure your API key is configured.');
      return;
    }

    setError(null);
    setIsParsingFile(true);

    try {
      const source: LinkedInInputSource = {
        type: 'file',
        file: uploadedFile,
      };

      const response = await fetch('/api/linkedin/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          provider: apiKey.provider,
          model: apiKey.model,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse file');
      }

      if (!result.data?.fullName) {
        setError('Could not extract profile information from the file. Please try a different file or use text input.');
        return;
      }

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }

      setParsed(result.data);
      setMode('preview');
      onParsed(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setRawText('');
    setParsed(null);
    setEditData(null);
    setError(null);
    setUploadedFile(null);
    setMode('input');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Continue with existing data
  const handleContinue = () => {
    if (parsed) {
      onParsed(parsed);
    }
  };

  // Start editing
  const handleStartEdit = () => {
    if (parsed) {
      setEditData(deepClone(parsed));
      setMode('edit');
    }
  };

  // Save edited data
  const handleSaveEdit = () => {
    if (editData) {
      setParsed(editData);
      setEditData(null);
      setMode('preview');
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditData(null);
    setMode('preview');
  };

  // Helper functions for editing arrays
  const updateEditField = <K extends keyof ParsedLinkedIn>(field: K, value: ParsedLinkedIn[K]) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const addExperience = () => {
    if (editData) {
      setEditData({ ...editData, experience: [...editData.experience, createEmptyExperience()] });
    }
  };

  const removeExperience = (index: number) => {
    if (editData) {
      setEditData({ ...editData, experience: editData.experience.filter((_, i) => i !== index) });
    }
  };

  const updateExperience = (index: number, field: keyof LinkedInExperience, value: string | boolean | null) => {
    if (editData) {
      const updated = [...editData.experience];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, experience: updated });
    }
  };

  const addEducation = () => {
    if (editData) {
      setEditData({ ...editData, education: [...editData.education, createEmptyEducation()] });
    }
  };

  const removeEducation = (index: number) => {
    if (editData) {
      setEditData({ ...editData, education: editData.education.filter((_, i) => i !== index) });
    }
  };

  const updateEducation = (index: number, field: keyof LinkedInEducation, value: string | null) => {
    if (editData) {
      const updated = [...editData.education];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, education: updated });
    }
  };

  const addSkill = () => {
    if (editData) {
      setEditData({ ...editData, skills: [...editData.skills, { name: '' }] });
    }
  };

  const removeSkill = (index: number) => {
    if (editData) {
      setEditData({ ...editData, skills: editData.skills.filter((_, i) => i !== index) });
    }
  };

  const updateSkill = (index: number, name: string) => {
    if (editData) {
      const updated = [...editData.skills];
      updated[index] = { name };
      setEditData({ ...editData, skills: updated });
    }
  };

  const addLanguage = () => {
    if (editData) {
      setEditData({ ...editData, languages: [...editData.languages, createEmptyLanguage()] });
    }
  };

  const removeLanguage = (index: number) => {
    if (editData) {
      setEditData({ ...editData, languages: editData.languages.filter((_, i) => i !== index) });
    }
  };

  const updateLanguage = (index: number, field: keyof LinkedInLanguage, value: string | null) => {
    if (editData) {
      const updated = [...editData.languages];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, languages: updated });
    }
  };

  const addCertification = () => {
    if (editData) {
      setEditData({ ...editData, certifications: [...editData.certifications, createEmptyCertification()] });
    }
  };

  const removeCertification = (index: number) => {
    if (editData) {
      setEditData({ ...editData, certifications: editData.certifications.filter((_, i) => i !== index) });
    }
  };

  const updateCertification = (index: number, field: keyof LinkedInCertification, value: string | null) => {
    if (editData) {
      const updated = [...editData.certifications];
      updated[index] = { ...updated[index], [field]: value };
      setEditData({ ...editData, certifications: updated });
    }
  };

  // EDIT MODE
  if (mode === 'edit' && editData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            LinkedIn Profiel Bewerken
          </CardTitle>
          <CardDescription>
            Pas de geëxtraheerde informatie aan indien nodig
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Basis Gegevens</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">Naam</Label>
                <Input
                  id="edit-fullName"
                  value={editData.fullName}
                  onChange={(e) => updateEditField('fullName', e.target.value)}
                  placeholder="Volledige naam"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-headline">Titel / Headline</Label>
                <Input
                  id="edit-headline"
                  value={editData.headline || ''}
                  onChange={(e) => updateEditField('headline', e.target.value || null)}
                  placeholder="Functietitel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Locatie</Label>
                <Input
                  id="edit-location"
                  value={editData.location || ''}
                  onChange={(e) => updateEditField('location', e.target.value || null)}
                  placeholder="Amsterdam, Nederland"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-about">Over mij</Label>
              <Textarea
                id="edit-about"
                value={editData.about || ''}
                onChange={(e) => updateEditField('about', e.target.value || null)}
                placeholder="Korte beschrijving..."
                rows={3}
              />
            </div>
          </div>

          {/* Experience Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Werkervaring</h3>
              <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
            {editData.experience.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Ervaring {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Functie</Label>
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, 'title', e.target.value)}
                      placeholder="Software Developer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Bedrijf</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      placeholder="Bedrijfsnaam"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Locatie</Label>
                    <Input
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(index, 'location', e.target.value || null)}
                      placeholder="Amsterdam"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Startdatum</Label>
                    <Input
                      value={exp.startDate}
                      onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                      placeholder="jan 2020"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Einddatum</Label>
                    <Input
                      value={exp.endDate || ''}
                      onChange={(e) => updateExperience(index, 'endDate', e.target.value || null)}
                      placeholder="heden"
                      disabled={exp.isCurrentRole}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id={`current-${index}`}
                      checked={exp.isCurrentRole}
                      onChange={(e) => updateExperience(index, 'isCurrentRole', e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor={`current-${index}`} className="text-xs">Huidige functie</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Beschrijving</Label>
                  <Textarea
                    value={exp.description || ''}
                    onChange={(e) => updateExperience(index, 'description', e.target.value || null)}
                    placeholder="Beschrijving van werkzaamheden..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Opleiding</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
            {editData.education.map((edu, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Opleiding {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEducation(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">School / Universiteit</Label>
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(index, 'school', e.target.value)}
                      placeholder="Universiteit van Amsterdam"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Diploma</Label>
                    <Input
                      value={edu.degree || ''}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value || null)}
                      placeholder="Bachelor / Master"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Studierichting</Label>
                    <Input
                      value={edu.fieldOfStudy || ''}
                      onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value || null)}
                      placeholder="Informatica"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Startjaar</Label>
                      <Input
                        value={edu.startYear || ''}
                        onChange={(e) => updateEducation(index, 'startYear', e.target.value || null)}
                        placeholder="2016"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Eindjaar</Label>
                      <Input
                        value={edu.endYear || ''}
                        onChange={(e) => updateEducation(index, 'endYear', e.target.value || null)}
                        placeholder="2020"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skills Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Vaardigheden</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editData.skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-1 bg-secondary rounded-lg pl-3 pr-1 py-1">
                  <Input
                    value={skill.name}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    className="h-6 w-32 border-0 bg-transparent p-0 text-sm"
                    placeholder="Vaardigheid"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSkill(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Languages Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Talen</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
            {editData.languages.map((lang, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={lang.language}
                  onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                  placeholder="Nederlands"
                  className="flex-1"
                />
                <Input
                  value={lang.proficiency || ''}
                  onChange={(e) => updateLanguage(index, 'proficiency', e.target.value || null)}
                  placeholder="Moedertaal"
                  className="w-32"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Certifications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Certificaten</h3>
              <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                <Plus className="h-4 w-4 mr-1" />
                Toevoegen
              </Button>
            </div>
            {editData.certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={cert.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                  placeholder="Certificaat naam"
                  className="flex-1"
                />
                <Input
                  value={cert.issuer || ''}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value || null)}
                  placeholder="Uitgever"
                  className="w-32"
                />
                <Input
                  value={cert.issueDate || ''}
                  onChange={(e) => updateCertification(index, 'issueDate', e.target.value || null)}
                  placeholder="Datum"
                  className="w-24"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCertification(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSaveEdit}>
              Opslaan
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              Annuleren
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // PREVIEW MODE
  if (mode === 'preview' && parsed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            LinkedIn Profile Parsed
          </CardTitle>
          <CardDescription>
            We found the following information from your profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{parsed.fullName}</p>
            </div>
            {parsed.headline && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Title</p>
                <p>{parsed.headline}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {parsed.experience.length} Experience{parsed.experience.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {parsed.education.length} Education
            </Badge>
            <Badge variant="secondary">
              {parsed.skills.length} Skills
            </Badge>
            <Badge variant="secondary">
              {parsed.languages.length} Languages
            </Badge>
          </div>

          {parsed.experience.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Experience Preview</p>
              <ul className="space-y-1 text-sm">
                {parsed.experience.slice(0, 3).map((exp, i) => (
                  <li key={i}>
                    <span className="font-medium">{exp.title}</span> at {exp.company}
                  </li>
                ))}
                {parsed.experience.length > 3 && (
                  <li className="text-muted-foreground">
                    +{parsed.experience.length - 3} more positions
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleContinue}>
              Doorgaan
            </Button>
            <Button variant="outline" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Opnieuw
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LinkedIn Profile</CardTitle>
        <CardDescription>
          Import your LinkedIn profile to get started.
          {fileInputSupported && (
            <span className="block mt-1 text-primary">
              Tip: In LinkedIn, you can export your profile via Profile → More → Save as PDF
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <FileText className="mr-2 h-4 w-4" />
              Paste Text
            </TabsTrigger>
            <TabsTrigger value="file" disabled={!fileInputSupported}>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">How to copy your LinkedIn profile:</p>
                <ol className="text-sm text-muted-foreground mt-1 list-decimal list-inside space-y-1">
                  <li>Go to your LinkedIn profile page</li>
                  <li>Select all text (Ctrl+A / Cmd+A)</li>
                  <li>Copy (Ctrl+C / Cmd+C)</li>
                  <li>Paste below (Ctrl+V / Cmd+V)</li>
                </ol>
              </div>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="linkedin-text">LinkedIn Profile Text</Label>
              <Textarea
                id="linkedin-text"
                placeholder="Paste your LinkedIn profile text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <Button onClick={handleParse} disabled={!rawText.trim()}>
              Parse Profile
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            {!fileInputSupported ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="font-medium">File upload not available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your selected AI model ({modelInfo?.name || 'Unknown'}) does not support image or PDF input.
                    Please use a model that supports vision (like GPT-4o, Claude Sonnet, or Gemini) or paste your profile as text.
                  </p>
                </div>
              </Alert>
            ) : !apiKey ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <div className="ml-2">
                  <p className="font-medium">API key required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please configure your AI API key in Settings to use file upload.
                  </p>
                </div>
              </Alert>
            ) : (
              <>
                <Alert>
                  <Info className="h-4 w-4" />
                  <div className="ml-2">
                    <p className="font-medium">Supported formats:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      PDF, PNG, JPG, WebP (max 10MB)
                    </p>
                  </div>
                </Alert>

                {uploadedFile ? (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {uploadedFile.mediaType}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={handleParseFile}
                      disabled={isParsingFile}
                    >
                      {isParsingFile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting profile...
                        </>
                      ) : (
                        'Extract Profile from File'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Drag and drop your LinkedIn PDF or image here, or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
