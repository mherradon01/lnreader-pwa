import 'react-native-url-polyfill/auto';
import React from 'react';
import { AppRegistry } from 'react-native';
import { unstable_batchedUpdates } from 'react-dom';
import App from './App';

// Suppress harmless warnings that don't apply to web
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    message.includes('`useNativeDriver` is not supported')
  ) {
    return; // Suppress - native driver isn't available on web, JS fallback works fine
  }
  originalWarn.apply(console, args);
};

// Polyfill unstable_batchedUpdates for libraries that expect it from react-native
if (typeof (window as any).ReactNativeWebUnstableBatchedUpdates === 'undefined') {
  (window as any).ReactNativeWebUnstableBatchedUpdates = unstable_batchedUpdates;
}

// Register the app for web
AppRegistry.registerComponent('LNReader', () => App);

// Run the app
AppRegistry.runApplication('LNReader', {
  rootTag: document.getElementById('root'),
});

// Register service worker for PWA
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
