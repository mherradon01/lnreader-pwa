// Polyfill for require() in browser context
// This is used by some libraries that try to use require() dynamically

// Define require globally
if (typeof window !== 'undefined' && typeof window.require === 'undefined') {
  window.require = function (moduleId) {
    // Return empty object for unknown requires
    // This prevents "require is not defined" errors
    console.warn('require() called for:', moduleId, '- returning empty object');
    return {};
  };

  // Also polyfill require.resolve
  window.require.resolve = function (moduleId) {
    return moduleId;
  };

  // Also polyfill require.cache
  window.require.cache = {};
}

// Also define it on globalThis for non-browser contexts
if (typeof globalThis !== 'undefined' && typeof globalThis.require === 'undefined') {
  globalThis.require = window.require || function (moduleId) {
    console.warn('require() called for:', moduleId, '- returning empty object');
    return {};
  };
}

export default window.require || (() => {});
