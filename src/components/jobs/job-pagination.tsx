import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JobPaginationProps {
  currentPage: number;
  totalPages: number;
  q?: string;
  location?: string;
}

function buildHref(page: number, q?: string, location?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (location) params.set('location', location);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/jobs${qs ? `?${qs}` : ''}`;
}

export function JobPagination({ currentPage, totalPages, q, location }: JobPaginationProps) {
  if (totalPages <= 1) return null;
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);
  const lastShown = Math.min(totalPages, 20);

  return (
    <div className="flex items-center justify-between pt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={buildHref(prev, q, location)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Vorige
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Vorige
          </span>
        )}
      </Button>
      <span className="text-sm text-muted-foreground">
        Pagina {currentPage} van {lastShown}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={buildHref(next, q, location)}>
            Volgende
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        ) : (
          <span>
            Volgende
            <ChevronRight className="h-4 w-4 ml-1" />
          </span>
        )}
      </Button>
    </div>
  );
}
