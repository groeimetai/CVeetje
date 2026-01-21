# CVeetje

An AI-powered CV generator that creates tailored, professional CVs based on your profile data and target job requirements.

## Why Open Source?

This project is intentionally open source. We believe in transparency and want to show exactly how your data is handled. Your profile information stays on your device and in your own Firebase project - we don't store or process your data on our servers. By making the code public, you can verify this yourself.

## Features

- **AI-Powered CV Generation** - Uses your preferred AI provider (OpenAI, Anthropic, Google, etc.) to generate tailored CV content
- **Bring Your Own API Key** - Your AI API key is stored encrypted; we never see your raw key
- **Dynamic Styling** - AI generates unique visual designs based on your profile and target role
- **Template System** - Use pre-designed templates or let AI create a custom design
- **Fit Analysis** - Get insights on how well your profile matches a job vacancy
- **Multi-language Support** - Generate CVs in Dutch or English
- **Profile Management** - Save and manage multiple profiles for different roles
- **PDF Export** - Download your CV as a professionally formatted PDF

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication
- **AI**: Vercel AI SDK with multiple provider support
- **PDF**: Puppeteer with @sparticuz/chromium

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project
- An AI provider API key (OpenAI, Anthropic, etc.)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cveetje.git
cd cveetje
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment example and configure:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables (see `.env.example` for required values)

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Environment Variables

See `.env.example` for the complete list. Key variables include:

- `NEXT_PUBLIC_FIREBASE_*` - Firebase client configuration
- `FIREBASE_ADMIN_*` - Firebase Admin SDK credentials
- `ENCRYPTION_KEY` - For encrypting user API keys
- `NEXT_PUBLIC_APP_URL` - Your application URL

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── [locale]/          # Internationalized routes
│   └── api/               # API endpoints
├── components/            # React components
│   ├── cv/               # CV-related components
│   ├── ui/               # shadcn/ui components
│   └── auth/             # Authentication components
├── lib/                  # Core business logic
│   ├── ai/              # AI provider integration
│   ├── cv/              # HTML/PDF generation
│   └── firebase/        # Firebase configuration
└── types/               # TypeScript type definitions
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is open source. See the license file for details.
