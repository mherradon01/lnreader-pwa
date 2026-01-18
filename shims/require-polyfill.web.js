// Polyfill for require() in browser context
// This is used by some libraries that try to use require() dynamically
if (typeof require === 'undefined') {
  // eslint-disable-next-line no-global-assign
  require = function (moduleId) {
    // Return empty object for unknown requires
    // This prevents "require is not defined" errors
    return {};
  };

  // Also polyfill require.resolve
  // eslint-disable-next-line no-global-assign
  require.resolve = function (moduleId) {
    return moduleId;
  };

  // Also polyfill require.cache
  // eslint-disable-next-line no-global-assign
  require.cache = {};

  // Make it available globally
  if (typeof window !== 'undefined') {
    window.require = require;
  }
}

export default require;
