import toast from 'react-hot-toast';

/**
 * Toast Utility Functions
 * Provides convenient wrappers around react-hot-toast for common use cases
 */

// Basic toast notifications
export const showToast = {
  /**
   * Show a success toast message
   */
  success: (message: string, duration?: number) => {
    return toast.success(message, { duration });
  },

  /**
   * Show an error toast message
   */
  error: (message: string, duration?: number) => {
    return toast.error(message, { duration });
  },

  /**
   * Show a loading toast message
   */
  loading: (message: string) => {
    return toast.loading(message);
  },

  /**
   * Show an info toast message (custom)
   */
  info: (message: string, duration?: number) => {
    return toast(message, {
      icon: 'ℹ️',
      duration,
      style: {
        background: '#3b82f6',
        color: '#fff',
      },
    });
  },

  /**
   * Show a warning toast message (custom)
   */
  warning: (message: string, duration?: number) => {
    return toast(message, {
      icon: '⚠️',
      duration,
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    toast.dismiss();
  },
};

/**
 * Promise-based toast for async operations
 * Shows loading state while promise is pending, then success or error
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: any) => string);
  }
) => {
  return toast.promise(promise, messages);
};

/**
 * API request wrapper with automatic toast notifications
 * Handles common API request patterns with loading, success, and error toasts
 */
export const toastApiRequest = async <T,>(
  requestFn: () => Promise<Response>,
  options: {
    loadingMessage?: string;
    successMessage?: string | ((data: T) => string);
    errorMessage?: string | ((error: any) => string);
    showLoading?: boolean;
    showSuccess?: boolean;
    showError?: boolean;
  } = {}
): Promise<T> => {
  const {
    loadingMessage = 'Processing...',
    successMessage = 'Success!',
    errorMessage = 'An error occurred',
    showLoading = true,
    showSuccess = true,
    showError = true,
  } = options;

  let toastId: string | undefined;

  try {
    // Show loading toast
    if (showLoading) {
      toastId = showToast.loading(loadingMessage);
    }

    // Execute the request
    const response = await requestFn();
    const data = await response.json();

    // Dismiss loading toast
    if (toastId) {
      showToast.dismiss(toastId);
    }

    // Handle response
    if (!response.ok) {
      const errorMsg =
        typeof errorMessage === 'function'
          ? errorMessage(data)
          : data.error || errorMessage;

      if (showError) {
        showToast.error(errorMsg);
      }
      throw new Error(errorMsg);
    }

    // Show success toast
    if (showSuccess) {
      const successMsg =
        typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage;
      showToast.success(successMsg);
    }

    return data;
  } catch (error) {
    // Dismiss loading toast
    if (toastId) {
      showToast.dismiss(toastId);
    }

    // Show error toast if not already shown
    if (showError && !(error instanceof Error && error.message)) {
      const errorMsg =
        typeof errorMessage === 'function'
          ? errorMessage(error)
          : errorMessage;
      showToast.error(errorMsg);
    }

    throw error;
  }
};

/**
 * Common toast messages for CRUD operations
 */
export const toastMessages = {
  // Create operations
  created: (entity: string) => `${entity} created successfully!`,
  createError: (entity: string) => `Failed to create ${entity}`,

  // Update operations
  updated: (entity: string) => `${entity} updated successfully!`,
  updateError: (entity: string) => `Failed to update ${entity}`,

  // Delete operations
  deleted: (entity: string) => `${entity} deleted successfully!`,
  deleteError: (entity: string) => `Failed to delete ${entity}`,

  // Read operations
  loaded: (entity: string) => `${entity} loaded successfully!`,
  loadError: (entity: string) => `Failed to load ${entity}`,

  // Generic operations
  saved: () => 'Changes saved successfully!',
  saveError: () => 'Failed to save changes',

  // Authentication
  loginSuccess: () => 'Logged in successfully!',
  loginError: () => 'Login failed. Please check your credentials.',
  logoutSuccess: () => 'Logged out successfully!',

  // Validation
  validationError: () => 'Please check the form for errors',

  // Network
  networkError: () => 'Network error. Please check your connection.',

  // Permissions
  permissionDenied: () => 'You do not have permission to perform this action',
};

/**
 * Custom toast with action button
 */
export const toastWithAction = (
  message: string,
  actionLabel: string,
  actionFn: () => void,
  options?: {
    duration?: number;
    type?: 'success' | 'error' | 'default';
  }
) => {
  const { duration = 5000, type = 'default' } = options || {};

  const toastFn = type === 'success' ? toast.success : type === 'error' ? toast.error : toast;

  return toastFn(
    (t) => (
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button
          onClick={() => {
            actionFn();
            toast.dismiss(t.id);
          }}
          className="px-3 py-1 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          {actionLabel}
        </button>
      </div>
    ),
    { duration }
  );
};
