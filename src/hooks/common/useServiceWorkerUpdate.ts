import { useEffect, useState } from 'react';

interface ServiceWorkerUpdate {
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook to detect service worker updates for PWA
 * When a new version is deployed, this will detect the changes in the service worker
 * and notify the user that an update is available
 */
export const useServiceWorkerUpdate = (): ServiceWorkerUpdate & {
  skipWaiting: () => void;
} => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    // Get the existing service worker registration
    navigator.serviceWorker.ready
      .then(reg => {
        setRegistration(reg);

        // Check for updates every hour
        const checkInterval = setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);

        return checkInterval;
      })
      .catch(() => {
        // Silently fail if service worker is not available
      });

    // Listen for controller change (happens when new SW is activated)
    const onControllerChange = () => {
      setIsUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      onControllerChange,
    );

    // Handle updates when a new service worker is waiting
    const handleServiceWorkerMessage = (event: any) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        setIsUpdateAvailable(true);
      }
    };

    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.addEventListener(
        'message' as any,
        handleServiceWorkerMessage,
      );
    }

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        onControllerChange,
      );
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.removeEventListener(
          'message' as any,
          handleServiceWorkerMessage,
        );
      }
    };
  }, []);

  const skipWaiting = () => {
    if (registration && registration.waiting) {
      // Send message to the waiting service worker to activate
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    isUpdateAvailable,
    registration,
    skipWaiting,
  };
};
