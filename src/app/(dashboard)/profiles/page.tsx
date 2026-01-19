'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  MoreVertical,
  Star,
  Trash2,
  Loader2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  Linkedin,
  Coins,
  FileText,
  User,
} from 'lucide-react';
import type { SavedProfileSummary } from '@/types';

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<SavedProfileSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch('/api/profiles');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.profiles) {
            setProfiles(data.profiles);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profiles:', err);
        setError('Kon profielen niet laden');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  // Delete profile
  const handleDelete = async (profileId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProfiles(prev => prev.filter(p => p.id !== profileId));
        setDeleteConfirm(null);
      } else {
        throw new Error('Verwijderen mislukt');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
    } finally {
      setIsDeleting(false);
    }
  };

  // Set as default
  const handleSetDefault = async (profileId: string) => {
    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      if (response.ok) {
        setProfiles(prev => prev.map(p => ({
          ...p,
          isDefault: p.id === profileId,
        })));
      }
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  // Navigate to CV wizard with profile
  const handleCreateCV = (profileId: string) => {
    router.push(`/cv/new?profile=${profileId}`);
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
            <Card key={profile.id} className={profile.isDefault ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt={profile.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {profile.name}
                        {profile.isDefault && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {profile.headline || 'Geen headline'}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!profile.isDefault && (
                        <DropdownMenuItem onClick={() => handleSetDefault(profile.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Als standaard instellen
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteConfirm(profile.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Verwijderen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{profile.experienceCount} ervaringen</span>
                  </div>
                </div>

                {/* Description */}
                {profile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => handleCreateCV(profile.id)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    CV Maken
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/cv/new?profile=${profile.id}&enrich=true`)}
                    className="border-primary/50 text-primary"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Verrijken
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/cv/new?profile=${profile.id}&linkedin=true`)}
                    className="border-blue-500/50 text-blue-600"
                  >
                    <Linkedin className="h-4 w-4 mr-1" />
                    <Badge variant="secondary" className="ml-1 text-xs px-1">
                      <Coins className="h-3 w-3" />
                    </Badge>
                  </Button>
                </div>

                {/* Last updated */}
                <p className="text-xs text-muted-foreground">
                  Laatst bijgewerkt: {new Date(profile.updatedAt).toLocaleDateString('nl-NL')}
                </p>
              </CardContent>
            </Card>
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
