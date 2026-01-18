// Shim for expo-file-system on web
// File system operations are limited on web platform

export const getInfoAsync = async _fileUri => {
  return { exists: false, isDirectory: false, size: 0, modificationTime: 0 };
};

export const readAsStringAsync = async _fileUri => {
  return '';
};

export const readAsBase64Async = async _fileUri => {
  return '';
};

export const writeAsStringAsync = async (_fileUri, _contents) => {
  return '';
};

export const writeAsBase64Async = async (_fileUri, _contents) => {
  return '';
};

export const deleteAsync = async _fileUri => {
  return;
};

export const makeDirectoryAsync = async _fileUri => {
  return '';
};

export const readDirectoryAsync = async _fileUri => {
  return [];
};

export const createDownloadResumable = () => {
  return {
    downloadAsync: async () => ({ uri: '', status: 200, headers: {} }),
    pauseAsync: async () => {},
    resumeAsync: async () => ({ uri: '', status: 200, headers: {} }),
  };
};

export const downloadAsync = async (_uri, _fileUri) => {
  return { uri: '', status: 200, headers: {} };
};

export const uploadAsync = async (_uri, _fileUri) => {
  return { status: 200, headers: {} };
};

export const SessionType = {
  BACKGROUND: 0,
  FOREGROUND: 1,
};

export const EncodingType = {
  UTF8: 'utf8',
  BASE64: 'base64',
};

// Legacy exports for StorageAccessFramework
export const StorageAccessFramework = {
  getDirectoryAsync: async () => null,
  readAsStringAsync: async () => '',
  createFileAsync: async () => null,
  deleteAsync: async () => {},
  makeDirectoryAsync: async () => null,
};
