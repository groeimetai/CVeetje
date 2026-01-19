'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditDisplay } from '@/components/dashboard/credit-display';
import { useAuth } from '@/components/auth/auth-context';
import { getUserCVs } from '@/lib/firebase/firestore';
import type { CV } from '@/types';

export default function DashboardPage() {
  const { firebaseUser, userData } = useAuth();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [cvs, setCvs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCVs() {
      if (firebaseUser) {
        const userCvs = await getUserCVs(firebaseUser.uid);
        setCvs(userCvs);
        setLoading(false);
      }
    }
    fetchCVs();
  }, [firebaseUser]);

  const getStatusBadge = (status: CV['status']) => {
    switch (status) {
      case 'pdf_ready':
        return <Badge className="bg-green-500">{t('status.ready')}</Badge>;
      case 'generated':
        return <Badge className="bg-blue-500">{t('status.generated')}</Badge>;
      case 'generating':
        return <Badge className="bg-yellow-500">{t('status.generating')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('status.failed')}</Badge>;
      default:
        return <Badge variant="secondary">{t('status.draft')}</Badge>;
    }
  };

  const getStatusIcon = (status: CV['status']) => {
    switch (status) {
      case 'pdf_ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'generating':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('welcome', { name: userData?.displayName || 'there' })}
          </h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/cv/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('newCv')}
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.totalCvs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cvs.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('stats.readyForDownload')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {cvs.filter((cv) => cv.status === 'generated' || cv.status === 'pdf_ready').length}
            </p>
          </CardContent>
        </Card>

        <CreditDisplay />
      </div>

      {/* Recent CVs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentCvs.title')}</CardTitle>
          <CardDescription>{t('recentCvs.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              {tCommon('loading')}
            </div>
          ) : cvs.length === 0 ? (
            <div className="py-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">{t('recentCvs.noCvs')}</p>
              <Link href="/cv/new">
                <Button variant="outline" className="mt-4">
                  {t('recentCvs.createFirst')}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cvs.slice(0, 5).map((cv) => (
                <Link
                  key={cv.id}
                  href={`/cv/${cv.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(cv.status)}
                    <div>
                      <p className="font-medium">
                        {cv.linkedInData?.fullName || t('recentCvs.untitled')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {cv.jobVacancy?.title || t('recentCvs.generalCv')} • {cv.template}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(cv.status)}
                    <span className="text-xs text-muted-foreground">
                      {cv.createdAt?.toDate?.()?.toLocaleDateString() || tCommon('recently')}
                    </span>
                  </div>
                </Link>
              ))}

              {cvs.length > 5 && (
                <Link href="/cv">
                  <Button variant="ghost" className="w-full">
                    {t('recentCvs.viewAll', { count: cvs.length })}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      {!userData?.apiKey && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              {t('setupRequired.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {t('setupRequired.description')}
            </p>
            <Link href="/settings">
              <Button variant="outline">{t('setupRequired.button')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
