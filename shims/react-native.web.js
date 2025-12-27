// Web wrapper for react-native that adds missing exports
import * as ReactNativeWeb from 'react-native-web';
import { unstable_batchedUpdates } from 'react-dom';

// Re-export everything from react-native-web
export * from 'react-native-web';

// Add the missing unstable_batchedUpdates export
export { unstable_batchedUpdates };

// Default export
export default {
  ...ReactNativeWeb,
  unstable_batchedUpdates,
};
