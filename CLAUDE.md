# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CVeetje is an AI-powered CV generator that creates tailored CVs from LinkedIn/profile data and job vacancy requirements. Users bring their own AI API keys (encrypted at rest), and all data stays in their Firebase project. Interface is in Dutch with i18n support (nl/en).

## Commands

```bash
npm run dev      # Dev server with Turbopack (localhost:3000)
npm run build    # Production build (Turbopack disabled via NEXT_PRIVATE_SKIP_TURBOPACK=1)
npm run lint     # ESLint
npm start        # Production server
```

No test framework is configured (no Jest/Vitest).

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript 5
- **Tailwind CSS 4** (via PostCSS plugin, no tailwind.config file)
- **Firebase** (Auth + Firestore) for client and admin SDK
- **Vercel AI SDK** (`ai` package) with multi-provider support (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek, etc.)
- **Puppeteer** + `@sparticuz/chromium` for PDF generation
- **docxtemplater** + `mammoth` for DOCX template filling
- **next-intl** for i18n (nl/en), default locale is `nl`
- **Mollie** for payments

## Architecture

### CV Generation Flow

The wizard in `src/components/cv/cv-wizard.tsx` orchestrates:

1. **Profile Input** → multi-modal (text, image, PDF) → AI parses to `ParsedLinkedIn`
2. **Job Input** → vacancy text → AI parses to `JobVacancy` with keywords
3. **Style Generation** → AI generates `CVDesignTokens` (~20 properties vs legacy `CVStyleConfig` with 150+)
4. **CV Generation** → `/api/cv/generate` → AI generates `GeneratedCVContent` with Zod schema validation
5. **Preview** → `cv-preview.tsx` with interactive element editing
6. **Export** → PDF via Puppeteer or DOCX via template filling

### WYSIWYG HTML Generation

`src/lib/cv/html-generator.ts` (`generateCVHTML()`) produces **identical HTML** for both browser preview and PDF rendering. This is the single source of truth for CV appearance. Changes here affect both preview and PDF output.

### Design Token System

Two styling systems coexist:
- **Legacy `CVStyleConfig`** — 150+ properties, used by `style-generator.ts`
- **Modern `CVDesignTokens`** — ~20 token properties, used by `style-generator-v2.ts`

Design tokens include theme bases (professional, modern, creative, minimal, bold), font pairings, header variants, section styles, and skill display modes. Types in `src/types/design-tokens.ts`.

### AI Integration (`src/lib/ai/`)

All AI calls use Vercel AI SDK's `generateObject()` with Zod schemas for structured output. Key generators:
- `cv-generator.ts` — CV content (summary, experience, education, skills)
- `style-generator-v2.ts` — Design tokens from profile + job context
- `job-parser.ts` — Vacancy text → structured `JobVacancy`
- `fit-analyzer.ts` — Profile-to-job fit scoring
- `motivation-generator.ts` — Cover letters
- `docx-content-replacer.ts` — AI-powered DOCX placeholder filling

`providers.ts` is a factory that creates provider instances from user-supplied API keys. `models-registry.ts` fetches available models dynamically.

### DOCX Template System (`src/lib/docx/`)

- `template-filler.ts` — Detects placeholders (`{{name}}`, `[NAME]`, `Label: _____`)
- `smart-template-filler.ts` — AI analyzes template structure, fills sections intelligently
- `docx-to-pdf.ts` — Converts DOCX to PDF via Puppeteer

### Authentication & Middleware

- Firebase Auth (email/password, Google OAuth) with token in `firebase-token` cookie
- `src/middleware.ts` — Protects dashboard routes, redirects auth routes, handles locale routing
- API routes verify tokens via Firebase Admin SDK from cookie or Authorization header
- User API keys encrypted with AES-256 (`src/lib/encryption.ts`)

### Credits System

`src/lib/credits/manager.ts` manages free monthly credits + purchased credits (via Mollie). 1 credit per PDF download.

## Key Types (`src/types/index.ts`)

All types are centralized in one ~1100-line file:
- `ParsedLinkedIn` — Profile data (experience, education, skills, languages)
- `JobVacancy` — Parsed job with keywords, requirements, salary estimate
- `CVStyleConfig` / `CVDesignTokens` — Visual styling configs
- `GeneratedCVContent` — AI output (summary, experience entries, education, skills)
- `CV` — Full Firestore document combining content + style + metadata
- `FitAnalysis` — Job fit score with strengths/warnings

## Firebase Collections

- `users` — Profiles with encrypted API keys, credit balances
- `cvs` — Generated CV documents
- `transactions` — Credit purchase/usage records

## Routing

All pages are under `src/app/[locale]/` for i18n. Route groups:
- `(auth)/` — Login, register, verify-email (redirects to dashboard if authenticated)
- `(dashboard)/` — Dashboard, CV creation, profiles, settings, admin (protected)

API routes are at `src/app/api/` (not locale-prefixed). Key endpoints:
- `/api/cv/generate`, `/api/cv/style`, `/api/cv/[id]/pdf`
- `/api/templates/[id]/analyze`, `/api/templates/[id]/fill`
- `/api/profile/parse`, `/api/cv/job/parse`
- `/api/settings/api-key` — Encrypted key management

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `NEXT_PUBLIC_FIREBASE_*` — Firebase client config
- `FIREBASE_ADMIN_*` — Admin SDK credentials
- `ENCRYPTION_KEY` — AES-256 key for API key encryption
- `MOLLIE_API_KEY` — Payment processing
- `NEXT_PUBLIC_APP_URL` — Application URL

## Path Aliases

`@/*` maps to `./src/*`

## Important Patterns

- AI content generation uses strict honesty rules — prompts forbid fabricating experience or skills
- PDF generation renders the same HTML as preview for WYSIWYG fidelity
- Print CSS in `html-generator.ts` avoids transforms, clip-path, and hover effects for PDF compatibility
- Google Fonts are loaded via `<link>` tags in generated HTML
- `standalone` output mode in next.config.ts for Docker/Cloud Run deployment
