import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

// E2E: Firebase Emulator Suite-origins alleen toestaan als de emulator-modus
// expliciet aan staat (nooit in productie-builds).
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "1";
const emulatorConnect = useEmulators
  ? " http://127.0.0.1:9099 http://127.0.0.1:8080 ws://127.0.0.1:8080 http://127.0.0.1:9199 http://localhost:9099 http://localhost:8080 http://localhost:9199"
  : "";
const emulatorImg = useEmulators ? " http://127.0.0.1:9199 http://localhost:9199" : "";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // E2E-builds (emulator-modus) gaan naar een aparte map zodat ze de normale
  // build niet overschrijven. Zie e2e/README.md.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Set turbopack root to this project directory
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Configure for puppeteer/chromium + native PDF render deps.
  // @napi-rs/canvas has a native .node binding; pdfjs-dist ships large legacy
  // build files. Both must stay external so bundlers don't try to embed them.
  serverExternalPackages: [
    "@sparticuz/chromium",
    "puppeteer-core",
    "@napi-rs/canvas",
    "pdfjs-dist",
  ],

  // Security headers
  headers: async () => [
    {
      // Apply to all routes
      source: "/:path*",
      headers: [
        // Prevent MIME type sniffing
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        // Control referrer information
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        // DNS prefetch control
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        // Strict Transport Security (HSTS)
        // Only applied in production with HTTPS
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        // Permissions Policy (formerly Feature-Policy)
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
        // Content Security Policy
        {
          key: "Content-Security-Policy",
          value: [
            // Default to self
            "default-src 'self'",
            // Allow scripts from self and inline (needed for Next.js)
            // 'unsafe-eval' alleen in development (React/Turbopack dev tooling);
            // 'unsafe-inline' is nodig voor Next.js inline hydration-scripts.
            `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://apis.google.com https://*.firebaseapp.com https://www.google.com https://www.gstatic.com`,
            // Allow styles from self, inline, and Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Allow fonts from self and Google Fonts
            "font-src 'self' https://fonts.gstatic.com data:",
            // Allow images from various sources (avatars, Firebase Storage, etc.)
            `img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://media.licdn.com https://*.licdn.com https://avatars.githubusercontent.com https://pbs.twimg.com${emulatorImg}`,
            // Allow connections to Firebase, AI providers, and Mollie
            `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.groq.com https://api.mollie.com https://fonts.googleapis.com https://fonts.gstatic.com${emulatorConnect}`,
            // Allow frames for Firebase Auth and reCAPTCHA
            "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com https://recaptcha.google.com",
            // Form submissions only to self
            "form-action 'self'",
            // Clickjacking-bescherming: alleen eigen origin mag de app framen.
            // Extra origins (bijv. een partner-embed) via FRAME_ANCESTORS env.
            `frame-ancestors 'self'${process.env.FRAME_ANCESTORS ? ' ' + process.env.FRAME_ANCESTORS : ''}`,
            "object-src 'none'",
            // Restrict base URIs
            "base-uri 'self'",
            // Report violations (optional - uncomment if you have a reporting endpoint)
            // "report-uri /api/csp-report",
          ].join("; "),
        },
      ],
    },
    {
      // PDF endpoint specific - allow more permissive for PDF generation
      source: "/api/cv/:id/pdf",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Content-Disposition",
          value: "attachment",
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
