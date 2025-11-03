'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { getAuthData, hasRouteAccess, getDefaultRouteForRole, clearAuthData } from '@/lib/auth-client';

interface DashboardLayoutProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function DashboardLayout({ children, allowedRoles }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const { token, user: userData } = getAuthData();

      // No token or user data - redirect to login
      if (!token || !userData) {
        clearAuthData();
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check if user has required role for this page
      if (allowedRoles && !allowedRoles.includes(userData.role)) {
        setAccessDenied(true);
        setLoading(false);

        // Redirect to user's default dashboard after 2 seconds
        setTimeout(() => {
          const defaultRoute = getDefaultRouteForRole(userData.role);
          router.push(defaultRoute);
        }, 2000);
        return;
      }

      // Additional check: verify route access
      if (!hasRouteAccess(userData.role, pathname)) {
        setAccessDenied(true);
        setLoading(false);

        // Redirect to user's default dashboard
        setTimeout(() => {
          const defaultRoute = getDefaultRouteForRole(userData.role);
          router.push(defaultRoute);
        }, 2000);
        return;
      }

      setUser(userData);
      setLoading(false);
    };

    checkAuth();
  }, [router, pathname, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Redirecting to your dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        userName={user.name}
        userRole={user.role}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Container */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar
          userRole={user.role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
