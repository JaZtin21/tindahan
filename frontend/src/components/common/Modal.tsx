import { useEffect, type ReactNode } from 'react';

// Inline SVG icons
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with title - Sticky */}
        {(title || subtitle || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div>
              {title && (
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
              )}
              {subtitle && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <XIcon className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>
            )}
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Dropdown Menu Component for 3-dot menus
interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
}

export function DropdownMenu({ isOpen, onClose, children, align = 'right' }: DropdownMenuProps) {
  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-menu')) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClick);
    }

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`dropdown-menu absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50`}
    >
      {children}
    </div>
  );
}

// Dropdown Menu Item
interface DropdownItemProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'default' | 'danger';
  icon?: ReactNode;
}

export function DropdownItem({ onClick, children, variant = 'default', icon }: DropdownItemProps) {
  const baseClasses = 'w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors';
  const variantClasses = {
    default: 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700',
    danger: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}>
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
}
