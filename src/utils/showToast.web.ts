// Web implementation of showToast using a custom toast notification

let toastContainer: HTMLDivElement | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

const getOrCreateToastContainer = (): HTMLDivElement => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

export const showToast = (message: string) => {
  const container = getOrCreateToastContainer();

  // Clear any existing toast
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  container.innerHTML = '';

  // Create toast element
  const toast = document.createElement('div');
  toast.style.cssText = `
    background-color: rgba(50, 50, 50, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    max-width: 80vw;
    text-align: center;
    word-wrap: break-word;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Auto-hide after SHORT duration (similar to ToastAndroid.SHORT ~2000ms)
  toastTimeout = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, 300);
  }, 2000);
};
