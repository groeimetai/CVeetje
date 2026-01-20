'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CVPreview } from '@/components/cv/cv-preview';
import { useAuth } from '@/components/auth/auth-context';
import { getCV, updateCV } from '@/lib/firebase/firestore';
import { styleConfigToTokens } from '@/lib/cv/templates/adapter';
import { getDefaultTokens } from '@/lib/cv/html-generator';
import type { CV, GeneratedCVContent, CVStyleConfig, CVElementOverrides } from '@/types';
import type { CVDesignTokens } from '@/types/design-tokens';

export default function CVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser, credits, refreshCredits } = useAuth();

  const [cv, setCV] = useState<(CV & { tokens?: CVDesignTokens }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvId = params.id as string;

  // Handle saving element overrides
  const handleUpdateOverrides = async (overrides: CVElementOverrides) => {
    if (!firebaseUser || !cvId) return;

    setIsSaving(true);
    try {
      await updateCV(firebaseUser.uid, cvId, { elementOverrides: overrides });
      setCV(prev => prev ? { ...prev, elementOverrides: overrides } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function fetchCV() {
      if (firebaseUser && cvId) {
        const cvData = await getCV(firebaseUser.uid, cvId);
        setCV(cvData as CV & { tokens?: CVDesignTokens });
        setLoading(false);
      }
    }
    fetchCV();
  }, [firebaseUser, cvId]);

  const handleDownload = async (pageMode: 'multi-page' | 'single-page' = 'multi-page') => {
    if (!cvId || credits < 1) return;

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pageMode }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${cv?.linkedInData?.fullName?.toLowerCase().replace(/\s+/g, '-') || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Refresh credits
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cv) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">CV not found</span>
        </Alert>
        <Link href="/cv">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to CVs
          </Button>
        </Link>
      </div>
    );
  }

  // Get tokens - use stored tokens if available, convert from styleConfig, or use defaults
  let tokens: CVDesignTokens;
  if (cv.tokens) {
    tokens = cv.tokens;
  } else if (cv.styleConfig) {
    tokens = styleConfigToTokens(cv.styleConfig as CVStyleConfig);
  } else {
    tokens = getDefaultTokens();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/cv">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {cv.linkedInData?.fullName || 'Untitled CV'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{cv.jobVacancy?.title || 'General CV'}</span>
              <span>•</span>
              <span>{tokens.styleName}</span>
              <span>•</span>
              <Badge variant="outline">{cv.status}</Badge>
            </div>
          </div>
        </div>

      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {credits < 1 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <span className="ml-2">
            You need at least 1 credit to download the PDF.{' '}
            <Link href="/credits" className="underline">
              Get more credits
            </Link>
          </span>
        </Alert>
      )}

      {/* CV Content */}
      {cv.generatedContent ? (
        <CVPreview
          content={cv.generatedContent as GeneratedCVContent}
          tokens={tokens}
          fullName={cv.linkedInData.fullName}
          headline={(cv.generatedContent as GeneratedCVContent).headline ?? cv.linkedInData.headline}
          avatarUrl={cv.avatarUrl}
          contactInfo={{
            email: cv.linkedInData.email,
            phone: cv.linkedInData.phone,
            location: cv.linkedInData.location || undefined,
            linkedinUrl: cv.linkedInData.linkedinUrl,
            website: cv.linkedInData.website,
            github: cv.linkedInData.github,
          }}
          jobVacancy={cv.jobVacancy}
          cvId={cvId}
          language={(cv as CV & { language?: 'nl' | 'en' }).language || 'nl'}
          onDownload={handleDownload}
          onRegenerate={() => router.push('/cv/new')}
          onCreditsRefresh={refreshCredits}
          isDownloading={isDownloading}
          isRegenerating={false}
          credits={credits}
          elementOverrides={cv.elementOverrides}
          onUpdateOverrides={handleUpdateOverrides}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>CV Details</CardTitle>
            <CardDescription>
              This CV has not been generated yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{cv.linkedInData.fullName}</p>
              </div>
              {cv.linkedInData.headline && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Headline</p>
                  <p>{cv.linkedInData.headline}</p>
                </div>
              )}
              {cv.jobVacancy && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Target Job</p>
                  <p>{cv.jobVacancy.title}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
