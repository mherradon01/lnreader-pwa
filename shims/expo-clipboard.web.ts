// Shim for expo-clipboard on web
export const setStringAsync = async text => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_err) {
    // Silently fail on web
  }
};

export const getStringAsync = async () => {
  try {
    return await navigator.clipboard.readText();
  } catch (_err) {
    return '';
  }
};

export const ClipboardPasteButton = () => null;
