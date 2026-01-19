'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Upload,
  FileText,
  X,
  Loader2,
  Pencil,
  RefreshCw,
  Plus,
  Trash2,
  Image as ImageIcon,
  AlertTriangle,
  Coins,
  Save,
  FolderOpen,
  Star,
  MoreVertical,
  User,
  Sparkles,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import {
  getTokenEstimate,
  formatTokenCount,
  formatCost,
  exceedsWarningThreshold,
} from '@/lib/token-estimator';
import { AvatarUpload } from './avatar-upload';
import type {
  ParsedLinkedIn,
  ProfileInputSource,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInLanguage,
  LinkedInCertification,
  TokenUsage,
  SavedProfileSummary,
} from '@/types';
import type { ModelInfo } from '@/lib/ai/models-registry';
import { supportsFileInput } from '@/lib/ai/models-registry';

interface ProfileInputProps {
  onParsed: (data: ParsedLinkedIn) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  initialData?: ParsedLinkedIn | null;
  initialAvatarUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
  modelInfo?: ModelInfo | null;
  apiKey?: { provider: string; model: string } | null;
}

type Mode = 'input' | 'preview' | 'edit';

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

// Get icon for file type
function getFileIcon(mediaType: string) {
  if (mediaType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (mediaType.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  }
  return <FileText className="h-5 w-5 text-gray-500" />;
}

export function ProfileInput({
  onParsed,
  onTokenUsage,
  initialData,
  initialAvatarUrl,
  onAvatarChange,
  modelInfo,
  apiKey,
}: ProfileInputProps) {
  const [mode, setMode] = useState<Mode>(initialData ? 'preview' : 'input');
  const [sources, setSources] = useState<ProfileInputSource[]>([]);
  const [parsed, setParsed] = useState<ParsedLinkedIn | null>(initialData || null);
  const [editData, setEditData] = useState<ParsedLinkedIn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileSummary[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState('');
  const [saveProfileDescription, setSaveProfileDescription] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enrichment state
  const [showEnrichDialog, setShowEnrichDialog] = useState(false);
  const [enrichmentText, setEnrichmentText] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentPreview, setEnrichmentPreview] = useState<{
    enrichedProfile: ParsedLinkedIn;
    changes: string[];
    changesSummary: string;
  } | null>(null);

  // Handle avatar changes
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
    onAvatarChange?.(url);
  };

  // Fetch saved profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      console.log('[Profiles] Fetching saved profiles...');
      setIsLoadingProfiles(true);
      try {
        const response = await fetch('/api/profiles');
        console.log('[Profiles] Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('[Profiles] Data received:', data);
          if (data.success && data.profiles) {
            console.log('[Profiles] Setting profiles:', data.profiles.length);
            setSavedProfiles(data.profiles);
          }
        } else {
          console.log('[Profiles] Response not ok:', response.status);
        }
      } catch (err) {
        console.error('[Profiles] Failed to fetch profiles:', err);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // Load a saved profile
  const handleLoadProfile = async (profileId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/profiles/${profileId}`);
      if (!response.ok) {
        throw new Error('Kon profiel niet laden');
      }
      const data = await response.json();
      if (data.success && data.profile?.parsedData) {
        setSelectedProfileId(profileId);
        setParsed(data.profile.parsedData);
        // Also load avatar if available
        if (data.profile.avatarUrl) {
          handleAvatarChange(data.profile.avatarUrl);
        }
        setMode('preview');
        // Don't call onParsed here - let user review and click "Doorgaan"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon profiel niet laden');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save current profile
  const handleSaveProfile = async () => {
    console.log('[Profile Save] Starting save...', { parsed: !!parsed, name: saveProfileName });
    if (!parsed || !saveProfileName.trim()) {
      console.log('[Profile Save] Validation failed - parsed:', !!parsed, 'name:', saveProfileName);
      return;
    }

    setIsSavingProfile(true);
    try {
      console.log('[Profile Save] Sending request...');
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveProfileName.trim(),
          description: saveProfileDescription.trim() || undefined,
          parsedData: parsed,
          avatarUrl: avatarUrl || undefined,
          sourceInfo: {
            inputType: sources.some(s => s.type === 'file')
              ? (sources.some(s => s.type === 'text') ? 'mixed' : 'file')
              : 'text',
            fileNames: sources.filter(s => s.type === 'file').map(s => s.file?.name).filter(Boolean) as string[],
            lastUpdated: new Date(),
          },
          isDefault: saveAsDefault,
        }),
      });

      console.log('[Profile Save] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Profile Save] Error response:', errorData);
        throw new Error(errorData.error || 'Kon profiel niet opslaan');
      }

      const data = await response.json();
      console.log('[Profile Save] Success:', data);

      if (data.success && data.profile) {
        // Add to local list
        setSavedProfiles(prev => [{
          id: data.profile.id,
          name: data.profile.name,
          description: data.profile.description,
          headline: data.profile.parsedData?.headline || null,
          experienceCount: data.profile.parsedData?.experience?.length || 0,
          avatarUrl: data.profile.avatarUrl || null,
          isDefault: data.profile.isDefault,
          updatedAt: new Date(),
        }, ...prev.map(p => saveAsDefault ? { ...p, isDefault: false } : p)]);
        setSelectedProfileId(data.profile.id);
      }

      setShowSaveDialog(false);
      setSaveProfileName('');
      setSaveProfileDescription('');
      setSaveAsDefault(false);
    } catch (err) {
      console.error('[Profile Save] Error:', err);
      setError(err instanceof Error ? err.message : 'Kon profiel niet opslaan');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Delete a saved profile
  const handleDeleteProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
        if (selectedProfileId === profileId) {
          setSelectedProfileId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  // Set profile as default
  const handleSetDefault = async (profileId: string) => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (response.ok) {
        setSavedProfiles(prev => prev.map(p => ({
          ...p,
          isDefault: p.id === profileId,
        })));
      }
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  // Update current profile (when selectedProfileId is set)
  const handleUpdateCurrentProfile = async () => {
    if (!selectedProfileId || !parsed) return;

    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/profiles/${selectedProfileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsedData: parsed,
          avatarUrl: avatarUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Kon profiel niet bijwerken');
      }

      const data = await response.json();
      if (data.success) {
        // Update local list
        setSavedProfiles(prev => prev.map(p =>
          p.id === selectedProfileId
            ? {
                ...p,
                headline: parsed.headline || null,
                experienceCount: parsed.experience?.length || 0,
                avatarUrl: avatarUrl || null,
                updatedAt: new Date(),
              }
            : p
        ));
        setError(null);
      }
    } catch (err) {
      console.error('[Profile Update] Error:', err);
      setError(err instanceof Error ? err.message : 'Kon profiel niet bijwerken');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle profile enrichment
  const handleEnrichProfile = async () => {
    if (!selectedProfileId || !enrichmentText.trim()) return;

    setIsEnriching(true);
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${selectedProfileId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentText: enrichmentText.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verrijking mislukt');
      }

      if (result.success) {
        setEnrichmentPreview({
          enrichedProfile: result.enrichedProfile,
          changes: result.changes,
          changesSummary: result.changesSummary,
        });

        // Report token usage if available
        if (result.usage && onTokenUsage) {
          onTokenUsage(result.usage);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verrijking mislukt');
    } finally {
      setIsEnriching(false);
    }
  };

  // Accept enrichment preview
  const handleAcceptEnrichment = () => {
    if (enrichmentPreview) {
      setParsed(enrichmentPreview.enrichedProfile);
      setEnrichmentPreview(null);
      setShowEnrichDialog(false);
      setEnrichmentText('');
    }
  };

  // Cancel enrichment
  const handleCancelEnrichment = () => {
    setEnrichmentPreview(null);
    setShowEnrichDialog(false);
    setEnrichmentText('');
  };

  // Check if file input is supported by the model
  const fileInputSupported = modelInfo ? supportsFileInput(modelInfo) : false;

  // Calculate token estimate
  const tokenEstimate = getTokenEstimate(sources, modelInfo ?? null);
  const hasFileSource = sources.some(s => s.type === 'file');
  const showTokenEstimate = hasFileSource && sources.length > 0;

  // Add text source
  const handleAddText = () => {
    if (!textInputValue.trim()) {
      setError('Voer tekst in om toe te voegen');
      return;
    }

    const newSource: ProfileInputSource = {
      id: generateId(),
      type: 'text',
      text: textInputValue.trim(),
    };

    setSources(prev => [...prev, newSource]);
    setTextInputValue('');
    setShowTextInput(false);
    setError(null);
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      const newSources: ProfileInputSource[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!validTypes.includes(file.type)) {
          setError(`${file.name}: Alleen PDF of afbeeldingen (PNG, JPG, WebP) toegestaan`);
          continue;
        }

        // Validate file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name}: Bestand is te groot. Maximum is 10MB.`);
          continue;
        }

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            // Extract base64 from data URL
            const base64Data = dataUrl.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        newSources.push({
          id: generateId(),
          type: 'file',
          file: {
            name: file.name,
            mediaType: file.type,
            base64,
          },
        });
      }

      if (newSources.length > 0) {
        setSources(prev => [...prev, ...newSources]);
      }
    },
    []
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove source
  const handleRemoveSource = (id: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  // Process all sources
  const handleProcess = async () => {
    if (sources.length === 0) {
      setError('Voeg minimaal 1 bron toe');
      return;
    }

    // Check if token warning threshold is exceeded
    if (exceedsWarningThreshold(tokenEstimate.estimatedTokens) && hasFileSource) {
      setShowWarningDialog(true);
      return;
    }

    await processSourcesInternal();
  };

  const processSourcesInternal = async () => {
    setError(null);
    setIsProcessing(true);
    setShowWarningDialog(false);

    try {
      // Check if we only have text sources (no AI needed)
      const textOnlySources = sources.filter(s => s.type === 'text');
      const fileSources = sources.filter(s => s.type === 'file');

      if (fileSources.length === 0 && textOnlySources.length > 0) {
        // Text-only: use local parser (no AI call)
        const combinedText = textOnlySources.map(s => s.text).join('\n\n');
        const result = parseLinkedInProfile(combinedText);

        if (!result.fullName) {
          setError('Kon geen naam vinden. Controleer of je de volledige profielinformatie hebt toegevoegd.');
          return;
        }

        setParsed(result);
        setMode('preview');
        // Don't call onParsed here - let user review and click "Doorgaan"
        return;
      }

      // Has files: use AI API
      if (!apiKey) {
        setError('Configureer je API key in Instellingen om bestanden te verwerken.');
        return;
      }

      const response = await fetch('/api/profile/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources,
          provider: apiKey.provider,
          model: apiKey.model,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verwerking mislukt');
      }

      if (!result.data?.fullName) {
        setError('Kon geen profiel informatie extraheren. Probeer andere bronnen.');
        return;
      }

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage(result.usage);
      }

      setParsed(result.data);
      setMode('preview');
      // Don't call onParsed here - let user review and click "Doorgaan"
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwerking mislukt');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset everything
  const handleReset = () => {
    setSources([]);
    setParsed(null);
    setEditData(null);
    setError(null);
    setTextInputValue('');
    setShowTextInput(false);
    setMode('input');
    setSelectedProfileId(null);
    handleAvatarChange(null); // Reset avatar
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
            Profiel Bewerken
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
      <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Profiel Verwerkt
          </CardTitle>
          <CardDescription>
            De volgende informatie is gevonden in je profiel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Naam</p>
              <p className="text-lg font-semibold">{parsed.fullName}</p>
            </div>
            {parsed.headline && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Titel</p>
                <p>{parsed.headline}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {parsed.experience.length} Werkervaring{parsed.experience.length !== 1 ? 'en' : ''}
            </Badge>
            <Badge variant="secondary">
              {parsed.education.length} Opleiding{parsed.education.length !== 1 ? 'en' : ''}
            </Badge>
            <Badge variant="secondary">
              {parsed.skills.length} Vaardighed{parsed.skills.length !== 1 ? 'en' : ''}
            </Badge>
            <Badge variant="secondary">
              {parsed.languages.length} Tal{parsed.languages.length !== 1 ? 'en' : ''}
            </Badge>
          </div>

          {parsed.experience.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Werkervaring Preview</p>
              <ul className="space-y-1 text-sm">
                {parsed.experience.slice(0, 3).map((exp, i) => (
                  <li key={i}>
                    <span className="font-medium">{exp.title}</span> bij {exp.company}
                  </li>
                ))}
                {parsed.experience.length > 3 && (
                  <li className="text-muted-foreground">
                    +{parsed.experience.length - 3} meer posities
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Avatar Upload Section */}
          <div className="border rounded-lg p-4 mt-4">
            <AvatarUpload
              avatarUrl={avatarUrl}
              onAvatarChange={handleAvatarChange}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Je foto wordt getoond in de CV als de gekozen stijl dit ondersteunt.
            </p>
          </div>

          {/* Contact Info Section - Prominent */}
          <div className="border-2 border-primary/20 rounded-lg p-4 mt-4 bg-primary/5">
            <p className="text-sm font-semibold text-primary mb-1">
              Contactgegevens voor je CV
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              LinkedIn exporteert geen contactgegevens - vul deze hieronder in!
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@email.com"
                  value={parsed.email || ''}
                  onChange={(e) => setParsed({ ...parsed, email: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Telefoon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+31 6 12345678"
                  value={parsed.phone || ''}
                  onChange={(e) => setParsed({ ...parsed, phone: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="linkedinUrl" className="text-xs text-muted-foreground">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="linkedin.com/in/jouw-naam"
                  value={parsed.linkedinUrl || ''}
                  onChange={(e) => setParsed({ ...parsed, linkedinUrl: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website" className="text-xs text-muted-foreground">Website / Portfolio</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="jouwwebsite.nl"
                  value={parsed.website || ''}
                  onChange={(e) => setParsed({ ...parsed, website: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="github" className="text-xs text-muted-foreground">GitHub (optioneel)</Label>
                <Input
                  id="github"
                  placeholder="github.com/username"
                  value={parsed.github || ''}
                  onChange={(e) => setParsed({ ...parsed, github: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs text-muted-foreground">Locatie</Label>
                <Input
                  id="location"
                  placeholder="Amsterdam, Nederland"
                  value={parsed.location || ''}
                  onChange={(e) => setParsed({ ...parsed, location: e.target.value || null })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Email is verplicht voor een professionele CV
            </p>
          </div>

          {/* Saved Profiles Quick Select - shown when profiles exist */}
          {savedProfiles.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Opgeslagen Profielen</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Wissel profiel
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {savedProfiles.map((profile) => (
                      <DropdownMenuItem
                        key={profile.id}
                        onClick={() => handleLoadProfile(profile.id)}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{profile.name}</span>
                            {profile.isDefault && (
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {profile.headline || `${profile.experienceCount} ervaringen`}
                          </span>
                        </div>
                        {selectedProfileId === profile.id && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleReset}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nieuw profiel invoeren
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleContinue}>
              Doorgaan
            </Button>
            <Button variant="outline" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
            {!selectedProfileId && (
              <Button
                variant="outline"
                onClick={() => {
                  console.log('[Profile] Opening save dialog...');
                  setSaveProfileName(parsed?.fullName || '');
                  setShowSaveDialog(true);
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Profiel opslaan
              </Button>
            )}
            {selectedProfileId && (
              <>
                <Button
                  variant="outline"
                  onClick={handleUpdateCurrentProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Profiel bijwerken
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowEnrichDialog(true)}
                  className="border-primary/50 text-primary hover:bg-primary/5"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Verrijken
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSaveProfileName(parsed?.fullName || '');
                    setShowSaveDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Als nieuw opslaan
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Opnieuw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save profile dialog - also in preview mode */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Profiel Opslaan
            </DialogTitle>
            <DialogDescription>
              Sla dit profiel op om het later snel te kunnen hergebruiken voor andere vacatures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Naam *</Label>
              <Input
                id="profile-name"
                placeholder="bijv. ServiceNow Developer Profiel"
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Geef een herkenbare naam voor dit profiel
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-description">Beschrijving (optioneel)</Label>
              <Textarea
                id="profile-description"
                placeholder="bijv. Gericht op ServiceNow implementatie projecten..."
                value={saveProfileDescription}
                onChange={(e) => setSaveProfileDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save-as-default"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="save-as-default" className="text-sm font-normal">
                Als standaard profiel instellen
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!saveProfileName.trim() || isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Enrichment Dialog */}
      <Dialog open={showEnrichDialog} onOpenChange={(open) => {
        if (!open) handleCancelEnrichment();
        else setShowEnrichDialog(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Profiel Verrijken met AI
            </DialogTitle>
            <DialogDescription>
              Beschrijf wat je wilt toevoegen aan je profiel. AI analyseert je tekst en voegt automatisch
              nieuwe ervaringen, vaardigheden of opleidingen toe.
            </DialogDescription>
          </DialogHeader>

          {!enrichmentPreview ? (
            // Input phase
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="enrichment-text">Wat wil je toevoegen?</Label>
                <Textarea
                  id="enrichment-text"
                  placeholder={`Bijv: "Ik heb de afgelopen maanden CVeetje gebouwd, een AI-powered CV generator met Next.js, TypeScript en Firebase. Ik heb geleerd over AI integratie, PDF generatie en moderne web development."\n\nOf: "Ik heb een cursus Machine Learning gevolgd bij Coursera en ben nu gecertificeerd in TensorFlow."`}
                  value={enrichmentText}
                  onChange={(e) => setEnrichmentText(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Beschrijf projecten, cursussen, certificaten of nieuwe ervaring die je wilt toevoegen.
                  AI bepaalt automatisch de juiste sectie.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="ml-2">{error}</span>
                </Alert>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-2">Tips voor betere resultaten:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Vermeld specifieke technologieën en tools</li>
                  <li>• Geef tijdsperiodes aan (bijv. "sinds januari 2024")</li>
                  <li>• Beschrijf concrete resultaten of leerdoelen</li>
                  <li>• Voor certificaten: vermeld de uitgever en datum</li>
                </ul>
              </div>
            </div>
          ) : (
            // Preview phase
            <div className="space-y-4 py-4">
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <div className="ml-2">
                  <p className="font-medium text-green-800">Wijzigingen gevonden</p>
                  <p className="text-sm text-green-700 mt-1">{enrichmentPreview.changesSummary}</p>
                </div>
              </Alert>

              <div className="space-y-2">
                <Label>Wat wordt toegevoegd:</Label>
                <div className="border rounded-lg p-3 space-y-2">
                  {enrichmentPreview.changes.map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{change}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview new experience */}
              {enrichmentPreview.enrichedProfile.experience.length > (parsed?.experience.length || 0) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nieuwe Werkervaring</Label>
                  {enrichmentPreview.enrichedProfile.experience
                    .slice(0, enrichmentPreview.enrichedProfile.experience.length - (parsed?.experience.length || 0))
                    .map((exp, idx) => (
                      <div key={idx} className="border border-green-200 bg-green-50/50 rounded-lg p-3">
                        <p className="font-medium">{exp.title}</p>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                        <p className="text-xs text-muted-foreground">
                          {exp.startDate} - {exp.endDate || 'heden'}
                        </p>
                        {exp.description && (
                          <p className="text-sm mt-2">{exp.description}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Preview new skills */}
              {enrichmentPreview.enrichedProfile.skills.length > (parsed?.skills.length || 0) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nieuwe Vaardigheden</Label>
                  <div className="flex flex-wrap gap-2">
                    {enrichmentPreview.enrichedProfile.skills
                      .filter(skill => !parsed?.skills.some(s => s.name.toLowerCase() === skill.name.toLowerCase()))
                      .map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-green-100 text-green-800">
                          <Plus className="h-3 w-3 mr-1" />
                          {skill.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {/* Preview new education */}
              {enrichmentPreview.enrichedProfile.education.length > (parsed?.education.length || 0) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nieuwe Opleidingen</Label>
                  {enrichmentPreview.enrichedProfile.education
                    .slice(0, enrichmentPreview.enrichedProfile.education.length - (parsed?.education.length || 0))
                    .map((edu, idx) => (
                      <div key={idx} className="border border-green-200 bg-green-50/50 rounded-lg p-3">
                        <p className="font-medium">{edu.degree || 'Opleiding'}</p>
                        <p className="text-sm text-muted-foreground">{edu.school}</p>
                      </div>
                    ))}
                </div>
              )}

              {/* Preview new certifications */}
              {enrichmentPreview.enrichedProfile.certifications.length > (parsed?.certifications.length || 0) && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Nieuwe Certificaten</Label>
                  {enrichmentPreview.enrichedProfile.certifications
                    .slice(0, enrichmentPreview.enrichedProfile.certifications.length - (parsed?.certifications.length || 0))
                    .map((cert, idx) => (
                      <div key={idx} className="border border-green-200 bg-green-50/50 rounded-lg p-3">
                        <p className="font-medium">{cert.name}</p>
                        {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!enrichmentPreview ? (
              <>
                <Button variant="outline" onClick={handleCancelEnrichment}>
                  Annuleren
                </Button>
                <Button
                  onClick={handleEnrichProfile}
                  disabled={!enrichmentText.trim() || isEnriching}
                >
                  {isEnriching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyseren...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyseren
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEnrichmentPreview(null)}>
                  Terug
                </Button>
                <Button onClick={handleAcceptEnrichment}>
                  <Check className="h-4 w-4 mr-2" />
                  Toepassen
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // INPUT MODE
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profiel Informatie</CardTitle>
          <CardDescription>
            Voeg je profiel informatie toe via bestanden, screenshots of tekst.
            Je kunt meerdere bronnen combineren.
            {fileInputSupported && (
              <span className="block mt-1 text-primary">
                Tip: In LinkedIn kun je je profiel exporteren via Profiel → Meer → Opslaan als PDF
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

          {/* Saved Profiles Section */}
          {savedProfiles.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Opgeslagen Profielen</Label>
              </div>
              <div className="space-y-2">
                {savedProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={`flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedProfileId === profile.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleLoadProfile(profile.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{profile.name}</span>
                          {profile.isDefault && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {profile.headline || `${profile.experienceCount} ervaringen`}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLoadProfile(profile.id); }}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Laden
                        </DropdownMenuItem>
                        {!profile.isDefault && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetDefault(profile.id); }}>
                            <Star className="h-4 w-4 mr-2" />
                            Als standaard instellen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  Of voeg hieronder nieuw profiel informatie toe
                </p>
              </div>
            </div>
          )}

          {isLoadingProfiles && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Profielen laden...</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {fileInputSupported && apiKey && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bestand toevoegen
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowTextInput(!showTextInput)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Tekst toevoegen
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* File input support warning */}
          {!fileInputSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">Bestand uploaden niet beschikbaar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Je geselecteerde AI model ({modelInfo?.name || 'Onbekend'}) ondersteunt geen afbeelding/PDF input.
                  Gebruik een model dat vision ondersteunt (zoals GPT-4o, Claude Sonnet, of Gemini) of plak je profiel als tekst.
                </p>
              </div>
            </Alert>
          )}

          {/* API key required warning */}
          {fileInputSupported && !apiKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">API key vereist</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Configureer je AI API key in Instellingen om bestanden te uploaden.
                </p>
              </div>
            </Alert>
          )}

          {/* Text input area */}
          {showTextInput && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <Label>Extra tekst informatie</Label>
                <Button variant="ghost" size="icon" onClick={() => setShowTextInput(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Plak hier je LinkedIn profiel tekst, extra ervaring, of andere relevante informatie..."
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Tip: Selecteer en kopieer je LinkedIn profiel pagina (Ctrl+A, Ctrl+C)
                </p>
                <Button size="sm" onClick={handleAddText} disabled={!textInputValue.trim()}>
                  Toevoegen
                </Button>
              </div>
            </div>
          )}

          {/* Drop zone (only when no sources yet and file upload is supported) */}
          {sources.length === 0 && fileInputSupported && apiKey && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                Sleep je LinkedIn PDF of screenshots hierheen, of klik om te bladeren
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF, PNG, JPG, WebP (max 10MB per bestand)
              </p>
            </div>
          )}

          {/* Sources list */}
          {sources.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Toegevoegde bronnen ({sources.length})</Label>
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      {source.type === 'file' && source.file ? (
                        <>
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            {getFileIcon(source.file.mediaType)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{source.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {source.file.mediaType === 'application/pdf' ? 'PDF' : 'Afbeelding'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Tekst invoer</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {source.text?.substring(0, 50)}...
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSource(source.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Drop zone for adding more files */}
              {fileInputSupported && apiKey && (
                <div
                  className="border border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-sm text-muted-foreground">
                    <Plus className="h-4 w-4 inline mr-1" />
                    Meer bestanden toevoegen
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Token estimate */}
          {showTokenEstimate && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Geschatte tokens</span>
                </div>
                <span className="text-sm font-mono">
                  {formatTokenCount(tokenEstimate.estimatedTokens)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Geschatte kosten</span>
                <span className="text-sm font-mono">
                  {formatCost(tokenEstimate.estimatedCost)}
                </span>
              </div>
              {exceedsWarningThreshold(tokenEstimate.estimatedTokens) && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="ml-2 text-sm">
                    Dit is een grote request. Overweeg om minder bestanden toe te voegen.
                  </span>
                </Alert>
              )}
            </div>
          )}

          {/* Process button */}
          <Button
            onClick={handleProcess}
            disabled={sources.length === 0 || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Informatie verwerken...
              </>
            ) : (
              'Informatie verwerken'
            )}
          </Button>

          {/* Hint for text-only */}
          {sources.length > 0 && !hasFileSource && (
            <p className="text-xs text-center text-muted-foreground">
              Alleen tekst bronnen → gratis verwerking (geen AI call)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Warning dialog for large requests */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Grote Request
            </DialogTitle>
            <DialogDescription>
              Dit is een grote request met geschatte {formatTokenCount(tokenEstimate.estimatedTokens)} tokens
              ({formatCost(tokenEstimate.estimatedCost)} kosten).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Weet je zeker dat je wilt doorgaan? Je kunt ook minder bestanden toevoegen om kosten te besparen.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
              Annuleren
            </Button>
            <Button onClick={processSourcesInternal}>
              Ja, verwerken
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save profile dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-primary" />
              Profiel Opslaan
            </DialogTitle>
            <DialogDescription>
              Sla dit profiel op om het later snel te kunnen hergebruiken voor andere vacatures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Naam *</Label>
              <Input
                id="profile-name"
                placeholder="bijv. ServiceNow Developer Profiel"
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Geef een herkenbare naam voor dit profiel
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-description">Beschrijving (optioneel)</Label>
              <Textarea
                id="profile-description"
                placeholder="bijv. Gericht op ServiceNow implementatie projecten..."
                value={saveProfileDescription}
                onChange={(e) => setSaveProfileDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="save-as-default"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="save-as-default" className="text-sm font-normal">
                Als standaard profiel instellen
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!saveProfileName.trim() || isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
