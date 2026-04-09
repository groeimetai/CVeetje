'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  FileText,
  AlertCircle,
  User,
  Star,
} from 'lucide-react';
import { ProfileEditForm } from '@/components/profiles/profile-edit-form';
import { ProfileEnrichDrawer } from '@/components/profiles/profile-enrich-drawer';
import type { SavedProfile, ParsedLinkedIn } from '@/types';

export default function ProfileEditPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations('profiles.edit');

  const profileId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [draft, setDraft] = useState<ParsedLinkedIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);

  // Load profile on mount.
  useEffect(() => {
    if (!profileId) return;

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/profiles/${profileId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || t('loadError'));
        }
        if (!cancelled) {
          setProfile(data.profile);
          setDraft(data.profile.parsedData);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t('loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profileId, t]);

  // Is the draft different from the persisted profile?
  const isDirty = useMemo(() => {
    if (!profile || !draft) return false;
    return JSON.stringify(profile.parsedData) !== JSON.stringify(draft);
  }, [profile, draft]);

  // Warn the user about unsaved changes when navigating away.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!profileId || !draft) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsedData: draft }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t('saveError'));
      }

      // Update our snapshot so isDirty becomes false.
      setProfile((prev) => (prev ? { ...prev, parsedData: draft } : prev));
      toast.success(t('saved'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('saveError');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [profileId, draft, t]);

  const handleDiscard = useCallback(() => {
    if (profile) setDraft(profile.parsedData);
  }, [profile]);

  const handleCreateCV = useCallback(() => {
    if (profileId) router.push(`/cv/new?profile=${profileId}`);
  }, [profileId, router]);

  // Enrichment drawer applies its diff to our local draft.
  // The user must still click Save at the top to persist.
  const handleEnrichApply = useCallback(
    (enriched: ParsedLinkedIn) => {
      setDraft(enriched);
      toast.info(t('unsavedChanges'));
    },
    [t]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !profile || !draft) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/profiles')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('backToList')}
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{loadError || t('notFound')}</span>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/profiles')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('backToList')}
        </Button>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatarUrl}
                      alt={draft.fullName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight truncate">
                      {draft.fullName || profile.name}
                    </h1>
                    {profile.isDefault && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                  </div>
                  {draft.headline && (
                    <p className="text-sm text-muted-foreground truncate">{draft.headline}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.name}
                  </p>
                </div>
              </div>

              {/* Primary actions */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      {t('save')}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setEnrichOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  {t('enrichWithAI')}
                </Button>
                <Button variant="outline" onClick={handleCreateCV}>
                  <FileText className="h-4 w-4 mr-1" />
                  CV
                </Button>
              </div>
            </div>

            {isDirty && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-amber-500/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <span>{t('unsavedChanges')}</span>
                <Button size="sm" variant="ghost" onClick={handleDiscard}>
                  {t('discardChanges')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit form */}
      <Card>
        <CardContent className="p-6">
          <ProfileEditForm value={draft} onChange={setDraft} />
        </CardContent>
      </Card>

      {/* Enrichment drawer */}
      <ProfileEnrichDrawer
        profileId={profileId}
        currentProfile={draft}
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        onApply={handleEnrichApply}
      />
    </div>
  );
}
