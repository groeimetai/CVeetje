'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CVPreview } from '@/components/cv/cv-preview';
import { useAuth } from '@/components/auth/auth-context';
import { getCV } from '@/lib/firebase/firestore';
import type { CV, GeneratedCVContent, CVStyleConfig } from '@/types';

// Create a default style config from legacy colorScheme
function createDefaultStyleConfig(cv: CV): CVStyleConfig {
  return {
    styleName: 'Classic Style',
    styleRationale: 'A traditional CV layout',
    colors: {
      primary: cv.colorScheme?.primary || '#1e40af',
      secondary: cv.colorScheme?.secondary || '#dbeafe',
      accent: cv.colorScheme?.accent || '#3b82f6',
      text: '#333333',
      muted: '#666666',
    },
    typography: {
      headingFont: 'inter',
      bodyFont: 'inter',
      nameSizePt: 24,
      headingSizePt: 12,
      bodySizePt: 10,
      lineHeight: 1.5,
    },
    layout: {
      style: 'single-column',
      headerStyle: 'left-aligned',
      sectionOrder: ['summary', 'experience', 'education', 'skills', 'languages', 'certifications'],
      sectionDivider: 'line',
      skillDisplay: 'tags',
      spacing: 'normal',
      showPhoto: false,
    },
    decorations: {
      intensity: 'moderate',
      useBorders: false,
      useBackgrounds: false,
      iconStyle: 'none',
      cornerStyle: 'rounded',
    },
    industryFit: 'general',
    formalityLevel: 'professional',
  };
}

export default function CVDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser, credits, refreshCredits } = useAuth();

  const [cv, setCV] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cvId = params.id as string;

  useEffect(() => {
    async function fetchCV() {
      if (firebaseUser && cvId) {
        const cvData = await getCV(firebaseUser.uid, cvId);
        setCV(cvData);
        setLoading(false);
      }
    }
    fetchCV();
  }, [firebaseUser, cvId]);

  const handleDownload = async () => {
    if (!cvId || credits < 1) return;

    setIsDownloading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`, {
        method: 'POST',
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

  // Get style config - use existing or create default from legacy colorScheme
  const styleConfig = cv.styleConfig || createDefaultStyleConfig(cv);

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
              <span>{cv.styleConfig?.styleName || cv.template}</span>
              <span>•</span>
              <Badge variant="outline">{cv.status}</Badge>
            </div>
          </div>
        </div>

        {cv.generatedContent && (
          <Button onClick={handleDownload} disabled={isDownloading || credits < 1}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Generating...' : 'Download PDF (1 credit)'}
          </Button>
        )}
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
          styleConfig={styleConfig}
          fullName={cv.linkedInData.fullName}
          headline={cv.linkedInData.headline}
          avatarUrl={cv.avatarUrl}
          onDownload={handleDownload}
          onRegenerate={() => router.push('/cv/new')}
          isDownloading={isDownloading}
          isRegenerating={false}
          credits={credits}
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
                  <p>
                    {cv.jobVacancy.title}
                    {cv.jobVacancy.company && ` at ${cv.jobVacancy.company}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
