'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Building2, MapPin, ExternalLink, Trash2, Save, Briefcase } from 'lucide-react';
import type { ApplicationRecord, ApplicationStatus } from '@/types/application';
import { PageHeader } from '@/components/brand/page-header';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ListSkeleton } from '@/components/ui/skeleton';

// Labels live in `applications.status.<value>`.
const STATUSES: Array<{ value: ApplicationStatus; color: string }> = [
  { value: 'applied', color: 'bg-blue-100 text-blue-800' },
  { value: 'interview', color: 'bg-amber-100 text-amber-800' },
  { value: 'offer', color: 'bg-purple-100 text-purple-800' },
  { value: 'accepted', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', color: 'bg-red-100 text-red-800' },
  { value: 'withdrawn', color: 'bg-gray-100 text-gray-800' },
];

function getStatusMeta(status: ApplicationStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

export default function ApplicationsPage() {
  const t = useTranslations();
  const format = useFormatter();
  const confirmDialog = useConfirm();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openNotes, setOpenNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('applications.errors.loadFailed'));
      setApplications(data.applications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('applications.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: ApplicationStatus) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      // Bug-fix: mislukte saves werden stil genegeerd en toch in de UI getoond.
      if (!res.ok) {
        setError(t('applications.errors.saveFailed'));
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    } finally {
      setSaving(null);
    }
  };

  const saveNotes = async (id: string) => {
    setSaving(id);
    try {
      const notes = openNotes[id] ?? '';
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      // Bug-fix: mislukte saves werden stil genegeerd en toch in de UI getoond.
      if (!res.ok) {
        setError(t('applications.errors.saveFailed'));
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, notes } : a)),
      );
    } finally {
      setSaving(null);
    }
  };

  const removeApplication = async (id: string) => {
    if (!(await confirmDialog({ title: t('applications.confirmDelete'), destructive: true }))) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError(t('applications.errors.deleteFailed'));
        return;
      }
      setApplications((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <ListSkeleton rows={3} className="py-4" />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('pageHeaders.applications.eyebrow')}
        title={t.rich('pageHeaders.applications.title', { em: (chunks) => <em>{chunks}</em> })}
        subtitle={t('pageHeaders.applications.subtitle')}
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t('applications.empty.title')}</p>
            <p className="text-sm text-muted-foreground max-w-md">
              {t('applications.empty.description')}
            </p>
            <Button asChild className="mt-2">
              <Link href="/jobs">{t('jobs.listTitle')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const meta = getStatusMeta(app.status);
            const notesValue = openNotes[app.id] ?? app.notes ?? '';
            return (
              <Card key={app.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link
                          href={`/jobs/${app.jobSlug}`}
                          className="hover:underline"
                        >
                          {app.jobTitle}
                        </Link>
                      </CardTitle>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {app.jobCompany && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {app.jobCompany}
                          </span>
                        )}
                        {app.jobLocation && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {app.jobLocation}
                          </span>
                        )}
                        <span>
                          {t('applications.appliedOn', {
                            date: format.dateTime(new Date(app.appliedAt), { dateStyle: 'short' }),
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={meta.color + ' hover:' + meta.color}>
                        {t(`applications.status.${meta.value}`)}
                      </Badge>
                      <select
                        value={app.status}
                        onChange={(e) =>
                          updateStatus(app.id, e.target.value as ApplicationStatus)
                        }
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                        aria-label={t('applications.statusLabel')}
                        disabled={saving === app.id}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {t(`applications.status.${s.value}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <Textarea
                    value={notesValue}
                    onChange={(e) =>
                      setOpenNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                    }
                    placeholder={t('applications.notesPlaceholder')}
                    rows={2}
                    aria-label={t('applications.notesLabel')}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveNotes(app.id)}
                      disabled={saving === app.id}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {t('applications.saveNotes')}
                    </Button>
                    {app.jobUrl && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={app.jobUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t('applications.viewVacancy')}
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto text-destructive hover:text-destructive"
                      onClick={() => removeApplication(app.id)}
                      disabled={saving === app.id}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
