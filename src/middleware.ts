import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

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

  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.') // Static files
  ) {
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
  // - API routes
  // - Static files (images, fonts, etc.)
  // - Next.js internal routes
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
