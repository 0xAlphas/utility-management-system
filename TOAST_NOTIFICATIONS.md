# Toast Notification System - Usage Guide

This document explains how to use the toast notification system in the Utility Management System.

## Overview

We use **react-hot-toast** - a lightweight, customizable toast notification library that provides elegant notifications for user feedback.

## Architecture

### Components

1. **ToastProvider** (`src/components/ToastProvider.tsx`)
   - Wraps the Toaster component with custom configuration
   - Already included in root layout - no need to add manually

2. **Toast Utilities** (`src/lib/toast.ts`)
   - Convenient wrapper functions for common use cases
   - Import these in your components

## Installation

Already installed! The system is configured and ready to use in all pages.

## Basic Usage

### Import the Toast Functions

```typescript
import { showToast } from '@/lib/toast';
```

### Show Simple Toasts

```typescript
// Success toast
showToast.success('Operation completed successfully!');

// Error toast
showToast.error('Something went wrong!');

// Warning toast
showToast.warning('Please check your input');

// Info toast
showToast.info('Did you know...?');

// Loading toast
const toastId = showToast.loading('Processing...');
// Later, dismiss it
showToast.dismiss(toastId);
```

### Custom Duration

```typescript
// Show for 5 seconds instead of default 4
showToast.success('Saved!', 5000);
showToast.error('Failed!', 6000);
```

## Advanced Usage

### Loading → Success/Error Pattern

This is the most common pattern for async operations:

```typescript
const handleSubmit = async () => {
  // Show loading toast
  const toastId = showToast.loading('Saving...');

  try {
    await fetch('/api/save', { method: 'POST', ... });

    // Dismiss loading toast
    showToast.dismiss(toastId);

    // Show success
    showToast.success('Saved successfully!');
  } catch (error) {
    // Dismiss loading toast
    showToast.dismiss(toastId);

    // Show error
    showToast.error('Failed to save');
  }
};
```

### Promise-Based Toast

For promises, use `toastPromise`:

```typescript
import { toastPromise } from '@/lib/toast';

const saveData = fetch('/api/save', { method: 'POST' });

toastPromise(saveData, {
  loading: 'Saving...',
  success: 'Saved successfully!',
  error: 'Failed to save',
});
```

### API Request Wrapper

Use `toastApiRequest` for automatic toast handling:

```typescript
import { toastApiRequest } from '@/lib/toast';

const handleSubmit = async () => {
  try {
    const data = await toastApiRequest(
      () => fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ... }),
      }),
      {
        loadingMessage: 'Generating bill...',
        successMessage: (data) => `Bill ${data.billNumber} created!`,
        errorMessage: 'Failed to generate bill',
      }
    );

    // Handle success
    console.log(data);
  } catch (error) {
    // Error already shown via toast
  }
};
```

### Common Messages

Use predefined messages for consistency:

```typescript
import { toastMessages } from '@/lib/toast';

// CRUD operations
showToast.success(toastMessages.created('Bill'));
showToast.error(toastMessages.createError('Payment'));
showToast.success(toastMessages.updated('Customer'));
showToast.error(toastMessages.deleteError('Meter'));

// Auth operations
showToast.success(toastMessages.loginSuccess());
showToast.error(toastMessages.loginError());

// Validation
showToast.warning(toastMessages.validationError());

// Network
showToast.error(toastMessages.networkError());
```

### Toast with Action Button

For toasts with action buttons (like "Undo"), use the separate component:

```typescript
import { showToastWithAction } from '@/components/ToastWithAction';

showToastWithAction(
  'Item deleted',
  'Undo',
  () => {
    // Undo action
    restoreItem();
  },
  { duration: 5000, type: 'success' }
);
```

## Real-World Examples

### Example 1: Form Submission (Clerk Dashboard)

```typescript
import { showToast } from '@/lib/toast';

const handleGenerateBill = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast.warning('Please fill in all required fields');
    return;
  }

  const toastId = showToast.loading('Generating bill...');

  try {
    const response = await fetch('/api/bills', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    showToast.dismiss(toastId);

    if (!response.ok) {
      throw new Error(data.error);
    }

    showToast.success(`Bill ${data.billNumber} generated successfully!`);
    closeModal();
    refreshData();
  } catch (error) {
    showToast.dismiss(toastId);
    showToast.error(error.message || 'Failed to generate bill');
  }
};
```

### Example 2: Meter Reading Submission

```typescript
import { showToast } from '@/lib/toast';

const handleSubmitReading = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateReading()) {
    showToast.warning('Please check the reading value');
    return;
  }

  const toastId = showToast.loading('Submitting reading...');

  try {
    const response = await fetch('/api/readings', {
      method: 'POST',
      body: JSON.stringify(readingData),
    });

    showToast.dismiss(toastId);

    if (!response.ok) {
      throw new Error('Failed to submit');
    }

    showToast.success('Reading submitted successfully!');
    closeForm();
  } catch (error) {
    showToast.dismiss(toastId);
    showToast.error(error.message);
  }
};
```

### Example 3: Delete Confirmation

