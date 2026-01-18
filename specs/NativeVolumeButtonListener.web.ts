// Web stub implementation of NativeVolumeButtonListener
// Volume buttons are not accessible in web browsers

const NativeVolumeButtonListener = {
  addListener: (eventName: string): void => {
    console.warn('NativeVolumeButtonListener.addListener: Not available on web');
    // No-op for web
  },

  removeListeners: (count: number): void => {
    console.warn('NativeVolumeButtonListener.removeListeners: Not available on web');
    // No-op for web
  },
};

export default NativeVolumeButtonListener;
