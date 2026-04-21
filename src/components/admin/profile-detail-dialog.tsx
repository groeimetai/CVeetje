'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Calendar,
  Copy,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/components/auth/auth-context';
import type { AdminProfileSummary } from '@/lib/firebase/admin-utils';
import type {
  ParsedLinkedIn,
  LinkedInExperience,
  LinkedInEducation,
} from '@/types';

interface ProfileDetailDialogProps {
  summary: AdminProfileSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FullProfile {
  id: string;
  name: string;
  description?: string;
  parsedData: ParsedLinkedIn;
  avatarUrl?: string | null;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Render a value with explicit "ontbreekt" indicator when null/undefined/"" so
// admins can immediately tell parsed-vs-missing apart.
function FieldValue({ value }: { value: string | null | undefined }) {
  if (value === null || value === undefined || value === '') {
    return (
      <span className="inline-flex items-center gap-1 text-destructive text-xs">
        <AlertCircle className="h-3 w-3" />
        ontbreekt
      </span>
    );
  }
  return <span className="text-sm">{value}</span>;
}

function ExperienceCard({ exp, index }: { exp: LinkedInExperience; index: number }) {
  const missingEnd = !exp.endDate && !exp.isCurrentRole;
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {exp.title || <span className="text-destructive">geen titel</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {exp.company || <span className="text-destructive">geen bedrijf</span>}
            {exp.location && ` · ${exp.location}`}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">startDate: </span>
          <FieldValue value={exp.startDate} />
        </div>
        <div>
          <span className="text-muted-foreground">endDate: </span>
          {exp.isCurrentRole ? (
            <Badge variant="secondary" className="text-xs">huidig</Badge>
          ) : missingEnd ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              ontbreekt
            </span>
          ) : (
            <span>{exp.endDate}</span>
          )}
        </div>
      </div>
      {exp.description && (
        <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t">
          {exp.description}
        </p>
      )}
    </div>
  );
}

function EducationCard({ edu, index }: { edu: LinkedInEducation; index: number }) {
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            {edu.school || <span className="text-destructive">geen school</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {edu.degree || <span className="text-destructive">geen titel</span>}
            {edu.fieldOfStudy && ` · ${edu.fieldOfStudy}`}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">startYear: </span>
          <FieldValue value={edu.startYear} />
        </div>
        <div>
          <span className="text-muted-foreground">endYear: </span>
          <FieldValue value={edu.endYear} />
        </div>
      </div>
    </div>
  );
}

export function ProfileDetailDialog({
  summary,
  open,
  onOpenChange,
}: ProfileDetailDialogProps) {
  const { refreshToken } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !summary) {
      setProfile(null);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await refreshToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(
          `/api/admin/profiles/${summary.userId}/${summary.profileId}`,
          { headers }
        );
        if (!response.ok) throw new Error('Kon profiel niet laden');
        const data = await response.json();
        if (!cancelled) setProfile(data.profile);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Onbekende fout');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [open, summary, refreshToken]);

  if (!summary) return null;

  const parsed = profile?.parsedData;

  const copyJson = () => {
    if (!profile) return;
    navigator.clipboard.writeText(JSON.stringify(profile, null, 2));
  };

  const initials = (summary.userDisplayName || summary.userEmail || 'U')
    .split(/[\s@]/)
    .map(s => s[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={summary.avatarUrl || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <span>{summary.name}</span>
              {summary.isDefault && (
                <Badge variant="default" className="ml-2 text-xs">Standaard</Badge>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <UserIcon className="h-3 w-3" />
            {summary.userDisplayName || summary.userEmail}
            <span className="text-muted-foreground">·</span>
            <span className="font-mono text-xs">{summary.profileId}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : !parsed ? null : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overzicht</TabsTrigger>
              <TabsTrigger value="experience">Werk ({parsed.experience?.length || 0})</TabsTrigger>
              <TabsTrigger value="education">Opleiding ({parsed.education?.length || 0})</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 pt-4">
              {summary.missingFields.length > 0 && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-md p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Ontbrekende velden ({summary.missingFields.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {summary.missingFields.map((f) => (
                      <Badge key={f} variant="destructive" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">fullName</p>
                  <FieldValue value={parsed.fullName} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">headline</p>
                  <FieldValue value={parsed.headline} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">location</p>
                  <FieldValue value={parsed.location} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">birthDate</p>
                  <FieldValue value={parsed.birthDate} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">email</p>
                  <FieldValue value={parsed.email} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">phone</p>
                  <FieldValue value={parsed.phone} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">linkedinUrl</p>
                  <FieldValue value={parsed.linkedinUrl} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">website</p>
                  <FieldValue value={parsed.website} />
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">about</p>
                {parsed.about ? (
                  <p className="text-sm whitespace-pre-wrap">{parsed.about}</p>
                ) : (
                  <FieldValue value={null} />
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Skills ({parsed.skills?.length || 0})
                  </p>
                  {parsed.skills && parsed.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {parsed.skills.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s.name}</Badge>
                      ))}
                    </div>
                  ) : (
                    <FieldValue value={null} />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Talen ({parsed.languages?.length || 0})
                  </p>
                  {parsed.languages && parsed.languages.length > 0 ? (
                    <div className="space-y-1">
                      {parsed.languages.map((l, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium">{l.language}</span>
                          {l.proficiency && (
                            <span className="text-muted-foreground"> · {l.proficiency}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <FieldValue value={null} />
                  )}
                </div>
              </div>

              {profile?.createdAt && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Aangemaakt: {new Date(profile.createdAt).toLocaleString('nl-NL')}
                    </div>
                    {profile.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Bijgewerkt: {new Date(profile.updatedAt).toLocaleString('nl-NL')}
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="experience" className="space-y-3 pt-4">
              {parsed.experience && parsed.experience.length > 0 ? (
                parsed.experience.map((exp, i) => (
                  <ExperienceCard key={i} exp={exp} index={i} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Geen werkervaring opgeslagen.
                </p>
              )}
            </TabsContent>

            <TabsContent value="education" className="space-y-3 pt-4">
              {parsed.education && parsed.education.length > 0 ? (
                parsed.education.map((edu, i) => (
                  <EducationCard key={i} edu={edu} index={i} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Geen opleidingen opgeslagen.
                </p>
              )}
            </TabsContent>

            <TabsContent value="raw" className="pt-4">
              <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={copyJson}>
                  <Copy className="h-3 w-3 mr-1" />
                  Kopieer JSON
                </Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[60vh] font-mono">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
