import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-based route mapping
const ROLE_ROUTES: Record<string, string[]> = {
  ADMIN: ['/dashboard/admin', '/dashboard/clerk', '/dashboard/reader', '/dashboard/manager'],
  CLERK: ['/dashboard/clerk'],
  METER_READER: ['/dashboard/reader'],
  MANAGER: ['/dashboard/manager'],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/test-login', '/'];

// API routes that should not be redirected
const API_ROUTES = ['/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    API_ROUTES.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next();
  }

  // Allow access to public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check if route requires authentication (any dashboard route)
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (isDashboardRoute) {
    // Get token from cookies (we'll set this on login)
    const token = request.cookies.get('token')?.value;

    if (!token) {
      // No token, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get user role from cookies
    const userRole = request.cookies.get('userRole')?.value;

    if (!userRole) {
      // No role found, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has access to this route
    const allowedRoutes = ROLE_ROUTES[userRole] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));

    if (!hasAccess) {
      // User doesn't have access, redirect to their default dashboard
      const defaultRoute = getDefaultRouteForRole(userRole);
      if (defaultRoute && pathname !== defaultRoute) {
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }

      // If no default route or already on default route, show forbidden
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard/admin';
    case 'CLERK':
      return '/dashboard/clerk';
    case 'METER_READER':
      return '/dashboard/reader';
    case 'MANAGER':
      return '/dashboard/manager';
    default:
      return '/login';
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
