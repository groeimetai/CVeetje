import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

// Allowed origins for CORS (comma-separated in env var)
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    origins.push(...envOrigins.split(',').map(o => o.trim()).filter(Boolean));
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    origins.push(appUrl.replace(/\/$/, ''));
  }
  return origins;
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = getAllowedOrigins();
  // If no origins are configured, allow all (development-friendly)
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}

function setCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  return response;
}

// Routes that require authentication (after locale prefix)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profiles',
  '/settings',
  '/cv',
  '/admin',  // Admin routes (role check done in layout)
];

// Routes that should redirect authenticated users away (after locale prefix)
const AUTH_ROUTES = [
  '/login',
  '/register',
];

/**
 * Check if a path matches any of the protected routes
 */
function isProtectedRoute(pathname: string): boolean {
  // Remove locale prefix (/nl, /en, etc.)
  const pathWithoutLocale = pathname.replace(/^\/(nl|en)/, '');
  return PROTECTED_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );
}

/**
 * Check if a path is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  const pathWithoutLocale = pathname.replace(/^\/(nl|en)/, '');
  return AUTH_ROUTES.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );
}

/**
 * Get the locale from the pathname
 */
function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/(nl|en)/);
  return match ? match[1] : 'nl';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');

  // Handle API routes - add CORS headers
  if (pathname.startsWith('/api')) {
    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      return setCorsHeaders(response, origin);
    }

    // For actual API requests, add CORS headers
    const response = NextResponse.next();
    return setCorsHeaders(response, origin);
  }

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Next.js metadata routes (opengraph-image.tsx / twitter-image.tsx) live on
  // the app root and are not locale-aware. Without intervention next-intl
  // would 307 `/opengraph-image` → `/nl/opengraph-image` (which 404s — the
  // metadata file only exists at the root). We do two things here:
  // 1. Skip the intl middleware entirely when the request is already at
  //    `/opengraph-image` so it gets served directly.
  // 2. Rewrite any locale-prefixed variant (`/nl/opengraph-image`) to the
  //    root path so crawlers like bingbot that follow the previous 307
  //    still resolve to a 200.
  const metadataMatch = pathname.match(/^\/(nl|en)\/(opengraph-image|twitter-image)$/);
  if (metadataMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/${metadataMatch[2]}`;
    return NextResponse.rewrite(url);
  }
  if (pathname === '/opengraph-image' || pathname === '/twitter-image') {
    return NextResponse.next();
  }

  // Check for authentication token
  const token = request.cookies.get('firebase-token')?.value;
  const hasAuth = !!token;

  // Handle protected routes - redirect to login if not authenticated
  if (isProtectedRoute(pathname) && !hasAuth) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Add the original URL as redirect parameter
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle auth routes - redirect to dashboard if already authenticated
  if (isAuthRoute(pathname) && hasAuth) {
    const locale = getLocaleFromPath(pathname);
    // Check if there's a redirect parameter
    const redirect = request.nextUrl.searchParams.get('redirect');
    if (redirect && isProtectedRoute(redirect)) {
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // Run the intl middleware for all other cases
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except:
  // - Static files (images, fonts, etc.)
  // - Next.js internal routes
  // Note: API routes are included for CORS handling
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
