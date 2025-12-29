import 'react-native-url-polyfill/auto';
import { enableFreeze } from 'react-native-screens';

enableFreeze(true);

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';

import AppErrorBoundary, {
  ErrorFallback,
} from '@components/AppErrorBoundary/AppErrorBoundary';
import { useDatabaseInitialization } from '@hooks';

import Main from './src/navigators/Main';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

// Notifications are handled differently on web
// We'll create a simpler version for web

const App = () => {
  const { isDbReady, dbError, retryInitialization } =
    useDatabaseInitialization();

  useEffect(() => {
    // Hide splash screen on web
    // LottieSplashScreen.hide() is not available on web
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
    return <SafeAreaProvider>{null}</SafeAreaProvider>;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
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
});
