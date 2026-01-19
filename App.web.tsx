import 'react-native-url-polyfill/auto';
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);

import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';

import AppErrorBoundary, {
  ErrorFallback,
} from '@components/AppErrorBoundary/AppErrorBoundary';
import { useDatabaseInitialization } from '@hooks';
import { useWebSafeAreaInsets } from '@hooks/useWebSafeAreaInsets.web';
import { useServiceWorkerUpdate } from '@hooks/common/useServiceWorkerUpdate';

import Main from './src/navigators/Main';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import PWAUpdateNotification from './src/components/PWAUpdateNotification';

const App = () => {
  const { isDbReady, dbError, retryInitialization } =
    useDatabaseInitialization();
  const webInsets = useWebSafeAreaInsets();
  const { isUpdateAvailable, skipWaiting } = useServiceWorkerUpdate();
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  useEffect(() => {
    // Hide HTML loading screen immediately when React app mounts
    // This should run only once on mount
    const loadingScreen = document.querySelector('.app-loading');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
    }
  }, []); // Empty dependency array - run only once on mount

  useEffect(() => {
    // Log when app is ready
    if (isDbReady || dbError) {
      // eslint-disable-next-line no-console
      console.log('App ready');
    }
  }, [isDbReady, dbError]);

  useEffect(() => {
    // Show notification when update is available
    if (isUpdateAvailable) {
      setShowUpdateNotification(true);
    }
  }, [isUpdateAvailable]);

  if (dbError) {
    return (
      <SafeAreaProvider>
        <ErrorFallback error={dbError} resetError={retryInitialization} />
      </SafeAreaProvider>
    );
  }

  if (!isDbReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 0, height: 0 },
          insets: webInsets,
        }}
      >
        <AppErrorBoundary>
          <PaperProvider>
            <BottomSheetModalProvider>
              <StatusBar translucent={true} backgroundColor="transparent" />
              <Main />
              <PWAUpdateNotification
                visible={showUpdateNotification}
                onDismiss={() => setShowUpdateNotification(false)}
                onUpdate={skipWaiting}
              />
            </BottomSheetModalProvider>
          </PaperProvider>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderTopWidth: 4,
    borderTopColor: '#007AFF',
  },
});
