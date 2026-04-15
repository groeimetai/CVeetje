import { parseSlug } from './providers/types';
import {
  getCompanyByKey,
  getProviderByCode,
} from './providers/registry';
import { getCachedJob, upsertCachedJob, type CachedJob } from './cache';
import { adzunaProvider } from './providers/adzuna';
import { detectAtsFromUrl } from './ats-detector';
import { buildSlug } from './providers/types';

/**
 * Lazily fetch full ATS details for a job we originally discovered via Adzuna.
 * Returns the enriched job (with applyQuestions populated) or null.
 */
async function enrichFromAts(cached: CachedJob): Promise<CachedJob> {
  if (
    cached.sourceProvider === 'adzuna' ||
    cached.applyQuestions.length > 0 ||
    !cached.providerCompanyId
  ) {
    return cached;
  }
  const provider = getProviderByCode(providerCodeFor(cached.sourceProvider));
  if (!provider) return cached;
  try {
    const fresh = await provider.fetchJob(cached.providerCompanyId, cached.sourceId);
    if (!fresh) return cached;
    return upsertCachedJob({ ...fresh, slug: cached.slug });
  } catch {
    return cached;
  }
}

function providerCodeFor(provider: CachedJob['sourceProvider']): string {
  if (provider === 'greenhouse') return 'gh';
  if (provider === 'recruitee') return 'rt';
  if (provider === 'lever') return 'lv';
  return 'az';
}

export async function resolveJobBySlug(slug: string): Promise<CachedJob | null> {
  const cached = await getCachedJob(slug);
  if (cached) {
    // If the cached job was first seen via Adzuna detection and we never
    // fetched the ATS-specific questions, enrich on demand.
    if (cached.sourceProvider !== 'adzuna' && cached.applyQuestions.length === 0) {
      return enrichFromAts(cached);
    }
    return cached;
  }

  const parsed = parseSlug(slug);
  if (!parsed) return null;

  // ATS slug → fetch from provider and cache
  if (parsed.providerCode !== 'az') {
    const provider = getProviderByCode(parsed.providerCode);
    const company = getCompanyByKey(parsed.companyKey);
    if (!provider) return null;

    // For ATS companies not in our seed registry (detected via Adzuna URL),
    // fall back to using the companyKey as companyId (best-effort).
    const companyId = company?.companyId ?? parsed.companyKey;
    const fetched = await provider.fetchJob(companyId, parsed.jobId).catch(() => null);
    if (!fetched) return null;
    return upsertCachedJob({ ...fetched, slug });
  }

  // Adzuna slug → search by id, run detection, cache
  const raw = await adzunaProvider.fetchJob('', parsed.jobId).catch(() => null);
  if (!raw) return null;
  const detected = detectAtsFromUrl(raw.url);
  const base: CachedJob = {
    ...(raw as unknown as CachedJob),
    slug,
  };
  if (detected) {
    const promotedSlug = buildSlug(
      detected.providerCode,
      detected.companyKey,
      detected.jobId,
      raw.title,
    );
    const promoted = await upsertCachedJob({
      ...raw,
      sourceProvider: detected.provider,
      sourceId: detected.jobId,
      providerCompanyKey: detected.companyKey,
      providerCompanyId: detected.companyId,
      slug: promotedSlug,
      supportsInAppApply: true,
    });
    // Also store under the original Adzuna slug so the URL keeps working
    await upsertCachedJob({ ...promoted, slug });
    return { ...promoted, slug };
  }

  return upsertCachedJob(base);
}
