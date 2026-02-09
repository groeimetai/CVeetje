'use client';

import Link from 'next/link';
import { CreditCard, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/auth/auth-context';
import { getDaysUntilReset, getNextResetDate } from '@/lib/credits/manager';

export function CreditDisplay() {
  const { credits } = useAuth();
  const daysUntilReset = getDaysUntilReset();
  const nextResetDate = getNextResetDate();

  // Max free credits is 5, show progress relative to that
  const progressPercent = Math.min((credits / 10) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Credits
        </CardTitle>
        <CardDescription>
          Your current credit balance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <span className="text-5xl font-bold">{credits}</span>
          <p className="text-sm text-muted-foreground mt-1">
            credits remaining
          </p>
        </div>

        <Progress value={progressPercent} className="h-2" />

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Free credits reset in {daysUntilReset} days ({nextResetDate})
          </span>
        </div>

        <div className="pt-2">
          <Link href="/credits">
            <Button variant="outline" className="w-full">
              Buy More Credits
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
