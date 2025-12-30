import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hook to blur the active element when the screen loses focus on web.
 * This prevents the aria-hidden accessibility warning where hidden screens
 * (with aria-hidden="true") still contain focused elements.
 */
export function useBlurOnUnfocus() {
  useFocusEffect(
    useCallback(() => {
      // When screen gains focus, do nothing
      return () => {
        // When screen loses focus, blur any focused element on web
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.blur) {
            activeElement.blur();
          }
        }
      };
    }, []),
  );
}
