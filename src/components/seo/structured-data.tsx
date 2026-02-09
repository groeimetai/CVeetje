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
      description: 'Start gratis met 10 credits per maand',
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
          text: 'Je kunt gratis starten met 10 credits per maand. Voor meer CVs kun je extra credits kopen.',
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
          text: 'Je gegevens worden veilig opgeslagen en versleuteld. We delen je data nooit met derden.',
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
