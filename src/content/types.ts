import type { ReactNode } from 'react';

export type Locale = 'nl' | 'en';

export type ArticleCategory =
  | 'how-to'
  | 'guide'
  | 'perspective'
  | 'comparison'
  | 'opinion'
  | 'case-study'
  | 'deep-dive';

export type Persona =
  | 'werkzoekenden'
  | 'recruiters'
  | 'studenten'
  | 'zij-instromers'
  | 'loopbaancoaches'
  | 'product-owners'
  | 'hiring-managers'
  | 'zzp'
  | 'internationals'
  | 'herintreders';

export type AuthorId = 'niels' | 'team' | 'editorial';

export interface AuthorProfile {
  id: AuthorId;
  name: string;
  role: { nl: string; en: string };
  bio: { nl: string; en: string };
  url?: string;
}

export interface ArticleMeta {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  category: ArticleCategory;
  personas?: Persona[];
  keywords: string[];
  author: AuthorId;
  ogImage?: string;
  faq?: { q: string; a: string }[];
  howTo?: {
    name: string;
    totalTimeMinutes?: number;
    steps: { name: string; text: string }[];
  };
}

export interface Article {
  meta: ArticleMeta;
  Body: () => ReactNode;
}
