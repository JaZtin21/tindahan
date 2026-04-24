import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onConfirm?: () => void;
  showCancel?: boolean;
}

export function Modal({ isOpen, onClose, title, message, type, onConfirm, showCancel }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      icon: '✓',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
    },
    error: {
      icon: '✕',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
    info: {
      icon: 'ℹ',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
  };

  const styles = typeStyles[type];
  const defaultTitle = type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={`relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full transform transition-all ${styles.border} border`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-5 h-5 text-zinc-500 dark:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}
            >
              <span className={`text-2xl font-bold ${styles.iconColor}`}>
                {styles.icon}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {title || defaultTitle}
            </h3>

            {/* Message */}
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {message}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              {showCancel && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg font-medium transition-colors bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={onConfirm || onClose}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  onConfirm
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : type === 'success'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : type === 'error'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {onConfirm ? 'Delete' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
