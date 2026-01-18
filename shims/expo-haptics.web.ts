// Shim for expo-haptics on web
// Haptics are not available on web
export const notificationAsync = async () => {
  // No-op on web
};

export const selectionAsync = async () => {
  // No-op on web
};

export const impactAsync = async () => {
  // No-op on web
};

// Export impact feedback style enums
export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
};

export const NotificationFeedbackType = {
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

export const SelectionFeedbackType = {
  Selection: 'selection',
};
