# i18n — `src/i18n/`

next-intl met locales `nl` (default) en `en`.

## Files

| File | Doel |
|---|---|
| `routing.ts` | Locales (`['nl', 'en']`), defaultLocale `nl` |
| `navigation.ts` | Typed `Link`, `redirect`, `usePathname`, `useRouter` voor next-intl |
| `request.ts` | Server-side locale resolution |
| `messages/nl.json`, `messages/en.json` | Translation strings |

## Patterns

- Pages onder `src/app/[locale]/` — automatisch locale-prefixed
- API routes onder `src/app/api/` — **niet** locale-prefixed
- Locale switching via `src/components/language-switcher.tsx`
- Server components: gebruik `getTranslations()` van `next-intl/server`
- Client components: `useTranslations()` van `next-intl`

## Nieuwe vertaling

1. Voeg key toe aan beide `messages/nl.json` en `messages/en.json`
2. Gebruik via `useTranslations('namespace')` of `getTranslations('namespace')`
