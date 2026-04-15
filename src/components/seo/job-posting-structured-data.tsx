import type { CachedJob } from '@/lib/jobs/cache';

interface JobPostingStructuredDataProps {
  job: CachedJob;
  url: string;
}

export function JobPostingStructuredData({ job, url }: JobPostingStructuredDataProps) {
  const validThrough = job.expiresAt;
  const datePosted = job.postedAt || job.fetchedAt;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted,
    validThrough,
    url,
    identifier: {
      '@type': 'PropertyValue',
      name: job.sourceProvider,
      value: job.sourceId,
    },
    directApply: false,
  };

  if (job.company) {
    data.hiringOrganization = {
      '@type': 'Organization',
      name: job.company,
    };
  }

  if (job.location) {
    data.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location,
        addressCountry: 'NL',
      },
    };
  }

  if (job.employmentType) {
    data.employmentType = job.employmentType;
  }

  if (job.industry) {
    data.industry = job.industry;
  }

  if (job.salaryMin || job.salaryMax) {
    data.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.salaryCurrency || 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salaryMin ?? undefined,
        maxValue: job.salaryMax ?? undefined,
        unitText: 'YEAR',
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
