'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import { parseLinkedInProfile } from '@/lib/linkedin/parser';
import {
  getTokenEstimate,
  formatTokenCount,
  formatCost,
  exceedsWarningThreshold,
} from '@/lib/token-estimator';
import { useAuth } from '@/components/auth/auth-context';
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
import { CreditBadge } from '@/components/cv/credit-badge';

type ProfileTokenStep = 'profile-parse' | 'profile-enrich' | 'linkedin-export';

interface ProfileInputProps {
  onParsed: (data: ParsedLinkedIn) => void;
  onTokenUsage?: (step: ProfileTokenStep, usage: TokenUsage) => void;
  onCreditsRefresh?: () => void;
  initialData?: ParsedLinkedIn | null;
  initialAvatarUrl?: string | null;
  onAvatarChange?: (url: string | null) => void;
  modelInfo?: ModelInfo | null;
  apiKey?: { provider: string; model: string } | null;
  /** Opgeslagen profiel dat direct geladen moet worden (bv. via /cv/new?profile=<id>). */
  initialProfileId?: string | null;
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
  onCreditsRefresh,
  initialData,
  initialAvatarUrl,
  onAvatarChange,
  modelInfo,
  apiKey,
  initialProfileId,
}: ProfileInputProps) {
  const t = useTranslations('profileInput');
  const tCommon = useTranslations('common');
  const { llmMode } = useAuth();
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

  // Note: AI enrichment and LinkedIn export have moved to the dedicated
  // profile edit page at /profiles/[id]. The wizard is now input-only:
  // parse new profiles, select existing ones, save as new. All manual
  // editing and enrichment of saved profiles lives on that page.

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
        throw new Error(t('errors.couldNotLoad'));
      }
      const data = await response.json();
      if (data.success && data.profile?.parsedData) {
        setSelectedProfileId(profileId);
        // Ensure projects array exists (profiles saved before projects feature won't have it)
        const profileData = {
          ...data.profile.parsedData,
          projects: data.profile.parsedData.projects || [],
        };
        setParsed(profileData);
        // Also load avatar if available
        if (data.profile.avatarUrl) {
          handleAvatarChange(data.profile.avatarUrl);
        }
        setMode('preview');
        // Don't call onParsed here - let user review and click "Doorgaan"
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.couldNotLoad'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Bug-fix: "CV maken" vanaf /profiles linkt naar /cv/new?profile=<id>, maar
  // die parameter werd genegeerd — de gebruiker moest het profiel opnieuw kiezen.
  const initialProfileLoaded = useRef(false);
  useEffect(() => {
    if (!initialProfileId || initialData || initialProfileLoaded.current) return;
    initialProfileLoaded.current = true;
    void handleLoadProfile(initialProfileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProfileId, initialData]);

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
        throw new Error(errorData.error || t('errors.couldNotSave'));
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
      setError(err instanceof Error ? err.message : t('errors.couldNotSave'));
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
        throw new Error(errorData.error || t('errors.couldNotUpdate'));
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
      setError(err instanceof Error ? err.message : t('errors.couldNotUpdate'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Enrichment and LinkedIn export have moved to /profiles/[id].

  // Check if file input is supported by the model
  const fileInputSupported = modelInfo ? supportsFileInput(modelInfo) : false;

  // Calculate token estimate
  const tokenEstimate = getTokenEstimate(sources, modelInfo ?? null);
  const hasFileSource = sources.some(s => s.type === 'file');
  const showTokenEstimate = hasFileSource && sources.length > 0;

  // Add text source
  const handleAddText = () => {
    if (!textInputValue.trim()) {
      setError(t('errors.enterText'));
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
          setError(t('errors.invalidFileType', { name: file.name }));
          continue;
        }

        // Validate file size (max 10MB per file)
        if (file.size > 10 * 1024 * 1024) {
          setError(t('errors.fileTooLarge', { name: file.name }));
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
          reader.onerror = () => reject(new Error(t('errors.readFailed')));
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
    [t]
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
      setError(t('errors.addSource'));
      return;
    }

    // Check if token warning threshold is exceeded (skip in platform mode)
    if (llmMode !== 'platform' && exceedsWarningThreshold(tokenEstimate.estimatedTokens) && hasFileSource) {
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
          setError(t('errors.noNameFound'));
          return;
        }

        setParsed({ ...result, projects: result.projects || [] });
        setMode('preview');
        // Don't call onParsed here - let user review and click "Doorgaan"
        return;
      }

      // Has files: use AI API
      if (!apiKey && llmMode !== 'platform') {
        setError(t('errors.configureApiKey'));
        return;
      }

      const response = await fetch('/api/profile/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources,
          ...(apiKey && { provider: apiKey.provider, model: apiKey.model }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('errors.processingFailed'));
      }

      if (!result.data?.fullName) {
        setError(t('errors.noProfileInfo'));
        return;
      }

      // Report token usage if available
      if (result.usage && onTokenUsage) {
        onTokenUsage('profile-parse', result.usage);
      }

      onCreditsRefresh?.();
      setParsed({ ...result.data, projects: result.data.projects || [] });
      setMode('preview');
      // Don't call onParsed here - let user review and click "Doorgaan"

      // Auto-save profile in platform mode so the user doesn't lose paid work
      if (llmMode === 'platform' && result.data.fullName) {
        try {
          const autoSaveResponse = await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: result.data.fullName,
              parsedData: result.data,
              avatarUrl: avatarUrl || undefined,
              sourceInfo: {
                inputType: sources.some(s => s.type === 'file')
                  ? (sources.some(s => s.type === 'text') ? 'mixed' : 'file')
                  : 'text',
                fileNames: sources.filter(s => s.type === 'file').map(s => s.file?.name).filter(Boolean) as string[],
                lastUpdated: new Date(),
              },
              isDefault: savedProfiles.length === 0, // First profile becomes default
            }),
          });
          if (autoSaveResponse.ok) {
            const saveData = await autoSaveResponse.json();
            if (saveData.success && saveData.profile) {
              setSavedProfiles(prev => [{
                id: saveData.profile.id,
                name: saveData.profile.name,
                description: saveData.profile.description,
                headline: saveData.profile.parsedData?.headline || null,
                experienceCount: saveData.profile.parsedData?.experience?.length || 0,
                avatarUrl: saveData.profile.avatarUrl || null,
                isDefault: saveData.profile.isDefault,
                updatedAt: new Date(),
              }, ...prev]);
              setSelectedProfileId(saveData.profile.id);
            }
          }
        } catch {
          // Silent fail — auto-save is best-effort, don't block the user
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.processingFailed'));
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
      setParsed({ ...editData, projects: editData.projects || [] });
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
            {t('editProfile.title')}
          </CardTitle>
          <CardDescription>
            {t('editProfile.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.basicInfo')}</h3>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-fullName">{t('editProfile.fields.name')}</Label>
                <Input
                  id="edit-fullName"
                  value={editData.fullName}
                  onChange={(e) => updateEditField('fullName', e.target.value)}
                  placeholder={t('editProfile.fields.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-headline">{t('editProfile.fields.headline')}</Label>
                <Input
                  id="edit-headline"
                  value={editData.headline || ''}
                  onChange={(e) => updateEditField('headline', e.target.value || null)}
                  placeholder={t('editProfile.fields.headlinePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">{t('editProfile.fields.location')}</Label>
                <Input
                  id="edit-location"
                  value={editData.location || ''}
                  onChange={(e) => updateEditField('location', e.target.value || null)}
                  placeholder={t('editProfile.fields.locationPlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-about">{t('editProfile.fields.about')}</Label>
              <Textarea
                id="edit-about"
                value={editData.about || ''}
                onChange={(e) => updateEditField('about', e.target.value || null)}
                placeholder={t('editProfile.fields.aboutPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          {/* Experience Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.experience')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addExperience}>
                <Plus className="h-4 w-4 mr-1" />
                {t('editProfile.addExperience')}
              </Button>
            </div>
            {editData.experience.map((exp, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">{t('editProfile.experienceNum', { num: index + 1 })}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeExperience(index)} aria-label={t('editProfile.removeExperience', { num: index + 1 })}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.jobTitle')}</Label>
                    <Input
                      value={exp.title}
                      onChange={(e) => updateExperience(index, 'title', e.target.value)}
                      placeholder={t('editProfile.fields.jobTitlePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.company')}</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      placeholder={t('editProfile.fields.companyPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.location')}</Label>
                    <Input
                      value={exp.location || ''}
                      onChange={(e) => updateExperience(index, 'location', e.target.value || null)}
                      placeholder={t('editProfile.fields.cityPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.startDate')}</Label>
                    <Input
                      value={exp.startDate}
                      onChange={(e) => updateExperience(index, 'startDate', e.target.value)}
                      placeholder={t('editProfile.fields.startDatePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.endDate')}</Label>
                    <Input
                      value={exp.endDate || ''}
                      onChange={(e) => updateExperience(index, 'endDate', e.target.value || null)}
                      placeholder={t('editProfile.fields.endDatePlaceholder')}
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
                    <Label htmlFor={`current-${index}`} className="text-xs">{t('editProfile.fields.currentRole')}</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('editProfile.fields.description')}</Label>
                  <Textarea
                    value={exp.description || ''}
                    onChange={(e) => updateExperience(index, 'description', e.target.value || null)}
                    placeholder={t('editProfile.fields.descriptionPlaceholder')}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Education Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.education')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addEducation}>
                <Plus className="h-4 w-4 mr-1" />
                {t('editProfile.addEducation')}
              </Button>
            </div>
            {editData.education.map((edu, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">{t('editProfile.educationNum', { num: index + 1 })}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEducation(index)} aria-label={t('editProfile.removeEducation', { num: index + 1 })}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.school')}</Label>
                    <Input
                      value={edu.school}
                      onChange={(e) => updateEducation(index, 'school', e.target.value)}
                      placeholder={t('editProfile.fields.schoolPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.degree')}</Label>
                    <Input
                      value={edu.degree || ''}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value || null)}
                      placeholder={t('editProfile.fields.degreePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('editProfile.fields.fieldOfStudy')}</Label>
                    <Input
                      value={edu.fieldOfStudy || ''}
                      onChange={(e) => updateEducation(index, 'fieldOfStudy', e.target.value || null)}
                      placeholder={t('editProfile.fields.fieldOfStudyPlaceholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('editProfile.fields.startYear')}</Label>
                      <Input
                        value={edu.startYear || ''}
                        onChange={(e) => updateEducation(index, 'startYear', e.target.value || null)}
                        placeholder="2016"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('editProfile.fields.endYear')}</Label>
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
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.skills')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                <Plus className="h-4 w-4 mr-1" />
                {t('editProfile.addSkill')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editData.skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-1 bg-secondary rounded-lg pl-3 pr-1 py-1">
                  <Input
                    value={skill.name}
                    onChange={(e) => updateSkill(index, e.target.value)}
                    className="h-6 w-32 border-0 bg-transparent p-0 text-sm"
                    placeholder={t('editProfile.skillPlaceholder')}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSkill(index)} aria-label={t('editProfile.removeSkill')}>
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Languages Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.languages')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                <Plus className="h-4 w-4 mr-1" />
                {t('editProfile.addLanguage')}
              </Button>
            </div>
            {editData.languages.map((lang, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={lang.language}
                  onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                  placeholder={t('editProfile.fields.languagePlaceholder')}
                  className="flex-1"
                />
                <Input
                  value={lang.proficiency || ''}
                  onChange={(e) => updateLanguage(index, 'proficiency', e.target.value || null)}
                  placeholder={t('editProfile.fields.proficiencyPlaceholder')}
                  className="w-32"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage(index)} aria-label={t('editProfile.removeLanguage')}>
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          {/* Certifications Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('editProfile.certifications')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addCertification}>
                <Plus className="h-4 w-4 mr-1" />
                {t('editProfile.addCertification')}
              </Button>
            </div>
            {editData.certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={cert.name}
                  onChange={(e) => updateCertification(index, 'name', e.target.value)}
                  placeholder={t('editProfile.fields.certNamePlaceholder')}
                  className="flex-1"
                />
                <Input
                  value={cert.issuer || ''}
                  onChange={(e) => updateCertification(index, 'issuer', e.target.value || null)}
                  placeholder={t('editProfile.fields.issuerPlaceholder')}
                  className="w-32"
                />
                <Input
                  value={cert.issueDate || ''}
                  onChange={(e) => updateCertification(index, 'issueDate', e.target.value || null)}
                  placeholder={t('editProfile.fields.datePlaceholder')}
                  className="w-24"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCertification(index)} aria-label={t('editProfile.removeCertification')}>
                  <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSaveEdit}>
              {t('editProfile.save')}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              {t('cancel')}
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
            {t('processed.title')}
          </CardTitle>
          <CardDescription>
            {t('processed.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('processed.name')}</p>
              <p className="text-lg font-semibold">{parsed.fullName}</p>
            </div>
            {parsed.headline && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('processed.headline')}</p>
                <p>{parsed.headline}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('processed.badges.experience', { count: parsed.experience.length })}
            </Badge>
            <Badge variant="secondary">
              {t('processed.badges.education', { count: parsed.education.length })}
            </Badge>
            <Badge variant="secondary">
              {t('processed.badges.skills', { count: parsed.skills.length })}
            </Badge>
            <Badge variant="secondary">
              {t('processed.badges.languages', { count: parsed.languages.length })}
            </Badge>
            {(parsed.projects?.length || 0) > 0 && (
              <Badge variant="secondary">
                {t('processed.badges.projects', { count: parsed.projects!.length })}
              </Badge>
            )}
            {(parsed.interests?.length || 0) > 0 && (
              <Badge variant="secondary">
                {t('processed.badges.interests', { count: parsed.interests!.length })}
              </Badge>
            )}
          </div>

          {parsed.experience.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('processed.experiencePreview')}</p>
              <ul className="space-y-1 text-sm">
                {parsed.experience.slice(0, 3).map((exp, i) => (
                  <li key={i}>
                    {t.rich('processed.experienceAt', {
                      jobTitle: exp.title,
                      company: exp.company,
                      strong: (chunks) => <span className="font-medium">{chunks}</span>,
                    })}
                  </li>
                ))}
                {parsed.experience.length > 3 && (
                  <li className="text-muted-foreground">
                    {t('processed.morePositions', { count: parsed.experience.length - 3 })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {parsed.projects && parsed.projects.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">{t('processed.projectsPreview')}</p>
              <ul className="space-y-1 text-sm">
                {parsed.projects.slice(0, 3).map((proj, i) => (
                  <li key={i}>
                    <span className="font-medium">{proj.title}</span>
                    {proj.technologies.length > 0 && (
                      <span className="text-muted-foreground"> · {proj.technologies.slice(0, 3).join(', ')}</span>
                    )}
                  </li>
                ))}
                {parsed.projects.length > 3 && (
                  <li className="text-muted-foreground">
                    {t('processed.moreProjects', { count: parsed.projects.length - 3 })}
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
              {t('processed.photoHint')}
            </p>
          </div>

          {/* Contact Info Section - Prominent */}
          <div className="border-2 border-primary/20 rounded-lg p-4 mt-4 bg-primary/5">
            <p className="text-sm font-semibold text-primary mb-1">
              {t('contactInfo.title')}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {t('contactInfo.description')}
            </p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs text-muted-foreground">{t('contactInfo.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('contactInfo.emailPlaceholder')}
                  value={parsed.email || ''}
                  onChange={(e) => setParsed({ ...parsed, email: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs text-muted-foreground">{t('contactInfo.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('contactInfo.phonePlaceholder')}
                  value={parsed.phone || ''}
                  onChange={(e) => setParsed({ ...parsed, phone: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="linkedinUrl" className="text-xs text-muted-foreground">{t('contactInfo.linkedinUrl')}</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder={t('contactInfo.linkedinPlaceholder')}
                  value={parsed.linkedinUrl || ''}
                  onChange={(e) => setParsed({ ...parsed, linkedinUrl: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website" className="text-xs text-muted-foreground">{t('contactInfo.website')}</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder={t('contactInfo.websitePlaceholder')}
                  value={parsed.website || ''}
                  onChange={(e) => setParsed({ ...parsed, website: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="github" className="text-xs text-muted-foreground">{t('contactInfo.github')}</Label>
                <Input
                  id="github"
                  placeholder={t('contactInfo.githubPlaceholder')}
                  value={parsed.github || ''}
                  onChange={(e) => setParsed({ ...parsed, github: e.target.value || undefined })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs text-muted-foreground">{t('contactInfo.location')}</Label>
                <Input
                  id="location"
                  placeholder={t('contactInfo.locationPlaceholder')}
                  value={parsed.location || ''}
                  onChange={(e) => setParsed({ ...parsed, location: e.target.value || null })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('contactInfo.emailRequired')}
            </p>
          </div>

          {/* Saved Profiles Quick Select - shown when profiles exist */}
          {savedProfiles.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t('savedProfiles.label')}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {t('savedProfiles.switchProfile')}
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
                            {profile.headline || t('savedProfiles.experienceCount', { count: profile.experienceCount })}
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
                      {t('savedProfiles.newProfile')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleContinue}>
              {t('continue')}
            </Button>
            <Button variant="outline" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {tCommon('edit')}
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
                {t('saveProfile.saveButton')}
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
                  {t('saveProfile.updateButton')}
                </Button>
                {/* Manual editing, AI enrichment and LinkedIn export all
                    live on the dedicated profile edit page now. */}
                <Button variant="outline" asChild>
                  <a
                    href={`/profiles/${selectedProfileId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('processed.editInProfiles')}
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSaveProfileName(parsed?.fullName || '');
                    setShowSaveDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('saveProfile.saveAsNew')}
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('processed.startOver')}
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
              {t('saveProfile.title')}
            </DialogTitle>
            <DialogDescription>
              {t('saveProfile.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('saveProfile.nameLabel')}</Label>
              <Input
                id="profile-name"
                placeholder={t('saveProfile.namePlaceholder')}
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('saveProfile.nameHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-description">{t('saveProfile.descriptionLabel')}</Label>
              <Textarea
                id="profile-description"
                placeholder={t('saveProfile.descriptionPlaceholder')}
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
                {t('saveProfile.setDefault')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!saveProfileName.trim() || isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saveProfile.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveProfile.save')}
                </>
              )}
            </Button>
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
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
            {fileInputSupported && (
              <span className="block mt-1 text-primary">
                {t('tip')}
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
                <Label className="text-sm font-medium">{t('savedProfiles.label')}</Label>
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
                          {profile.headline || t('savedProfiles.experienceCount', { count: profile.experienceCount })}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('savedProfiles.actions', { name: profile.name })}>
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleLoadProfile(profile.id); }}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          {t('savedProfiles.load')}
                        </DropdownMenuItem>
                        {!profile.isDefault && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetDefault(profile.id); }}>
                            <Star className="h-4 w-4 mr-2" />
                            {t('savedProfiles.setDefault')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  {t('addNewBelow')}
                </p>
              </div>
            </div>
          )}

          {isLoadingProfiles && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('savedProfiles.loading')}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {fileInputSupported && (apiKey || llmMode === 'platform') && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('addFile')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowTextInput(!showTextInput)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addText')}
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
                <p className="font-medium">{t('fileUploadUnavailable')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('modelNoVision', { model: modelInfo?.name || t('unknownModel') })}{' '}
                  {t('visionRequired')}
                </p>
              </div>
            </Alert>
          )}

          {/* API key required warning */}
          {fileInputSupported && !apiKey && llmMode !== 'platform' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">
                <p className="font-medium">{t('apiKeyRequired')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('configureApiKey')}
                </p>
              </div>
            </Alert>
          )}

          {/* Text input area */}
          {showTextInput && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <Label>{t('extraTextInfo')}</Label>
                <Button variant="ghost" size="icon" onClick={() => setShowTextInput(false)} aria-label={t('closeTextInput')}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <Textarea
                placeholder={t('textPlaceholder')}
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {t('textTip')}
                </p>
                <Button size="sm" onClick={handleAddText} disabled={!textInputValue.trim()}>
                  {t('add')}
                </Button>
              </div>
            </div>
          )}

          {/* Drop zone (only when no sources yet and file upload is supported) */}
          {sources.length === 0 && fileInputSupported && (apiKey || llmMode === 'platform') && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('dropzone')}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('fileTypesHint')}
              </p>
            </div>
          )}

          {/* Sources list */}
          {sources.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">{t('addedSourcesCount', { count: sources.length })}</Label>
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
                              {source.file.mediaType === 'application/pdf' ? t('fileTypePdf') : t('fileTypeImage')}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t('textInput')}</p>
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
                      aria-label={t('removeSource')}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Drop zone for adding more files */}
              {fileInputSupported && (apiKey || llmMode === 'platform') && (
                <div
                  className="border border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <p className="text-sm text-muted-foreground">
                    <Plus className="h-4 w-4 inline mr-1" />
                    {t('addMoreFiles')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Token estimate (hidden in platform mode — users pay credits, not tokens) */}
          {showTokenEstimate && llmMode !== 'platform' && (
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('estimatedTokens')}</span>
                </div>
                <span className="text-sm font-mono">
                  {formatTokenCount(tokenEstimate.estimatedTokens)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('estimatedCost')}</span>
                <span className="text-sm font-mono">
                  {formatCost(tokenEstimate.estimatedCost)}
                </span>
              </div>
              {exceedsWarningThreshold(tokenEstimate.estimatedTokens) && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="ml-2 text-sm">
                    {t('largeRequest')}
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
                {t('processingInfo')}
              </>
            ) : (
              <>
                {t('processInfo')}
                {llmMode === 'platform' && hasFileSource && (
                  <CreditBadge operation="profile-parse" />
                )}
              </>
            )}
          </Button>

          {/* Hint for text-only */}
          {sources.length > 0 && !hasFileSource && (
            <p className="text-xs text-center text-muted-foreground">
              {t('textOnlyFree')}
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
              {t('largeRequestDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('largeRequestDialog.description', {
                tokens: formatTokenCount(tokenEstimate.estimatedTokens),
                cost: formatCost(tokenEstimate.estimatedCost),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {t('confirmLargeRequest')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={processSourcesInternal}>
              {t('largeRequestDialog.confirm')}
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
              {t('saveProfile.title')}
            </DialogTitle>
            <DialogDescription>
              {t('saveProfile.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t('saveProfile.nameLabel')}</Label>
              <Input
                id="profile-name"
                placeholder={t('saveProfile.namePlaceholder')}
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('saveProfile.nameHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-description">{t('saveProfile.descriptionLabel')}</Label>
              <Textarea
                id="profile-description"
                placeholder={t('saveProfile.descriptionPlaceholder')}
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
                {t('saveProfile.setDefault')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!saveProfileName.trim() || isSavingProfile}
            >
              {isSavingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saveProfile.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('saveProfile.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
