'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Linkedin,
  Copy,
  Check,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Award,
  Lightbulb,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { LinkedInExportResult } from '@/app/api/profiles/[id]/linkedin-export/route';

interface LinkedInExportDialogProps {
  profileId: string;
  profileName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreditsUsed?: () => void;
}

export function LinkedInExportDialog({
  profileId,
  profileName,
  open,
  onOpenChange,
  onCreditsUsed,
}: LinkedInExportDialogProps) {
  const t = useTranslations('linkedInExport');
  const [isExporting, setIsExporting] = useState(false);
  const [linkedInContent, setLinkedInContent] = useState<LinkedInExportResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const handleExport = useCallback(async (language: 'nl' | 'en') => {
    setIsExporting(true);
    setError(null);
    setHasStarted(true);

    try {
      const response = await fetch(`/api/profiles/${profileId}/linkedin-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('error.failed'));
      }

      if (result.success) {
        setLinkedInContent(result.linkedInContent);
        onCreditsUsed?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failed'));
    } finally {
      setIsExporting(false);
    }
  }, [profileId, t, onCreditsUsed]);

  const handleCopyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setLinkedInContent(null);
      setError(null);
      setHasStarted(false);
    }, 300);
  };

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleCopyToClipboard(text, fieldId)}
    >
      {copiedField === fieldId ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {hasStarted ? t('description') : t('selectLanguage', { name: profileName })}
          </DialogDescription>
        </DialogHeader>

        {!hasStarted && !isExporting ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">{t('chooseLanguage')}</p>
              <p className="text-xs text-muted-foreground">{t('creditCost')}</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => handleExport('nl')} variant="outline">
                {t('dutch')}
              </Button>
              <Button onClick={() => handleExport('en')} variant="outline">
                {t('english')}
              </Button>
            </div>
          </div>
        ) : isExporting ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-muted-foreground">{t('generating')}</p>
            <p className="text-xs text-muted-foreground">{t('creditCost')}</p>
          </div>
        ) : error ? (
          <div className="py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center mt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {t('tryAgain')}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleExport('nl')}>
                    {t('dutch')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('en')}>
                    {t('english')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : linkedInContent ? (
          <div className="space-y-6 py-4">
            {/* Headline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  {t('sections.headline')}
                </Label>
                <CopyButton text={linkedInContent.headline} fieldId="headline" />
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm">
                {linkedInContent.headline}
              </div>
              <p className="text-xs text-muted-foreground">{t('sections.headlineHint')}</p>
            </div>

            {/* About */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  {t('sections.about')}
                </Label>
                <CopyButton text={linkedInContent.about} fieldId="about" />
              </div>
              <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {linkedInContent.about}
              </div>
            </div>

            {/* Experience Descriptions */}
            {linkedInContent.experienceDescriptions.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  {t('sections.experience')}
                </Label>
                {linkedInContent.experienceDescriptions.map((exp, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{exp.optimizedTitle}</p>
                        <p className="text-sm text-muted-foreground">{exp.originalCompany}</p>
                      </div>
                      <CopyButton text={exp.description} fieldId={`exp-${idx}`} />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {exp.description}
                    </div>
                    {exp.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        <span className="text-xs text-muted-foreground mr-1">{t('sections.skills')}:</span>
                        {exp.skills.map((skill, skillIdx) => (
                          <Badge key={skillIdx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Education Descriptions */}
            {linkedInContent.educationDescriptions.some(edu => edu.description) && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  {t('sections.education')}
                </Label>
                {linkedInContent.educationDescriptions.filter(edu => edu.description).map((edu, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">{edu.originalSchool}</p>
                      <CopyButton text={edu.description} fieldId={`edu-${idx}`} />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {edu.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Skills */}
            {linkedInContent.topSkills.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    {t('sections.recommendedSkills')}
                  </Label>
                  <CopyButton text={linkedInContent.topSkills.join(', ')} fieldId="skills" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {linkedInContent.topSkills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tips */}
            {linkedInContent.profileTips.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  {t('sections.tips')}
                </Label>
                <ul className="space-y-2">
                  {linkedInContent.profileTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 font-bold">{idx + 1}.</span>
                      <span className="text-muted-foreground">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
