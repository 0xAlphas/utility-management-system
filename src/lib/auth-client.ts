

export interface UserData {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
}

// Role-based route mapping
export const ROLE_ROUTES: Record<string, string> = {
  ADMIN: '/dashboard/admin',
  CLERK: '/dashboard/clerk',
  METER_READER: '/dashboard/reader',
  MANAGER: '/dashboard/manager',
};

/**
 * Set authentication data in localStorage and cookies
 */
export function setAuthData(token: string, user: UserData): void {
  // Set in localStorage for client-side access
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Set in cookies for server-side middleware
  // Using document.cookie for client-side cookie setting
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `userRole=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `userId=${user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Get authentication data from localStorage
 */
export function getAuthData(): { token: string | null; user: UserData | null } {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  let user: UserData | null = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }

  return { token, user };
}

/**
 * Clear authentication data from localStorage and cookies
 */
export function clearAuthData(): void {
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Clear cookies
  document.cookie = 'token=; path=/; max-age=0';
  document.cookie = 'userRole=; path=/; max-age=0';
  document.cookie = 'userId=; path=/; max-age=0';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const { token, user } = getAuthData();
  return !!(token && user);
}

/**
 * Get default route for a given role
 */
export function getDefaultRouteForRole(role: string): string {
  return ROLE_ROUTES[role] || '/login';
}

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(userRole: string, routePath: string): boolean {
  const roleAccessMap: Record<string, string[]> = {
    ADMIN: [
      '/dashboard/admin',
      '/dashboard/clerk',
      '/dashboard/reader',
      '/dashboard/manager',
      '/customers',
      '/meters',
      '/readings',
      '/tariffs',
      '/bills',
      '/payments',
      '/reports',
      '/staff',
      '/complaints',
      '/contact',
    ],
    CLERK: [
      '/dashboard/clerk',
      '/customers',
      '/readings',
      '/bills',
      '/payments',
      '/complaints',
      '/contact',
    ],
    METER_READER: [
      '/dashboard/reader',
      '/meters',
      '/readings',
      '/contact',
    ],
    MANAGER: [
      '/dashboard/manager',
      '/bills',
      '/payments',
      '/reports',
      '/contact',
    ],
  };

  const allowedRoutes = roleAccessMap[userRole] || [];
  return allowedRoutes.some(route => routePath.startsWith(route));
}

/**
 * Logout user and redirect to login
 */
export function logout(): void {
  clearAuthData();
  window.location.href = '/login';
}
