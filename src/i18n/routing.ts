import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // List of all supported locales
  locales: ['nl', 'en'],

  // Default locale when no locale is detected
  defaultLocale: 'nl',

  // Always show locale prefix in URL (e.g., /nl/dashboard, /en/dashboard)
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
