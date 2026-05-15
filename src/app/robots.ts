import { MetadataRoute } from 'next';

const PRIVATE_PATHS = [
  '/api/',
  '/dashboard/',
  '/settings/',
  '/credits/',
  '/admin/',
  '/cv/',
  '/profiles/',
  '/verify-email/',
];

// Public content surfaces we want LLM crawlers to ingest preferentially
const LLM_ALLOW_PATHS = [
  '/',
  '/nl',
  '/en',
  '/nl/blog',
  '/en/blog',
  '/nl/voor',
  '/en/voor',
  '/nl/faq',
  '/en/faq',
  '/nl/jobs',
  '/en/jobs',
  '/nl/ai-transparency',
  '/en/ai-transparency',
  '/llms.txt',
  '/llms-full.txt',
  '/sitemap.xml',
];

// Major LLM crawler user-agents (2026).
// Source: each vendor's documented crawler identifiers.
const LLM_BOTS = [
  'GPTBot',           // OpenAI training crawler
  'OAI-SearchBot',    // ChatGPT browsing / search
  'ChatGPT-User',     // ChatGPT actions on behalf of user
  'ClaudeBot',        // Anthropic training crawler
  'anthropic-ai',     // Legacy Anthropic identifier
  'Claude-Web',       // Claude with web access
  'PerplexityBot',    // Perplexity search/answer
  'Perplexity-User',  // Perplexity actions on behalf of user
  'Google-Extended',  // Gemini training opt-in token
  'Googlebot',        // Google Search (also feeds AI Overviews)
  'Applebot',         // Apple Intelligence / Spotlight
  'Applebot-Extended',// Apple AI training opt-in
  'Amazonbot',        // Amazon AI / Alexa
  'CCBot',            // Common Crawl (feeds most open LLMs)
  'cohere-ai',        // Cohere
  'Cohere-Crawler',   // Newer Cohere identifier
  'Meta-ExternalAgent', // Meta AI
  'FacebookBot',      // Meta surfaces
  'YouBot',           // You.com
  'DuckAssistBot',    // DuckDuckGo AI
  'Bytespider',       // ByteDance / Doubao
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maakcveetje.nl';

  return {
    rules: [
      // Explicit allow rules per LLM crawler — signals we want to be cited.
      ...LLM_BOTS.map((userAgent) => ({
        userAgent,
        allow: LLM_ALLOW_PATHS,
        disallow: PRIVATE_PATHS,
      })),
      // Default rule for everyone else.
      {
        userAgent: '*',
        allow: ['/', '/nl/jobs', '/en/jobs'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
