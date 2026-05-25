import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  isOpen: boolean;
  height: number;
}

export function useKeyboard() {
  const [keyboard, setKeyboard] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
  });

  useEffect(() => {
    let viewportHeight = window.innerHeight;
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const handleResize = () => {
      const currentViewportHeight = window.innerHeight;
      const heightDifference = viewportHeight - currentViewportHeight;
      
      // Keyboard is considered open if viewport height decreased significantly
      // Threshold of 150px to avoid false positives from browser chrome
      const isKeyboardOpen = heightDifference > 150;
      
      setKeyboard({
        isOpen: isKeyboardOpen,
        height: isKeyboardOpen ? heightDifference : 0,
      });
    };

    // Visual Viewport API (modern approach)
    if (window.visualViewport) {
      const handleViewportResize = () => {
        const currentViewportHeight = window.visualViewport!.height;
        const heightDifference = viewportHeight - currentViewportHeight;
        
        const isKeyboardOpen = heightDifference > 150;
        
        setKeyboard({
          isOpen: isKeyboardOpen,
          height: isKeyboardOpen ? heightDifference : 0,
        });
      };

      window.visualViewport.addEventListener('resize', handleViewportResize);
      
      // For iOS, also listen to scroll events as keyboard doesn't always trigger resize
      if (isIOS) {
        window.visualViewport.addEventListener('scroll', handleViewportResize);
      }

      return () => {
        window.visualViewport!.removeEventListener('resize', handleViewportResize);
        if (isIOS) {
          window.visualViewport!.removeEventListener('scroll', handleViewportResize);
        }
      };
    }

    // Fallback for browsers without Visual Viewport API
    window.addEventListener('resize', handleResize);
    
    // For iOS fallback
    if (isIOS) {
      window.addEventListener('focusin', handleResize);
      window.addEventListener('focusout', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isIOS) {
        window.removeEventListener('focusin', handleResize);
        window.removeEventListener('focusout', handleResize);
      }
    };
  }, []);

  const dismissKeyboard = useCallback(() => {
    // Blur the active element to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  return {
    ...keyboard,
    dismissKeyboard,
  };
}
