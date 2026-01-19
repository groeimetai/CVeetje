# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CVeetje is an AI-powered CV generator that creates tailored CVs based on LinkedIn/profile data and job vacancy requirements. Users provide their profile information, optionally add a target job, and the AI generates optimized CV content with dynamic styling.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

## Architecture

### CV Generation Flow

The application follows a wizard-based flow in `src/components/cv/cv-wizard.tsx`:

1. **Profile Input** (`profile-input.tsx`) - User provides LinkedIn/profile data (text or file upload)
2. **Job Input** (`job-input.tsx`) - Optional target job vacancy parsing
3. **Style Generation** (`dynamic-style-picker.tsx`) - AI generates visual style config based on profile and job
4. **CV Generation** (`/api/cv/generate`) - AI generates tailored CV content
5. **Preview** (`cv-preview.tsx`) - Interactive preview with element editing
6. **PDF Export** (`/api/cv/[id]/pdf`) - Puppeteer-based PDF generation

### Key Directories

- `src/app/` - Next.js App Router pages and API routes
  - `(auth)/` - Authentication pages (login, register)
  - `(dashboard)/` - Protected dashboard pages
  - `api/` - API routes for CV generation, payments, settings
- `src/components/` - React components
  - `cv/` - CV-specific components (wizard, preview, inputs)
  - `ui/` - Radix UI-based shadcn components
  - `auth/` - Authentication context and forms
- `src/lib/` - Core business logic
  - `ai/` - AI provider integration and generators
  - `cv/` - HTML generator (shared between preview and PDF)
  - `firebase/` - Firebase client and admin configuration
  - `pdf/` - Puppeteer PDF generation
- `src/types/` - TypeScript types (centralized in `index.ts`)

### AI Integration (`src/lib/ai/`)

- `providers.ts` - Multi-provider factory (OpenAI, Anthropic, Google, Groq, etc.)
- `cv-generator.ts` - CV content generation with Zod schema validation
- `style-generator.ts` - Dynamic style configuration generation
- `models-registry.ts` - Available models and capabilities

Uses Vercel AI SDK (`ai` package) with `generateObject()` for structured output.

### HTML Generation (`src/lib/cv/html-generator.ts`)

The `generateCVHTML()` function produces identical HTML for both browser preview and PDF rendering (WYSIWYG). Supports:
- Dynamic typography (Google Fonts)
- Multiple header styles, item styles, skill display modes
- SVG decorations
- Element overrides for interactive editing
- Print-optimized CSS

### Data Flow

```
User Input → AI Parsing → CVStyleConfig + GeneratedCVContent
                                ↓
                         generateCVHTML()
                          ↓           ↓
                    Preview       PDF (Puppeteer)
```

## Key Types (`src/types/index.ts`)

- `ParsedLinkedIn` - Structured profile data
- `JobVacancy` - Parsed job posting with keywords
- `CVStyleConfig` - Complete visual styling (colors, typography, layout, decorations)
- `GeneratedCVContent` - AI-generated CV content (summary, experience, education, skills)
- `CV` - Full CV document stored in Firestore

## Firebase Collections

- `users` - User profiles with encrypted API keys
- `cvs` - Generated CV documents
- `transactions` - Credit transactions

## Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `NEXT_PUBLIC_FIREBASE_*` - Firebase client config
- `FIREBASE_ADMIN_*` - Firebase Admin SDK credentials
- `ENCRYPTION_KEY` - For encrypting user API keys
- `MOLLIE_API_KEY` - Payment processing
- `NEXT_PUBLIC_APP_URL` - Application URL

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Notes

- Interface has Dutch labels (e.g., "Profiel", "Vacature", "Stijl")
- Users bring their own AI API keys (stored encrypted)
- PDF generation uses `@sparticuz/chromium` for Vercel serverless compatibility
- Credits system: 1 credit per PDF download
