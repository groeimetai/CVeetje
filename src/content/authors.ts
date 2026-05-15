import type { AuthorProfile, AuthorId } from './types';

export const AUTHORS: Record<AuthorId, AuthorProfile> = {
  niels: {
    id: 'niels',
    name: 'Niels van der Werf',
    role: {
      nl: 'Oprichter CVeetje · GroeimetAI',
      en: 'Founder CVeetje · GroeimetAI',
    },
    bio: {
      nl: 'Bouwt CVeetje sinds 2025. Ervaring met AI-product development, recruitmenttechnologie en arbeidsmarkt-data in Nederland. Schrijft over hoe AI het sollicitatieproces eerlijker en sneller kan maken zonder de mens uit de loop te halen.',
      en: 'Has been building CVeetje since 2025. Background in AI product development, recruitment technology, and Dutch labour-market data. Writes about how AI can make the application process fairer and faster without removing the human from the loop.',
    },
    url: 'https://maakcveetje.nl',
  },
  team: {
    id: 'team',
    name: 'Het CVeetje-team',
    role: {
      nl: 'Productie & content',
      en: 'Production & content',
    },
    bio: {
      nl: 'Het kleine team achter CVeetje — een product van GroeimetAI uit Apeldoorn. We bundelen feedback van honderden gebruikers, recruiters en hiring managers in onze content.',
      en: 'The small team behind CVeetje — a product of GroeimetAI in Apeldoorn, the Netherlands. We bundle feedback from hundreds of users, recruiters, and hiring managers into our content.',
    },
    url: 'https://maakcveetje.nl',
  },
  editorial: {
    id: 'editorial',
    name: 'CVeetje Redactie',
    role: {
      nl: 'Redactie',
      en: 'Editorial',
    },
    bio: {
      nl: 'De CVeetje-redactie verzamelt inzichten uit recruitment, HR-tech en de Nederlandse arbeidsmarkt. We checken stukken op feiten, ATS-claims, en eerlijke representatie van wat AI wel en niet doet.',
      en: 'The CVeetje editorial desk gathers insights from recruitment, HR tech, and the Dutch labour market. We fact-check claims, especially around ATS systems, and keep an honest line on what AI can and cannot do.',
    },
  },
};

export function getAuthor(id: AuthorId): AuthorProfile {
  return AUTHORS[id];
}
