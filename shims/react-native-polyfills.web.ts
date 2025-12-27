// Additional polyfills for react-native-web
import { unstable_batchedUpdates } from 'react-dom';

export { unstable_batchedUpdates };

export const TurboModuleRegistry = {
  get: (name: string) => {
    console.warn(`TurboModuleRegistry.get('${name}') - not available on web`);
    return null;
  },
  getEnforcing: (name: string) => {
    console.warn(`TurboModuleRegistry.getEnforcing('${name}') - not available on web`);
    return {};
  },
};

export default {
  unstable_batchedUpdates,
  TurboModuleRegistry,
};
