// Web wrapper for react-native that adds missing exports
import * as ReactNativeWeb from 'react-native-web';
import { unstable_batchedUpdates } from 'react-dom';
import { TurboModuleRegistry } from './TurboModuleRegistry.web.ts';

// Re-export everything from react-native-web as both named and default exports
export * from 'react-native-web';

// Add the missing unstable_batchedUpdates export
export { unstable_batchedUpdates };

// Export TurboModuleRegistry shim for native modules that require it
export { TurboModuleRegistry };

// Create default export that includes everything
const defaultExport = {
  ...ReactNativeWeb,
  unstable_batchedUpdates,
  TurboModuleRegistry,
};

export default defaultExport;
