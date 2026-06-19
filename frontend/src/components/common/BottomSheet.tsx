import { useState, useRef, useEffect, useCallback, memo, type ReactNode, forwardRef, useImperativeHandle } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string | ReactNode;
  subtitle?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

export interface BottomSheetRef {
  animateClose: () => void;
}

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  showCloseButton = true,
  closeOnBackdropClick = true,
}, ref) => {
  const isMobile = useIsMobile(768);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(100);
  const contentRef = useRef<HTMLDivElement>(null);

  // Drag state stored in refs to avoid re-renders during drag
  const dragState = useRef({
    startY: 0,
    startTranslateY: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  const animateToSnap = useCallback((targetTranslateY: number, shouldClose = false) => {
    setIsAnimating(true);
    setTranslateY(targetTranslateY);

    if (shouldClose) {
      onClose();
    }

    setTimeout(() => setIsAnimating(false), 300);
  }, [onClose]);

  // Expose animateClose function to parent
  useImperativeHandle(ref, () => ({
    animateClose: () => {
      animateToSnap(100, true);
    }
  }), [animateToSnap]);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setTranslateY(100); // Starts offscreen at the bottom

      // Fix: Animate to 0 instead of 5
      const timer = setTimeout(() => setTranslateY(0), 10);
      setTimeout(() => setIsAnimating(false), 310);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Drag handlers
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setIsAnimating(false);
    dragState.current = {
      startY: clientY,
      startTranslateY: translateY,
      lastY: clientY,
      lastTime: Date.now(),
      velocity: 0,
    };
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;

    const now = Date.now();
    const dt = now - dragState.current.lastTime;
    const dy = clientY - dragState.current.lastY;

    if (dt > 0) dragState.current.velocity = dy / dt;
    dragState.current.lastY = clientY;
    dragState.current.lastTime = now;

    const deltaY = clientY - dragState.current.startY;
    // Only allow dragging down (increasing translateY), cap at 5% min (95% open) and 100% max (closed)
    const newTranslateY = Math.max(0, Math.min(100, dragState.current.startTranslateY + (deltaY / window.innerHeight) * 100));
    setTranslateY(newTranslateY);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Close if dragged past 50% or fast swipe down
    const threshold = 50; // halfway between 5% (open) and 100% (closed)
    const shouldClose = translateY > threshold || dragState.current.velocity > 0.8;

    animateToSnap(shouldClose ? 100 : 0, shouldClose);
  };

  // Don't render on desktop or when closed and not animating
  if (!isMobile) return null;
  if (!isOpen && !isAnimating) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) animateToSnap(100, true);
  };

  return (
    <div className="fixed inset-0 z-[60]" style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen && translateY < 100 ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={handleBackdropClick}
      />

      <div
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: '90vh',
          height: '90vh',
          transform: `translateY(${translateY}%)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          touchAction: 'none',
        }}
      >
        {/* Drag Handle - Only this area should be draggable */}
        <div
          className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing shrink-0"
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => handleDragMove(e.clientY)}
          onMouseUp={() => handleDragEnd()}
          onMouseLeave={() => handleDragEnd()}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={() => handleDragEnd()}
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full" />
        </div>

        {(title || subtitle || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
            <div className="flex-1 min-w-0">
              {typeof title === 'string' ? (
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">{title}</h2>
              ) : (
                title
              )}
              {subtitle && <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={() => animateToSnap(100, true)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 ml-2"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div
          ref={contentRef}
          className="overflow-y-auto p-4 pb-20 flex-1"
        >
          {children}
        </div>
      </div>
    </div>
  );
});

BottomSheet.displayName = 'BottomSheet';

export default memo(BottomSheet);
