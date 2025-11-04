# Component Documentation

## Overview

This document describes the reusable UI components for the Utility Management System.

---

## Components

### 1. Navbar.tsx

A responsive navigation bar component with user info and logout functionality.

#### Location
`src/components/Navbar.tsx`

#### Props

```typescript
interface NavbarProps {
  userName: string;      // Display name of logged-in user
  userRole: string;      // User role (ADMIN, CLERK, METER_READER, MANAGER)
  onMenuToggle?: () => void;  // Callback for mobile menu toggle
}
```

#### Features

- **Responsive Design**: Adapts to mobile, tablet, and desktop
- **User Info Display**: Shows user name and role badge
- **Role-Based Badge Colors**:
  - ADMIN: Blue
  - CLERK: Green
  - METER_READER: Orange
  - MANAGER: Purple
- **Logout Button**: Clears localStorage and redirects to login
- **Mobile Menu Toggle**: Hamburger menu for mobile devices
- **User Avatar**: Displays first letter of user name
- **Dropdown Menu**: Mobile-only dropdown with user info

#### Usage

```tsx
import Navbar from '@/components/Navbar';

<Navbar
  userName="John Doe"
  userRole="ADMIN"
  onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
/>
```

---

### 2. Sidebar.tsx

A role-based navigation sidebar with active route highlighting.

#### Location
`src/components/Sidebar.tsx`

#### Props

```typescript
interface SidebarProps {
  userRole: 'ADMIN' | 'CLERK' | 'METER_READER' | 'MANAGER';  // User role
  isOpen?: boolean;       // Sidebar open state (mobile)
  onClose?: () => void;   // Callback to close sidebar (mobile)
}
```

#### Features

- **Role-Based Navigation**: Shows only relevant links per role
- **Active Route Highlighting**: Blue background for current page
- **Responsive Design**:
  - Desktop: Fixed sidebar
  - Mobile: Drawer with overlay
- **Icons**: SVG icons for each menu item
- **Help Section**: Footer with support info
- **Smooth Animations**: Slide-in/out transitions

#### Role-Based Menu Items

**ADMIN** (Full Access):
- Dashboard
- Customers
- Meters
- Meter Readings
- Tariffs
- Bills
- Payments
- Reports
- Staff
- Complaints

**CLERK** (Billing Focus):
- Dashboard
- Customers
- Meter Readings
- Bills
- Payments
- Complaints

**METER_READER** (Reading Focus):
- Dashboard
- Meters
- Meter Readings

**MANAGER** (Reports Focus):
- Dashboard
- Bills
- Payments
- Reports

#### Usage

```tsx
import Sidebar from '@/components/Sidebar';

<Sidebar
  userRole="ADMIN"
  isOpen={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
```

---

### 3. DashboardLayout.tsx

A complete layout component that combines Navbar and Sidebar with authentication.

#### Location
`src/components/DashboardLayout.tsx`

#### Props

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;  // Page content
  allowedRoles?: string[];    // Optional: Restrict to specific roles
}
```

#### Features

- **Auto Authentication**: Checks localStorage for token/user
- **Role Protection**: Redirects if user lacks required role
- **Loading State**: Shows spinner during auth check
- **Integrated Navbar & Sidebar**: Pre-configured layout
- **Responsive**: Works on all screen sizes
- **Auto Redirect**: Sends unauthenticated users to login

#### Usage

```tsx
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminDashboard() {
  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <h1>Admin Dashboard Content</h1>
      {/* Your page content here */}
    </DashboardLayout>
  );
}
```

**Without Role Restriction** (allow any authenticated user):

```tsx
<DashboardLayout>
  {/* Content accessible to all authenticated users */}
</DashboardLayout>
```

**With Multiple Allowed Roles**:

```tsx
<DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
  {/* Content for admins and managers only */}
</DashboardLayout>
```

---

## Complete Example

### Creating a New Dashboard Page

```tsx
'use client';

import DashboardLayout from '@/components/DashboardLayout';

