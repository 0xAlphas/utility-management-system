'use client';

import toast from 'react-hot-toast';

/**
 * Toast with Action Button Component
 * For cases where you need a toast with a clickable action button
 */

interface ToastWithActionProps {
  message: string;
  actionLabel: string;
  onAction: () => void;
  toastId: string;
}

export function ToastWithActionContent({ message, actionLabel, onAction, toastId }: ToastWithActionProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{message}</span>
      <button
        onClick={() => {
          onAction();
          toast.dismiss(toastId);
        }}
        className="px-3 py-1 bg-white text-gray-900 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Helper function to show toast with action button
 * Usage:
 *
 * showToastWithAction(
 *   'Item deleted',
 *   'Undo',
 *   () => { restoreItem(); },
 *   { duration: 5000, type: 'success' }
 * );
 */
export const showToastWithAction = (
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
      <ToastWithActionContent
        message={message}
        actionLabel={actionLabel}
        onAction={actionFn}
        toastId={t.id}
      />
    ),
    { duration }
  );
};
