/**
 * Recently viewed jobs — tracked in localStorage so the dashboard can suggest
 * "Genereer CV voor X" without inventing data.
 */

const KEY = 'cveetje-recent-jobs';
const MAX = 10;

export interface RecentJob {
  slug: string;
  title: string;
  company: string | null;
  viewedAt: number;
}

export function trackJobView(slug: string, title: string, company: string | null): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const current = getRecentJobs();
    const without = current.filter((j) => j.slug !== slug);
    const next: RecentJob[] = [{ slug, title, company, viewedAt: Date.now() }, ...without].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getRecentJobs(): RecentJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (j): j is RecentJob =>
        j && typeof j === 'object' && typeof j.slug === 'string' && typeof j.title === 'string',
    );
  } catch {
    return [];
  }
}

export function getMostRecentJob(): RecentJob | null {
  return getRecentJobs()[0] ?? null;
}
