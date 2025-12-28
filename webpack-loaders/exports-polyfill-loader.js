/**
 * Webpack loader to inject exports/module.exports definitions
 * ONLY for @react-navigation packages that have CommonJS/ESM interop issues
 */
module.exports = function(source) {
  const resourcePath = this.resourcePath;
  
  // ONLY process @react-navigation packages
  if (!resourcePath.includes('@react-navigation')) {
    return source;
  }
  
  // The actual source files use CommonJS `exports` but Babel transforms them to ES modules
  // At runtime, some code paths still reference the original `exports` variable
  // So we need to provide it even though we can't detect it in the transformed source
  
  // Inject exports and module at the top only if they're not already defined
  // These will be no-ops if not used, but available if needed at runtime
  return `if (typeof exports === 'undefined') { var exports = {}; }\nif (typeof module === 'undefined') { var module = { exports: exports }; }\n${source}`;
};
