// Shim for expo-file-system/legacy on web
// File system operations are limited on web platform

export const StorageAccessFramework = {
  getDirectoryAsync: async () => null,
  readAsStringAsync: async () => '',
  createFileAsync: async () => null,
  deleteAsync: async () => {},
  makeDirectoryAsync: async () => null,
};
