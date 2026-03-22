import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/** Strip locale prefix from pathname for route matching */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(fr|en)(\/.*)?$/);
  return match ? (match[2] || '/') : pathname;
}

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? request.headers;
  let supabaseResponse = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request: { headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cleanPath = stripLocale(request.nextUrl.pathname);

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/vestiaire', '/admin'];
  const isProtected = protectedPaths.some((path) => cleanPath.startsWith(path));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Don't redirect away from update-password
  if (cleanPath.startsWith('/update-password')) return supabaseResponse;

  // Redirect logged-in users away from auth pages
  const authPaths = ['/login', '/register', '/reset-password'];
  const isAuthPage = authPaths.some((path) => cleanPath.startsWith(path));

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
