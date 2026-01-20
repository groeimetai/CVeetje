import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Set turbopack root to this project directory
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Configure for puppeteer/chromium
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // Security headers
  headers: async () => [
    {
      // Apply to all routes
      source: "/:path*",
      headers: [
        // Prevent clickjacking
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://www.google.com https://www.gstatic.com",
            // Allow styles from self, inline, and Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            // Allow fonts from self and Google Fonts
            "font-src 'self' https://fonts.gstatic.com data:",
            // Allow images from various sources (avatars, Firebase Storage, etc.)
            "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://media.licdn.com https://*.licdn.com https://avatars.githubusercontent.com https://pbs.twimg.com",
            // Allow connections to Firebase, AI providers, and Mollie
            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.groq.com https://api.mollie.com https://fonts.googleapis.com https://fonts.gstatic.com",
            // Allow frames for Firebase Auth and reCAPTCHA
            "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://www.google.com https://recaptcha.google.com",
            // Form submissions only to self
            "form-action 'self'",
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
