// Re-export all expo-file-system exports from main shim
export * from '../expo-file-system.web';

// Legacy exports for StorageAccessFramework
export const StorageAccessFramework = {
  getDirectoryAsync: async () => null,
  readAsStringAsync: async () => '',
  createFileAsync: async () => null,
  deleteAsync: async () => {},
  makeDirectoryAsync: async () => null,
};
