// Shim for expo-navigation-bar on web
// Navigation bar is Android-specific and not needed on web
export const setBackgroundColorAsync = async _color => {
  // No-op on web
};

export const setButtonStyleAsync = async _style => {
  // No-op on web
};

export const setVisibilityAsync = async _visibility => {
  // No-op on web
};

export const setPositionAsync = async _position => {
  // No-op on web
};

export const getBackgroundColorAsync = async () => {
  return null;
};

export const getButtonStyleAsync = async () => {
  return null;
};

export const getVisibilityAsync = async () => {
  return null;
};

export const getPositionAsync = async () => {
  return null;
};