```typescript
import { showToast } from '@/lib/toast';
import { showToastWithAction } from '@/components/ToastWithAction';

const handleDelete = async (id: string) => {
  const toastId = showToast.loading('Deleting...');

  try {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });

    showToast.dismiss(toastId);

    // Show success with undo option
    showToastWithAction(
      'Item deleted',
      'Undo',
      async () => {
        await fetch(`/api/items/${id}/restore`, { method: 'POST' });
        showToast.success('Item restored');
        refreshData();
      },
      { duration: 5000 }
    );

    refreshData();
  } catch (error) {
    showToast.dismiss(toastId);
    showToast.error('Failed to delete item');
  }
};
```

### Example 4: Batch Operations

```typescript
import { showToast } from '@/lib/toast';

const handleBatchUpdate = async (items: string[]) => {
  const toastId = showToast.loading(`Updating ${items.length} items...`);

  try {
    const results = await Promise.all(
      items.map(id => fetch(`/api/items/${id}`, { method: 'PATCH' }))
    );

    const successCount = results.filter(r => r.ok).length;
    const failCount = items.length - successCount;

    showToast.dismiss(toastId);

    if (failCount === 0) {
      showToast.success(`All ${successCount} items updated successfully!`);
    } else {
      showToast.warning(
        `${successCount} items updated, ${failCount} failed`,
        6000
      );
    }
  } catch (error) {
    showToast.dismiss(toastId);
    showToast.error('Batch update failed');
  }
};
```

## Customization

### Toast Position

Change in `ToastProvider.tsx`:

```typescript
<Toaster
  position="top-right"  // or "top-left", "bottom-right", etc.
  ...
/>
```

### Toast Duration

```typescript
// Default duration (in toast.ts)
duration: 4000,  // 4 seconds

// Per toast
showToast.success('Message', 5000);  // 5 seconds
```

### Custom Styles

Modify styles in `ToastProvider.tsx`:

```typescript
toastOptions={{
  style: {
    background: '#363636',
    color: '#fff',
    borderRadius: '10px',
    padding: '16px',
  },
  success: {
    style: {
      background: '#10b981',  // Customize color
    },
  },
}}
```

## Best Practices

### ✅ DO

- Use loading toasts for async operations
- Dismiss loading toasts before showing success/error
- Use appropriate toast types (success, error, warning)
- Keep messages concise and user-friendly
- Use predefined messages for consistency

### ❌ DON'T

- Don't show multiple toasts for the same action
- Don't use toasts for critical errors (use modals instead)
- Don't forget to dismiss loading toasts
- Don't use very long messages
- Don't show toasts too frequently (can be annoying)

## Toast Types Reference

| Type | Use Case | Icon | Color |
|------|----------|------|-------|
| `success` | Operation completed successfully | ✓ | Green |
| `error` | Operation failed | ✗ | Red |
| `loading` | Operation in progress | ⟳ | Blue |
| `warning` | User should be aware of something | ⚠ | Orange |
| `info` | General information | ℹ | Blue |

## API Reference

### `showToast`

```typescript
showToast.success(message: string, duration?: number)
showToast.error(message: string, duration?: number)
showToast.loading(message: string) → returns toastId
showToast.warning(message: string, duration?: number)
showToast.info(message: string, duration?: number)
showToast.dismiss(toastId: string)
showToast.dismissAll()
```

### `toastPromise`

```typescript
toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: any) => string);
  }
)
```

### `toastApiRequest`

```typescript
toastApiRequest<T>(
  requestFn: () => Promise<Response>,
  options?: {
    loadingMessage?: string;
    successMessage?: string | ((data: T) => string);
    errorMessage?: string | ((error: any) => string);
    showLoading?: boolean;
    showSuccess?: boolean;
    showError?: boolean;
  }
)
```

### `showToastWithAction` (from ToastWithAction component)

```typescript
showToastWithAction(
  message: string,
  actionLabel: string,
  actionFn: () => void,
  options?: {
    duration?: number;
    type?: 'success' | 'error' | 'default';
  }
)
```

## Migration Guide

### Before (Alert-based)

```typescript
try {
  await submitForm();
  alert('Success!');
} catch (error) {
  alert('Error: ' + error.message);
}
```

### After (Toast-based)

```typescript
import { showToast } from '@/lib/toast';

try {
  await submitForm();
  showToast.success('Success!');
} catch (error) {
  showToast.error('Error: ' + error.message);
}
```

## Troubleshooting

### Toast not showing

1. Ensure `ToastProvider` is in `layout.tsx`
2. Check that you're importing from `@/lib/toast`
3. Verify the component is a Client Component (`'use client'`)

### Toast showing twice

- You might be calling the function twice
- Check for duplicate event handlers

### Toast not dismissing

- Make sure you're calling `showToast.dismiss(toastId)` with the correct ID
- The ID is returned from `showToast.loading()`

## Summary

The toast notification system provides:
- ✅ Beautiful, animated notifications
- ✅ Multiple toast types (success, error, warning, info, loading)
- ✅ Easy-to-use API
- ✅ Promise-based handling
- ✅ Custom styling
- ✅ Action buttons support
- ✅ Already integrated in all dashboard pages

Use toasts to provide instant feedback to users for all actions!
