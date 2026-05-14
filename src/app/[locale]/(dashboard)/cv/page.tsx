'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, FileText, MoreVertical, Download, Trash2, Eye, Building2, Target, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs, deleteCV } from '@/lib/firebase/firestore';
import { PageHeader } from '@/components/brand/page-header';
import type { CV } from '@/types';

export default function CVListPage() {
  const { firebaseUser, effectiveUserId } = useAuth();
  const t = useTranslations('cvList');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCVs() {
      if (effectiveUserId) {
        const userCvs = await getUserCVs(effectiveUserId);
        setCvs(userCvs);
        setLoading(false);
      }
    }
    fetchCVs();
  }, [effectiveUserId]);

  const handleDelete = async (cvId: string) => {
    if (!effectiveUserId || !confirm(t('deleteConfirm'))) return;

    try {
      await deleteCV(effectiveUserId, cvId);
      setCvs(cvs.filter((cv) => cv.id !== cvId));
    } catch (error) {
      console.error('Failed to delete CV:', error);
    }
  };

  const getStatusBadge = (status: CV['status']) => {
    switch (status) {
      case 'pdf_ready':
        return <span className="brand-badge brand-badge--success"><span className="brand-badge-dot" />{tDashboard('status.ready')}</span>;
      case 'generated':
        return <span className="brand-badge brand-badge--primary"><span className="brand-badge-dot" />{tDashboard('status.generated')}</span>;
      case 'generating':
        return <span className="brand-badge brand-badge--accent"><span className="brand-badge-dot" />{tDashboard('status.generating')}</span>;
      case 'failed':
        return <Badge variant="destructive">{tDashboard('status.failed')}</Badge>;
      default:
        return <span className="brand-badge brand-badge--ghost">{tDashboard('status.draft')}</span>;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="§ CV-archief"
        title={<>Mijn <em>CV's</em></>}
        subtitle={t('subtitle')}
        actions={
          <Link href="/cv/new" className="brand-btn brand-btn--primary">
            <Plus size={14} />
            {tDashboard('newCv')}
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('allCvs')}</CardTitle>
          <CardDescription>
            {t('cvsCreated', { count: cvs.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">{tCommon('loading')}</div>
          ) : cvs.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">{t('noCvs')}</p>
              <p className="text-sm text-muted-foreground">
                {t('createFirst')}
              </p>
              <Link href="/cv/new">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('createCv')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cvs.map((cv) => (
                <Link
                  key={cv.id}
                  href={`/cv/${cv.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm sm:text-base">
                        {cv.linkedInData?.fullName || tDashboard('recentCvs.untitled')}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate">
                          {cv.jobVacancy?.title || tDashboard('recentCvs.generalCv')}
                        </span>
                        {cv.jobVacancy?.company && (
                          <>
                            <span className="flex-shrink-0">@</span>
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {cv.jobVacancy.company}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="capitalize">{cv.template}</span>
                        <span>•</span>
                        <span>
                          {cv.createdAt?.toDate?.()?.toLocaleDateString() || tCommon('recently')}
                        </span>
                        {cv.fitAnalysis && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              <span className={
                                cv.fitAnalysis.overallScore >= 80 ? 'text-green-600 dark:text-green-400 font-medium' :
                                cv.fitAnalysis.overallScore >= 60 ? 'text-blue-600 dark:text-blue-400 font-medium' :
                                cv.fitAnalysis.overallScore >= 40 ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
                                cv.fitAnalysis.overallScore >= 20 ? 'text-orange-600 dark:text-orange-400 font-medium' :
                                'text-red-600 dark:text-red-400 font-medium'
                              }>
                                {cv.fitAnalysis.overallScore}%
                              </span>
                            </span>
                          </>
                        )}
                        {cv.motivationLetter && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>Brief</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getStatusBadge(cv.status)}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/cv/${cv.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('view')}
                          </Link>
                        </DropdownMenuItem>
                        {(cv.status === 'generated' || cv.status === 'pdf_ready') && (
                          <DropdownMenuItem asChild>
                            <Link href={`/cv/${cv.id}?download=true`}>
                              <Download className="mr-2 h-4 w-4" />
                              {t('downloadPdf')}
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => cv.id && handleDelete(cv.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
