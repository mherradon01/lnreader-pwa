// Web stub for @react-native-documents/picker

export const pick = async () => {
  console.warn('Document picker not available on web');
  return [];
};

export const pickMultiple = async () => {
  console.warn('Document picker not available on web');
  return [];
};

export const pickDirectory = async () => {
  console.warn('Document picker not available on web');
  return null;
};

export const saveDocuments = async () => {
  console.warn('saveDocuments not available on web');
  return null;
};

export const keepLocalCopy = async () => {
  console.warn('keepLocalCopy not available on web');
  return [{ status: 'error', copyError: 'Not available on web' }];
};

export const types = {
  zip: 'application/zip',
  pdf: 'application/pdf',
  plainText: 'text/plain',
  images: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  allFiles: '*/*',
};

export default {
  pick,
  pickMultiple,
  pickDirectory,
  saveDocuments,
  keepLocalCopy,
  types,
};
