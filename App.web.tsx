import 'react-native-url-polyfill/auto';
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';

import AppErrorBoundary, {
  ErrorFallback,
} from '@components/AppErrorBoundary/AppErrorBoundary';
import { useDatabaseInitialization } from '@hooks';
import { useWebSafeAreaInsets } from '@hooks/useWebSafeAreaInsets.web';

import Main from './src/navigators/Main';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

const App = () => {
  const { isDbReady, dbError, retryInitialization } =
    useDatabaseInitialization();
  const webInsets = useWebSafeAreaInsets();

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
      console.log('App ready');
    }
  }, [isDbReady, dbError]);

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
