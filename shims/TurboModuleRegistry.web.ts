// Web shim for TurboModuleRegistry
export const TurboModuleRegistry = {
  get: (name: string) => {
    console.warn(`TurboModuleRegistry.get('${name}') - not available on web`);
    return null;
  },
  getEnforcing: (name: string) => {
    console.warn(`TurboModuleRegistry.getEnforcing('${name}') - not available on web`);
    return null;
  },
};

export default TurboModuleRegistry;
