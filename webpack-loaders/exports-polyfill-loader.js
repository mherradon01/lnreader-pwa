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
  
  // Always inject for @react-navigation packages since they have this mixed module issue
  console.log('[exports-polyfill-loader] ✅ INJECTING exports for @react-navigation:', resourcePath);
  
  // Inject exports and module at the top
  // These will be no-ops if not used, but available if needed at runtime
  return `var exports = {}; var module = { exports: exports };\n${source}`;
};