export default function CustomersPage() {
  return (
    <DashboardLayout allowedRoles={['ADMIN', 'CLERK']}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">Manage customer accounts</p>
      </div>

      {/* Page Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <p>Customer list goes here...</p>
      </div>
    </DashboardLayout>
  );
}
```

---

## Styling

All components use **Tailwind CSS** for styling.

### Key Design Tokens

#### Colors
- Primary: Blue (`bg-blue-600`, `text-blue-700`)
- Success: Green (`bg-green-500`)
- Warning: Orange (`bg-orange-500`)
- Error: Red (`bg-red-600`)
- Secondary: Purple (`bg-purple-500`)

#### Spacing
- Container padding: `px-4 sm:px-6 lg:px-8`
- Section spacing: `py-8`
- Card padding: `p-6`

#### Rounded Corners
- Small: `rounded-md` (6px)
- Medium: `rounded-lg` (8px)
- Large: `rounded-2xl` (16px)
- Circle: `rounded-full`

#### Shadows
- Default: `shadow`
- Medium: `shadow-md`
- Large: `shadow-xl`

---

## Responsive Breakpoints

Following Tailwind's default breakpoints:

- **sm**: 640px (Mobile landscape)
- **md**: 768px (Tablet)
- **lg**: 1024px (Desktop)
- **xl**: 1280px (Large desktop)

### Sidebar Behavior
- **Mobile (< 1024px)**: Drawer with overlay
- **Desktop (≥ 1024px)**: Fixed sidebar

### Navbar Behavior
- **Mobile**: Shows hamburger menu, user avatar dropdown
- **Desktop**: Shows full user info, logout button

---

## Active Route Highlighting

The Sidebar automatically highlights the active route based on `usePathname()`.

**Active State Styles**:
```css
bg-blue-50          /* Light blue background */
text-blue-700       /* Blue text */
border-l-4          /* Left border */
border-blue-700     /* Blue border */
```

**Inactive State Styles**:
```css
text-gray-700       /* Gray text */
hover:bg-gray-100   /* Gray background on hover */
```

---

## LocalStorage

The components use localStorage for authentication:

### Stored Items
- `token`: JWT authentication token
- `user`: JSON stringified user object
  ```json
  {
    "id": "uuid",
    "username": "admin",
    "name": "John Doe",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
  ```

### Clearing on Logout
```typescript
localStorage.removeItem('token');
localStorage.removeItem('user');
router.push('/login');
```

---

## Icon Library

All icons are inline SVG from [Heroicons](https://heroicons.com/).

### Common Icons Used
- **Dashboard**: Home icon
- **Customers**: Users icon
- **Meters**: Lightning bolt
- **Bills**: Document icon
- **Payments**: Cash icon
- **Reports**: Chart bars
- **Logout**: Arrow right on rectangle

---

## Accessibility

### Features
- **Semantic HTML**: Proper use of nav, aside, main
- **ARIA Labels**: `aria-label` on icon buttons
- **Keyboard Navigation**: Tab-friendly
- **Focus States**: `focus:ring-2` on interactive elements
- **Alt Text**: Descriptive labels for screen readers

---

## Performance

### Optimizations
- **useMemo**: Menu items memoized to prevent recalculation
- **Conditional Rendering**: Desktop/mobile variants
- **Lazy State**: Only render when authenticated
- **Optimized Re-renders**: Minimal prop changes

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Customization

### Changing Colors

Edit the className strings in each component:

```tsx
// Before
className="bg-blue-600 text-white"

// After (Green theme)
className="bg-green-600 text-white"
```

### Adding New Menu Items

Edit `allMenuItems` array in `Sidebar.tsx`:

```tsx
{
  name: 'Settings',
  href: '/settings',
  icon: <svg>...</svg>,
  roles: ['ADMIN'],
}
```

### Customizing Role Badge Colors

Edit `getRoleBadgeColor` function in `Navbar.tsx`:

```tsx
const colors: Record<string, string> = {
  ADMIN: 'bg-blue-100 text-blue-800',
  CUSTOM_ROLE: 'bg-pink-100 text-pink-800',  // Add custom role
};
```

---

## Troubleshooting

### Sidebar not showing on mobile
- Ensure `isOpen` prop is being controlled
- Check that `onClose` callback is provided

### Active route not highlighting
- Verify route matches `href` in menu items
- Check `usePathname()` is returning correct path

### User redirected to login immediately
- Check localStorage has `token` and `user`
- Verify role matches `allowedRoles` prop

### Components not rendering
- Ensure Tailwind CSS is configured
- Check imports are correct (`@/components/...`)

---

## Future Enhancements

Potential improvements:

1. **Dark Mode Support**: Add theme toggle
2. **Notifications Badge**: Show unread count
3. **Search Bar**: Global search in navbar
4. **Breadcrumbs**: Show current path
5. **User Profile Dropdown**: More user options
6. **Keyboard Shortcuts**: Quick navigation
7. **Favorites**: Pin frequently used pages

---

## Support

For issues or questions:
- Check this documentation
- Review example implementations
- Inspect browser console for errors
- Verify localStorage contents

---

**Version**: 1.0.0
**Last Updated**: November 2025
