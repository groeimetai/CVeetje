export function WebsiteStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'CVeetje',
    description: 'AI-powered CV builder that creates professional, tailored CVs from your LinkedIn profile in minutes.',
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Start gratis met 15 credits per maand — 1 volledig CV',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'AI-powered CV generation',
      'LinkedIn profile import',
      'Job-specific optimization',
      'Multiple design templates',
      'PDF export',
      'Dutch and English support',
    ],
    screenshot: `${baseUrl}/opengraph-image`,
    softwareVersion: '1.0.0',
    creator: {
      '@type': 'Organization',
      name: 'CVeetje',
      url: baseUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function FAQStructuredData() {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Hoe werkt CVeetje?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CVeetje gebruikt AI om je LinkedIn profiel te analyseren en een professioneel CV te genereren. Upload je profiel, selecteer een vacature, en ontvang binnen minuten een op maat gemaakt CV.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is CVeetje gratis?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Je kunt gratis starten met 15 credits per maand — genoeg voor 1 volledig CV. Voor meer CVs kun je extra credits kopen vanaf €4,99 voor 15 credits.',
        },
      },
      {
        '@type': 'Question',
        name: 'Kan ik mijn CV aanpassen?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ja! Na het genereren kun je de inhoud en styling van je CV volledig aanpassen voordat je het downloadt.',
        },
      },
      {
        '@type': 'Question',
        name: 'Welke formaten ondersteunt CVeetje?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CVeetje exporteert je CV als professionele PDF, klaar om te versturen naar werkgevers.',
        },
      },
      {
        '@type': 'Question',
        name: 'Hoe veilig is mijn data?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Je gegevens worden veilig opgeslagen en versleuteld. Bij gebruik van Platform AI wordt je CV-data verwerkt door Anthropic (Claude). Zie ons privacybeleid voor details.',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }}
    />
  );
}

export function OrganizationStructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CVeetje',
    legalName: 'GroeimetAI',
    url: baseUrl,
    logo: `${baseUrl}/opengraph-image`,
    description: 'AI-powered CV builder that creates professional, tailored CVs from your LinkedIn profile in minutes.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Fabriekstraat 20',
      addressLocality: 'Apeldoorn',
      postalCode: '7311GP',
      addressCountry: 'NL',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@groeimetai.io',
      contactType: 'customer service',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
    />
  );
}

export function BreadcrumbStructuredData({ items }: { items: { name: string; url: string }[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
    />
  );
}

type ArticleProps = {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  inLanguage?: string;
  image?: string;
  keywords?: string[];
};

export function ArticleStructuredData(p: ArticleProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cveetje.nl';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.headline,
    description: p.description,
    inLanguage: p.inLanguage || 'nl-NL',
    image: p.image || `${baseUrl}/opengraph-image`,
    datePublished: p.datePublished,
    dateModified: p.dateModified || p.datePublished,
    keywords: p.keywords?.join(', '),
    mainEntityOfPage: { '@type': 'WebPage', '@id': p.url.startsWith('http') ? p.url : `${baseUrl}${p.url}` },
    author: {
      '@type': 'Person',
      name: p.authorName,
      url: p.authorUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CVeetje',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/opengraph-image` },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type HowToStep = { name: string; text: string };
type HowToProps = {
  name: string;
  description: string;
  totalTimeMinutes?: number;
  steps: HowToStep[];
  inLanguage?: string;
};

export function HowToStructuredData(p: HowToProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: p.name,
    description: p.description,
    inLanguage: p.inLanguage || 'nl-NL',
    totalTime: p.totalTimeMinutes ? `PT${p.totalTimeMinutes}M` : undefined,
    step: p.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type FAQItem = { q: string; a: string };

export function FAQPageStructuredData({ items, id }: { items: FAQItem[]; id?: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': id,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

type PersonProps = {
  name: string;
  url?: string;
  description?: string;
  jobTitle?: string;
};

export function PersonStructuredData(p: PersonProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.name,
    url: p.url,
    description: p.description,
    jobTitle: p.jobTitle,
    worksFor: { '@type': 'Organization', name: 'CVeetje' },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
