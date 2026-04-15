import { Link } from '@/i18n/navigation';
import { Briefcase, MapPin, Building2, Euro, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NormalizedJob } from '@/lib/jobs/providers/types';

interface JobCardProps {
  job: NormalizedJob;
}

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const cur = currency || 'EUR';
  const fmt = (n: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export function JobCard({ job }: JobCardProps) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <Link href={`/jobs/${job.slug}`}>
      <Card className="hover:border-primary transition-colors h-full">
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-2 flex-1">{job.title}</h3>
            {job.supportsInAppApply && (
              <Badge variant="default" className="text-[10px] gap-1 shrink-0">
                <Zap className="h-2.5 w-2.5" />
                1-klik
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {job.company && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {job.company}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {job.location}
              </span>
            )}
            {job.employmentType && (
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {job.employmentType}
              </span>
            )}
            {salary && (
              <span className="inline-flex items-center gap-1">
                <Euro className="h-3 w-3" />
                {salary}
              </span>
            )}
          </div>
          {job.industry && (
            <div>
              <Badge variant="secondary" className="text-xs">
                {job.industry}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
