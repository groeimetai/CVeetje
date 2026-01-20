'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CreditCard, Check, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/components/auth/auth-context';
import { getTransactionHistory } from '@/lib/firebase/firestore';
import { CREDIT_PACKAGES } from '@/lib/mollie/client';
import { getDaysUntilReset, getNextResetDate } from '@/lib/credits/manager';
import type { CreditTransaction } from '@/types';

export default function CreditsPage() {
  const searchParams = useSearchParams();
  const { firebaseUser, credits, refreshCredits } = useAuth();
  const t = useTranslations('credits');
  const tCommon = useTranslations('common');

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    async function fetchData() {
      if (firebaseUser) {
        const txs = await getTransactionHistory(firebaseUser.uid);
        setTransactions(txs);
        setLoading(false);

        // Refresh credits if payment completed
        if (paymentStatus === 'complete') {
          await refreshCredits();
        }
      }
    }
    fetchData();
  }, [firebaseUser, paymentStatus, refreshCredits]);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    setError(null);

    try {
      const response = await fetch('/api/mollie/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout');
      }

      // Redirect to Mollie checkout
      window.location.href = result.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPurchasing(null);
    }
  };

  const daysUntilReset = getDaysUntilReset();
  const nextResetDate = getNextResetDate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {paymentStatus === 'complete' && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <span className="ml-2 text-green-700">
            {t('paymentSuccess')}
          </span>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('balance.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-4xl sm:text-5xl font-bold">{credits}</p>
              <p className="text-muted-foreground">{t('balance.available')}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t('balance.resetIn', { days: daysUntilReset })}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('balance.nextReset', { date: nextResetDate })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('buy.title')}
          </CardTitle>
          <CardDescription>
            {t('buy.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="relative rounded-lg border p-6 hover:border-primary transition-colors"
              >
                {pkg.id === 'pack_15' && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500">
                    {t('buy.popular')}
                  </Badge>
                )}
                <div className="text-center">
                  <p className="text-3xl font-bold">{pkg.credits}</p>
                  <p className="text-muted-foreground">{t('buy.credits')}</p>
                </div>
                <Separator className="my-4" />
                <div className="text-center">
                  <p className="text-2xl font-semibold">&euro;{pkg.price}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkg.description}
                  </p>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                >
                  {purchasing === pkg.id ? t('buy.processing') : t('buy.buyNow')}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('history.title')}</CardTitle>
          <CardDescription>
            {t('history.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-4">{tCommon('loading')}</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {t('history.noTransactions')}
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.createdAt?.toDate?.()?.toLocaleDateString() || tCommon('recently')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.amount > 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount} {t('history.credits')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {tx.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
