import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useBackHandler(handler: () => boolean) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, use browser's popstate event for back navigation
      const handlePopState = () => {
        const handled = handler();
        if (handled) {
          // Push a new state to prevent actual navigation
          window.history.pushState(null, '', window.location.href);
        }
      };

      // Push initial state so we can intercept back button
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handler,
    );

    return () => backHandler.remove();
  }, [handler]);
}
