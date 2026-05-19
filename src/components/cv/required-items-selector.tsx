'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, FolderGit2, GraduationCap, Award, ArrowRight, SkipForward, Pin } from 'lucide-react';
import type { ParsedLinkedIn } from '@/types';
import type { RequiredItemsSelection } from '@/types/cv';

interface RequiredItemsSelectorProps {
  linkedInData: ParsedLinkedIn;
  initialSelection?: RequiredItemsSelection;
  onComplete: (selection: RequiredItemsSelection) => void;
  onSkip: () => void;
  onBack?: () => void;
}

function toggle(set: Set<number>, idx: number): Set<number> {
  const next = new Set(set);
  if (next.has(idx)) next.delete(idx);
  else next.add(idx);
  return next;
}

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  return `${start ?? '?'} – ${end ?? 'heden'}`;
}

export function RequiredItemsSelector({
  linkedInData,
  initialSelection,
  onComplete,
  onSkip,
  onBack,
}: RequiredItemsSelectorProps) {
  const t = useTranslations('requiredItems');

  const [experiences, setExperiences] = useState<Set<number>>(
    () => new Set(initialSelection?.experienceIndices ?? []),
  );
  const [projects, setProjects] = useState<Set<number>>(
    () => new Set(initialSelection?.projectIndices ?? []),
  );
  const [educations, setEducations] = useState<Set<number>>(
    () => new Set(initialSelection?.educationIndices ?? []),
  );
  const [certifications, setCertifications] = useState<Set<number>>(
    () => new Set(initialSelection?.certificationIndices ?? []),
  );

  const totalPinned = experiences.size + projects.size + educations.size + certifications.size;

  const expItems = linkedInData.experience ?? [];
  const projItems = linkedInData.projects ?? [];
  const eduItems = linkedInData.education ?? [];
  const certItems = linkedInData.certifications ?? [];

  const hasAnyItems = useMemo(
    () => expItems.length + projItems.length + eduItems.length + certItems.length > 0,
    [expItems.length, projItems.length, eduItems.length, certItems.length],
  );

  const handleSubmit = () => {
    const selection: RequiredItemsSelection = {};
    if (experiences.size > 0) selection.experienceIndices = Array.from(experiences).sort((a, b) => a - b);
    if (projects.size > 0) selection.projectIndices = Array.from(projects).sort((a, b) => a - b);
    if (educations.size > 0) selection.educationIndices = Array.from(educations).sort((a, b) => a - b);
    if (certifications.size > 0) selection.certificationIndices = Array.from(certifications).sort((a, b) => a - b);
    onComplete(selection);
  };

  if (!hasAnyItems) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('emptyProfile')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                {t('back')}
              </Button>
            )}
            <Button onClick={onSkip} className="gap-2">
              {t('continue')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {expItems.length > 0 && (
          <Section
            icon={<Briefcase className="h-4 w-4" />}
            title={t('sections.experience')}
            hint={t('sections.experienceHint')}
            count={experiences.size}
          >
            {expItems.map((exp, i) => (
              <ItemRow
                key={`exp-${i}`}
                checked={experiences.has(i)}
                onToggle={() => setExperiences((prev) => toggle(prev, i))}
                primary={`${exp.title} — ${exp.company}`}
                secondary={formatPeriod(exp.startDate, exp.endDate)}
              />
            ))}
          </Section>
        )}

        {projItems.length > 0 && (
          <Section
            icon={<FolderGit2 className="h-4 w-4" />}
            title={t('sections.projects')}
            hint={t('sections.projectsHint')}
            count={projects.size}
          >
            {projItems.map((proj, i) => (
              <ItemRow
                key={`proj-${i}`}
                checked={projects.has(i)}
                onToggle={() => setProjects((prev) => toggle(prev, i))}
                primary={proj.title}
                secondary={
                  [proj.role, formatPeriod(proj.startDate, proj.endDate)]
                    .filter((s): s is string => Boolean(s && s.length > 0))
                    .join(' · ') || null
                }
              />
            ))}
          </Section>
        )}

        {eduItems.length > 0 && (
          <Section
            icon={<GraduationCap className="h-4 w-4" />}
            title={t('sections.education')}
            hint={t('sections.educationHint')}
            count={educations.size}
          >
            {eduItems.map((edu, i) => {
              const degreeAndField = [edu.degree, edu.fieldOfStudy].filter(Boolean).join(' · ');
              return (
                <ItemRow
                  key={`edu-${i}`}
                  checked={educations.has(i)}
                  onToggle={() => setEducations((prev) => toggle(prev, i))}
                  primary={edu.school}
                  secondary={
                    [degreeAndField || null, edu.startYear || edu.endYear ? `${edu.startYear ?? ''}–${edu.endYear ?? ''}` : null]
                      .filter((s): s is string => Boolean(s && s.length > 0))
                      .join(' · ') || null
                  }
                />
              );
            })}
          </Section>
        )}

        {certItems.length > 0 && (
          <Section
            icon={<Award className="h-4 w-4" />}
            title={t('sections.certifications')}
            hint={t('sections.certificationsHint')}
            count={certifications.size}
          >
            {certItems.map((cert, i) => (
              <ItemRow
                key={`cert-${i}`}
                checked={certifications.has(i)}
                onToggle={() => setCertifications((prev) => toggle(prev, i))}
                primary={cert.name}
                secondary={
                  [cert.issuer, cert.issueDate]
                    .filter((s): s is string => Boolean(s && s.length > 0))
                    .join(' · ') || null
                }
              />
            ))}
          </Section>
        )}

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          {totalPinned > 0
            ? t('summary', { count: totalPinned })
            : t('summaryEmpty')}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              {t('back')}
            </Button>
          )}
          <Button variant="ghost" onClick={onSkip} className="gap-2">
            <SkipForward className="h-4 w-4" />
            {t('skip')}
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            {t('continue')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  icon,
  title,
  hint,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{title}</span>
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {count}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ItemRow({
  checked,
  onToggle,
  primary,
  secondary,
}: {
  checked: boolean;
  onToggle: () => void;
  primary: string;
  secondary: string | null;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-2.5 transition-colors hover:bg-muted/40">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-input"
        checked={checked}
        onChange={onToggle}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{primary}</div>
        {secondary && (
          <div className="text-xs text-muted-foreground truncate">{secondary}</div>
        )}
      </div>
    </label>
  );
}
