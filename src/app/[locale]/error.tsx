'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <AlertTriangle className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Er is iets misgegaan</h1>
          <p className="text-muted-foreground">
            Er is een onverwachte fout opgetreden. Probeer het opnieuw.
          </p>
          <Button onClick={reset} className="mt-4">
            Opnieuw proberen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
