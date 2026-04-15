import type { JobVacancy } from '@/types';
import { normalizedJobToJobVacancy } from './providers/types';
import type { CachedJob } from './cache';

export function cachedJobToJobVacancy(job: CachedJob): JobVacancy {
  return normalizedJobToJobVacancy(job);
}
