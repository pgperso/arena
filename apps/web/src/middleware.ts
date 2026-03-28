import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), autoplay=(self)',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://pagead2.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google",
    "font-src 'self'",
    "media-src 'self' https://*.supabase.co",
    "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://*.adtrafficquality.google https://www.youtube.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://pagead2.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.googlesyndication.com https://*.adtrafficquality.google",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Merge nonce into request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Run i18n middleware first (handles locale detection + redirect)
  const intlResponse = intlMiddleware(request);

  // If intl middleware redirects, apply security headers and return
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      intlResponse.headers.set(key, value);
    }
    intlResponse.headers.set('Content-Security-Policy', buildCsp(nonce));
    return intlResponse;
  }

  // Run Supabase session middleware
  const response = await updateSession(request, requestHeaders);

  // Security headers
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|api/|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|ico)$).*)',
  ],
};
