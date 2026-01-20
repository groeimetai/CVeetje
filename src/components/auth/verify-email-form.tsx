'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth/auth-context';
import { sendEmailVerification } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';

export function VerifyEmailForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { firebaseUser, loading: authLoading } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login');
    }
  }, [authLoading, firebaseUser, router]);

  // Redirect if already verified
  useEffect(() => {
    if (firebaseUser?.emailVerified) {
      router.push('/dashboard');
    }
  }, [firebaseUser, router]);

  const handleResendEmail = async () => {
    setResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await sendEmailVerification();
      setResendSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('verifyEmail.resendError');
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    setError(null);

    try {
      // Reload user to get latest emailVerified status
      await firebaseUser?.reload();

      if (firebaseUser?.emailVerified) {
        router.push('/dashboard');
      } else {
        setError(t('verifyEmail.notYetVerified'));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('verifyEmail.checkError');
      setError(errorMessage);
    } finally {
      setChecking(false);
    }
  };

  if (authLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('verifyEmail.title')}</CardTitle>
        <CardDescription>
          {t('verifyEmail.description', { email: firebaseUser?.email || '' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {resendSuccess && (
          <Alert className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <span className="ml-2">{t('verifyEmail.resendSuccess')}</span>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleCheckVerification}
            className="w-full"
            disabled={checking}
          >
            {checking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('verifyEmail.checking')}
              </>
            ) : (
              t('verifyEmail.checkButton')
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleResendEmail}
            className="w-full"
            disabled={resending}
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('verifyEmail.resending')}
              </>
            ) : (
              t('verifyEmail.resendButton')
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          {t('verifyEmail.checkSpam')}
        </p>
      </CardContent>
    </Card>
  );
}
