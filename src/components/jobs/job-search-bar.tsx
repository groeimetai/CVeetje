'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react';
import type { JobSortOption } from '@/lib/jobs/providers/types';

export interface JobSearchFilters {
  employmentType?: string;
  remote: boolean;
  inAppOnly: boolean;
  salaryMin?: number;
  sort: JobSortOption;
}

interface JobSearchBarProps {
  defaultQuery?: string;
  defaultLocation?: string;
  defaultFilters?: JobSearchFilters;
}

const EMPLOYMENT_TYPES: { value: string; nl: string; en: string }[] = [
  { value: '', nl: 'Alle types', en: 'All types' },
  { value: 'full', nl: 'Voltijd', en: 'Full-time' },
  { value: 'part', nl: 'Deeltijd', en: 'Part-time' },
  { value: 'contract', nl: 'Contract', en: 'Contract' },
  { value: 'intern', nl: 'Stage', en: 'Internship' },
];

const SORT_OPTIONS: { value: JobSortOption; nl: string; en: string }[] = [
  { value: 'recent', nl: 'Meest recent', en: 'Most recent' },
  { value: 'salary', nl: 'Hoogste salaris', en: 'Highest salary' },
  { value: 'relevance', nl: 'Relevantie', en: 'Relevance' },
];

export function JobSearchBar({
  defaultQuery = '',
  defaultLocation = '',
  defaultFilters,
}: JobSearchBarProps) {
  const router = useRouter();
  const t = useTranslations('jobs.search');
  const activeLocale = useLocale();
  const locale: 'nl' | 'en' = activeLocale === 'en' ? 'en' : 'nl';
  const [q, setQ] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation);
  const [employmentType, setEmploymentType] = useState(
    defaultFilters?.employmentType ?? '',
  );
  const [remote, setRemote] = useState(defaultFilters?.remote ?? false);
  const [inAppOnly, setInAppOnly] = useState(defaultFilters?.inAppOnly ?? false);
  const [salaryMin, setSalaryMin] = useState(
    defaultFilters?.salaryMin ? String(defaultFilters.salaryMin) : '',
  );
  const [sort, setSort] = useState<JobSortOption>(defaultFilters?.sort ?? 'recent');
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      defaultFilters?.employmentType ||
        defaultFilters?.remote ||
        defaultFilters?.inAppOnly ||
        defaultFilters?.salaryMin,
    ),
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (location.trim()) params.set('location', location.trim());
    if (employmentType) params.set('type', employmentType);
    if (remote) params.set('remote', '1');
    if (inAppOnly) params.set('inApp', '1');
    if (salaryMin.trim()) {
      const n = parseInt(salaryMin.trim(), 10);
      if (!Number.isNaN(n) && n > 0) params.set('salaryMin', String(n));
    }
    if (sort && sort !== 'recent') params.set('sort', sort);
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const clearFilters = () => {
    setEmploymentType('');
    setRemote(false);
    setInAppOnly(false);
    setSalaryMin('');
    setSort('recent');
  };

  const hasActiveFilters =
    Boolean(employmentType) || remote || inAppOnly || Boolean(salaryMin) || sort !== 'recent';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
          />
        </div>
        <div className="relative md:w-72">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('locationPlaceholder')}
            aria-label={t('locationPlaceholder')}
          />
        </div>
        <Button type="submit">{t('submit')}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          {locale === 'nl' ? 'Filters' : 'Filters'}
          {hasActiveFilters && (
            <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
              ●
            </span>
          )}
        </Button>
      </div>

      {showAdvanced && (
        <div className="rounded-md border bg-muted/20 p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="job-filter-type" className="text-xs">
              {locale === 'nl' ? 'Type dienstverband' : 'Employment type'}
            </Label>
            <select
              id="job-filter-type"
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {EMPLOYMENT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {locale === 'nl' ? opt.nl : opt.en}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="job-filter-salary" className="text-xs">
              {locale === 'nl' ? 'Minimum salaris (€/jaar)' : 'Minimum salary (€/year)'}
            </Label>
            <Input
              id="job-filter-salary"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder={locale === 'nl' ? 'bv. 40000' : 'e.g. 40000'}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="job-filter-sort" className="text-xs">
              {locale === 'nl' ? 'Sortering' : 'Sort by'}
            </Label>
            <select
              id="job-filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as JobSortOption)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {locale === 'nl' ? opt.nl : opt.en}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 justify-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={remote}
                onChange={(e) => setRemote(e.target.checked)}
                className="rounded"
              />
              {locale === 'nl' ? 'Alleen remote/hybride' : 'Remote/hybrid only'}
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={inAppOnly}
                onChange={(e) => setInAppOnly(e.target.checked)}
                className="rounded"
              />
              {locale === 'nl' ? 'Alleen 1-klik solliciteren' : '1-click apply only'}
            </label>
          </div>

          {hasActiveFilters && (
            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-1" />
                {locale === 'nl' ? 'Filters wissen' : 'Clear filters'}
              </Button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
