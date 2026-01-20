'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useProfiles } from '@/hooks/use-profiles';
import { ProfileCard } from '@/components/profiles/profile-card';

export default function ProfilesPage() {
  const router = useRouter();
  const t = useTranslations('profiles');
  const { profiles, isLoading, error, deleteProfile, setDefaultProfile } = useProfiles();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (profileId: string) => {
    setIsDeleting(true);
    const success = await deleteProfile(profileId);
    if (success) {
      setDeleteConfirm(null);
    }
    setIsDeleting(false);
  };

  const handleCreateCV = (profileId: string) => {
    router.push(`/cv/new?profile=${profileId}`);
  };

  const handleEnrich = (profileId: string) => {
    router.push(`/cv/new?profile=${profileId}&enrich=true`);
  };

  const handleLinkedInExport = (profileId: string) => {
    router.push(`/cv/new?profile=${profileId}&linkedin=true`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => router.push('/cv/new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          {t('newProfile')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noProfiles')}</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {t('noProfilesDescription')}
            </p>
            <Button onClick={() => router.push('/cv/new')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createNewProfile')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              variant="card"
              onSetDefault={setDefaultProfile}
              onDelete={(id) => setDeleteConfirm(id)}
              onCreateCV={handleCreateCV}
              onEnrich={handleEnrich}
              onLinkedInExport={handleLinkedInExport}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t('deleteConfirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('deleteConfirm.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deleteConfirm.delete')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
