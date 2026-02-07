import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-3xl font-bold">404</h1>
            <p className="text-muted-foreground">
              Deze pagina bestaat niet of is verplaatst.
            </p>
            <Link href="/">
              <Button className="mt-4">Terug naar home</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
