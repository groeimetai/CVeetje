'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';

interface JobSearchBarProps {
  defaultQuery?: string;
  defaultLocation?: string;
}

export function JobSearchBar({ defaultQuery = '', defaultLocation = '' }: JobSearchBarProps) {
  const router = useRouter();
  const t = useTranslations('jobs.search');
  const [q, setQ] = useState(defaultQuery);
  const [location, setLocation] = useState(defaultLocation);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (location.trim()) params.set('location', location.trim());
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2">
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
    </form>
  );
}
