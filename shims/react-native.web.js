// Web wrapper for react-native that adds missing exports
import ReactNativeWeb from 'react-native-web';
import { unstable_batchedUpdates } from 'react-dom';

// Re-export everything from react-native-web as both named and default exports
export * from 'react-native-web';

// Add the missing unstable_batchedUpdates export
export { unstable_batchedUpdates };

// Create default export that includes everything
const defaultExport = {
  ...ReactNativeWeb,
  unstable_batchedUpdates,
};

export default defaultExport;
