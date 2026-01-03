import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Hook to get safe area insets on web using CSS env() variables
 * This is particularly important for iOS devices with notches and home indicators
 */
export function useWebSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const updateInsets = () => {
      // Create a temporary element to read CSS env() values
      const div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.top = 'env(safe-area-inset-top, 0px)';
      div.style.right = 'env(safe-area-inset-right, 0px)';
      div.style.bottom = 'env(safe-area-inset-bottom, 0px)';
      div.style.left = 'env(safe-area-inset-left, 0px)';
      div.style.visibility = 'hidden';
      div.style.pointerEvents = 'none';
      
      document.body.appendChild(div);
      
      const computedStyle = window.getComputedStyle(div);
      
      const newInsets = {
        top: parseFloat(computedStyle.top) || 0,
        right: parseFloat(computedStyle.right) || 0,
        bottom: parseFloat(computedStyle.bottom) || 0,
        left: parseFloat(computedStyle.left) || 0,
      };
      
      document.body.removeChild(div);
      
      setInsets(newInsets);
    };

    // Update on mount
    updateInsets();

    // Update on orientation change
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  return insets;
}
