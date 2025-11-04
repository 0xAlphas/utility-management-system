# Role-Based Route Protection - Implementation Guide

This document explains the comprehensive role-based authentication and route protection system implemented in the Utility Management System.

## Overview

The system implements a **hybrid authentication approach** using both:
1. **Server-side middleware** (Next.js middleware with cookies)
2. **Client-side protection** (React components with localStorage)

This dual-layer approach provides robust security at both the network and application levels.

## Architecture

### 1. Server-Side Protection (Middleware)

**File:** `src/middleware.ts`

The Next.js middleware intercepts all requests and:
- Checks for authentication tokens in cookies
- Validates user roles for protected routes
- Redirects unauthorized users to login
- Redirects users to their appropriate dashboard if they try to access unauthorized routes

**Protected Routes:**
```
/dashboard/admin      → ADMIN only (can also access all other dashboards)
/dashboard/clerk      → CLERK only
/dashboard/reader     → METER_READER only
/dashboard/manager    → MANAGER only
```

**Public Routes:**
- `/login`
- `/test-login`
- `/` (home)
- `/api/*` (API routes handled separately)

### 2. Client-Side Protection (DashboardLayout)

**File:** `src/components/DashboardLayout.tsx`

The `DashboardLayout` component provides client-side authentication checks:
- Validates JWT token and user data from localStorage
- Checks user role against `allowedRoles` prop
- Shows access denied screen if unauthorized
- Redirects to appropriate dashboard after 2 seconds

### 3. Authentication Utilities

**File:** `src/lib/auth-client.ts`

Provides centralized authentication functions:

```typescript
// Set auth data (localStorage + cookies)
setAuthData(token: string, user: UserData): void

// Get auth data from localStorage
getAuthData(): { token: string | null; user: UserData | null }

// Clear auth data and logout
clearAuthData(): void

// Check if user is authenticated
isAuthenticated(): boolean

// Get default route for role
getDefaultRouteForRole(role: string): string

// Check route access permission
hasRouteAccess(userRole: string, routePath: string): boolean

// Logout and redirect
logout(): void
```

## How It Works

### Login Flow

1. User submits credentials to `/api/auth/login`
2. Server validates and returns JWT token + user data
3. Client calls `setAuthData()` which:
   - Saves token and user to **localStorage**
   - Sets token, userRole, and userId in **cookies**
4. User is redirected to their role-based dashboard

### Route Access Flow

#### Server-Side (Middleware)
```
Request → Middleware checks cookies →
  No token? → Redirect to /login
  Has token? → Check role access →
    Allowed? → Proceed to page
    Denied? → Redirect to user's default dashboard
```

#### Client-Side (DashboardLayout)
```
Component mounts → Check localStorage →
  No data? → Clear cookies → Redirect to /login
  Has data? → Check allowedRoles →
    Allowed? → Render page
    Denied? → Show access denied → Redirect after 2s
```

### Logout Flow

1. User clicks logout in Navbar
2. `logout()` function called
3. Clears localStorage
4. Clears cookies
5. Redirects to `/login`

## Role Permissions

### ADMIN
- Full access to all dashboards
- Can view: Admin, Clerk, Reader, Manager dashboards

### CLERK
- Access: Clerk dashboard only
- Manage bills, payments, customers

### METER_READER
- Access: Reader dashboard only
- Record meter readings

### MANAGER
- Access: Manager dashboard only
- View reports, analytics, charts

## Usage Examples

### Protecting a New Dashboard Page

```typescript
// src/app/dashboard/new-page/page.tsx
'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function NewPage() {
  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Your page content */}
      <h1>Protected Content</h1>
    </DashboardLayout>
  );
}
```

### Checking Auth in Components

```typescript
import { isAuthenticated, getAuthData, hasRouteAccess } from '@/lib/auth-client';

function MyComponent() {
  const { user } = getAuthData();

  if (!isAuthenticated()) {
    return <div>Please login</div>;
  }

  const canAccessAdmin = hasRouteAccess(user.role, '/dashboard/admin');

  return <div>Welcome {user.name}!</div>;
}
```

### Manual Logout

```typescript
import { logout } from '@/lib/auth-client';

function LogoutButton() {
  return (
    <button onClick={logout}>
      Logout
    </button>
  );
}
```

## Security Features

### ✅ Implemented

1. **Dual-layer protection** (server + client)
2. **JWT token validation** on both sides
3. **Role-based access control** (RBAC)
4. **Automatic redirects** for unauthorized access
5. **Token stored in cookies** for server-side checks
6. **Token stored in localStorage** for client-side checks
7. **Access denied screens** with auto-redirect
8. **Protected API routes** (separate authentication)
9. **Redirect after login** to appropriate dashboard
10. **Redirect preservation** (can return to requested page after login)

### 🔒 Additional Recommendations

For production, consider adding:

1. **Token expiration** and refresh logic
2. **HTTPS-only cookies** (`Secure` flag)
3. **CSRF protection** for form submissions
4. **Rate limiting** on login endpoint
5. **Session management** with token blacklist
6. **Audit logging** for authentication events

## Testing

### Test Different Roles

1. **Admin:** Login with `admin / password123`
   - Try accessing all dashboards ✅

2. **Clerk:** Login with `clerk01 / password123`
   - Try accessing `/dashboard/clerk` ✅
   - Try accessing `/dashboard/admin` ❌ (should redirect)

3. **Reader:** Login with `reader01 / password123`
   - Try accessing `/dashboard/reader` ✅
   - Try accessing `/dashboard/manager` ❌ (should redirect)

4. **Manager:** Login with `manager01 / password123`
   - Try accessing `/dashboard/manager` ✅
   - Try accessing `/dashboard/clerk` ❌ (should redirect)

### Test Unauthenticated Access

1. Clear cookies and localStorage
2. Try accessing `/dashboard/admin`
3. Should redirect to `/login?redirect=/dashboard/admin`
4. After login, should return to `/dashboard/admin`

## Files Modified/Created

### Created:
- ✅ `src/middleware.ts` - Server-side route protection
- ✅ `src/lib/auth-client.ts` - Authentication utilities
- ✅ `AUTH_PROTECTION.md` - This documentation

### Modified:
- ✅ `src/components/DashboardLayout.tsx` - Enhanced client-side protection
- ✅ `src/components/Navbar.tsx` - Use centralized logout
- ✅ `src/app/login/page.tsx` - Set cookies on login
- ✅ `src/app/api/reports/*/route.ts` - Fixed role imports (use strings instead of enum)

## Troubleshooting

### Issue: "Access Denied" after login
**Solution:** Check that the user's role matches the `allowedRoles` in DashboardLayout

### Issue: Redirected to login when already logged in
**Solution:** Check browser console for token validation errors. Clear cookies and localStorage, then login again.

### Issue: Can access wrong dashboard
**Solution:** Check middleware.ts ROLE_ROUTES mapping and ensure cookies are being set correctly.

### Issue: Infinite redirect loop
**Solution:** Ensure `/login` is in PUBLIC_ROUTES in middleware.ts

## Summary

The system now has comprehensive role-based route protection with:
- ✅ Server-side middleware protection (cookies)
- ✅ Client-side component protection (localStorage)
- ✅ Role-based access control
- ✅ Automatic redirects
- ✅ Access denied screens
- ✅ Centralized auth utilities
- ✅ Clean logout flow

All dashboard pages are now protected and users can only access routes appropriate for their role!
