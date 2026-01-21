'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Languages,
  MapPin,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  Pencil,
  Loader2,
  FileText,
  Sparkles,
  Star,
} from 'lucide-react';
import type { SavedProfile } from '@/types';

interface ProfileDetailDialogProps {
  profileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateCV?: (profileId: string) => void;
  onEnrich?: (profileId: string) => void;
}

export function ProfileDetailDialog({
  profileId,
  open,
  onOpenChange,
  onCreateCV,
  onEnrich,
}: ProfileDetailDialogProps) {
  const router = useRouter();
  const t = useTranslations('profiles');
  const [profile, setProfile] = useState<SavedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch full profile when dialog opens
  useEffect(() => {
    if (open && profileId) {
      setIsLoading(true);
      setError(null);

      fetch(`/api/profiles/${profileId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.profile) {
            setProfile(data.profile);
          } else {
            setError(data.error || 'Kon profiel niet laden');
          }
        })
        .catch(() => {
          setError('Kon profiel niet laden');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!open) {
      // Reset when dialog closes
      setProfile(null);
      setError(null);
    }
  }, [open, profileId]);

  const handleEdit = () => {
    if (profileId) {
      router.push(`/cv/new?profile=${profileId}&edit=true`);
      onOpenChange(false);
    }
  };

  const handleCreateCV = () => {
    if (profileId && onCreateCV) {
      onCreateCV(profileId);
      onOpenChange(false);
    }
  };

  const handleEnrich = () => {
    if (profileId && onEnrich) {
      onEnrich(profileId);
      onOpenChange(false);
    }
  };

  const data = profile?.parsedData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-destructive">
            {error}
          </div>
        ) : profile && data ? (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={data.fullName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl">{data.fullName}</DialogTitle>
                    {profile.isDefault && (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    )}
                  </div>
                  {data.headline && (
                    <p className="text-muted-foreground text-sm mt-1">{data.headline}</p>
                  )}
                  {data.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {data.location}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" onClick={handleCreateCV}>
                  <FileText className="h-4 w-4 mr-1" />
                  CV Maken
                </Button>
                <Button size="sm" variant="outline" onClick={handleEnrich}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Verrijken
                </Button>
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Bewerken
                </Button>
              </div>
            </DialogHeader>

            <Separator className="my-4" />

            <div className="max-h-[calc(90vh-220px)] overflow-y-auto px-6 pb-6">
              <div className="space-y-6">
                {/* Contact info */}
                {(data.email || data.phone || data.linkedinUrl || data.website || data.github) && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {data.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{data.email}</span>
                        </div>
                      )}
                      {data.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{data.phone}</span>
                        </div>
                      )}
                      {data.linkedinUrl && (
                        <div className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={data.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                      {data.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={data.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      {data.github && (
                        <div className="flex items-center gap-2">
                          <Github className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={data.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate"
                          >
                            GitHub
                          </a>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* About */}
                {data.about && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3">Over</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {data.about}
                    </p>
                  </section>
                )}

                {/* Experience */}
                {data.experience && data.experience.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Werkervaring ({data.experience.length})
                    </h3>
                    <div className="space-y-4">
                      {data.experience.map((exp, idx) => (
                        <div key={idx} className="border-l-2 border-muted pl-4">
                          <div className="font-medium text-sm">{exp.title}</div>
                          <div className="text-sm text-muted-foreground">{exp.company}</div>
                          <div className="text-xs text-muted-foreground">
                            {exp.startDate} - {exp.endDate || 'Heden'}
                            {exp.location && ` · ${exp.location}`}
                          </div>
                          {exp.description && (
                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-3">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Education */}
                {data.education && data.education.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Opleiding ({data.education.length})
                    </h3>
                    <div className="space-y-3">
                      {data.education.map((edu, idx) => (
                        <div key={idx} className="border-l-2 border-muted pl-4">
                          <div className="font-medium text-sm">{edu.school}</div>
                          {(edu.degree || edu.fieldOfStudy) && (
                            <div className="text-sm text-muted-foreground">
                              {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ')}
                            </div>
                          )}
                          {(edu.startYear || edu.endYear) && (
                            <div className="text-xs text-muted-foreground">
                              {edu.startYear} - {edu.endYear || 'Heden'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Skills */}
                {data.skills && data.skills.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3">Vaardigheden ({data.skills.length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {/* Languages */}
                {data.languages && data.languages.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      Talen ({data.languages.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang.language}
                          {lang.proficiency && ` (${lang.proficiency})`}
                        </Badge>
                      ))}
                    </div>
                  </section>
                )}

                {/* Certifications */}
                {data.certifications && data.certifications.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certificeringen ({data.certifications.length})
                    </h3>
                    <div className="space-y-2">
                      {data.certifications.map((cert, idx) => (
                        <div key={idx} className="border-l-2 border-muted pl-4">
                          <div className="font-medium text-sm">{cert.name}</div>
                          {cert.issuer && (
                            <div className="text-xs text-muted-foreground">
                              {cert.issuer}
                              {cert.issueDate && ` · ${cert.issueDate}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Profile metadata */}
                <section className="pt-4 border-t">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Profielnaam: {profile.name}</div>
                    {profile.description && <div>Beschrijving: {profile.description}</div>}
                    <div>Laatst bijgewerkt: {new Date(profile.updatedAt).toLocaleDateString('nl-NL')}</div>
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
