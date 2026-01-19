'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profielen</h1>
          <p className="text-muted-foreground">
            Beheer je opgeslagen profielen voor snelle CV creatie
          </p>
        </div>
        <Button onClick={() => router.push('/cv/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Profiel
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
            <h3 className="text-lg font-semibold mb-2">Geen profielen</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Je hebt nog geen profielen opgeslagen. Maak een CV en sla je profiel op om het later te hergebruiken.
            </p>
            <Button onClick={() => router.push('/cv/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Profiel Aanmaken
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <DialogTitle>Profiel Verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je dit profiel wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verwijderen...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verwijderen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
