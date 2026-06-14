import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { BottomSheet } from './BottomSheet';

// Inline SVG icons
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  /** When true, modal becomes a bottom sheet on mobile screens */
  mobileBottomSheet?: boolean;
}

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
  mobileBottomSheet = false,
}: ModalProps) {
  const isMobile = useIsMobile(768);
  const shouldUseBottomSheet = mobileBottomSheet && isMobile;

  // Internal state to track if modal should be visible (handles close animation)
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimatingOut(false);
    } else if (isVisible) {
      // Parent wants to close, start animation
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimatingOut(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Internal close handler - starts animation, then calls parent's onClose
  const handleClose = useCallback(() => {
    if (isAnimatingOut) return; // Prevent double-close
    setIsAnimatingOut(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  }, [onClose, isAnimatingOut]);

  // Handle escape key via React event handler on container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      handleClose();
    }
  };

  // Don't render if not visible
  if (!isVisible) return null;

  // Mobile Bottom Sheet Variant
  if (shouldUseBottomSheet) {
    return (
      <div
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        style={{ outline: 'none' }}
      >
        <BottomSheet
          isOpen={!isAnimatingOut}
          onClose={handleClose}
          title={title}
          subtitle={subtitle}
          showCloseButton={showCloseButton}
          closeOnBackdropClick={closeOnBackdropClick}
        >
          {children}
        </BottomSheet>
      </div>
    );
  }

  // Default Centered Modal (Desktop or when mobileBottomSheet is false)
  return (
    <div
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      style={{ outline: 'none' }}
    >
      <DesktopModal
        isAnimatingOut={isAnimatingOut}
        onClose={handleClose}
        closeOnBackdropClick={closeOnBackdropClick}
        title={title}
        subtitle={subtitle}
        showCloseButton={showCloseButton}
        maxWidth={maxWidth}
      >
        {children}
      </DesktopModal>
    </div>
  );
}

// Simplified desktop modal with animation classes
function DesktopModal({ isAnimatingOut, onClose, closeOnBackdropClick, title, subtitle, showCloseButton, maxWidth, children }: {
  isAnimatingOut: boolean;
  onClose: () => void;
  closeOnBackdropClick: boolean;
  title?: string | ReactNode;
  subtitle?: string;
  showCloseButton: boolean;
  maxWidth: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-200 ${isAnimatingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ${maxWidthClasses[maxWidth]} w-full max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex-1">
              {typeof title === 'string' ? (
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
              ) : (
                title
              )}
              {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
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
