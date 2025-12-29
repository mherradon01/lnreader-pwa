/**
 * Webpack loader to inject exports/module.exports definitions
 * for @react-navigation packages that have CommonJS/ESM interop issues
 * 
 * React Navigation v7 ships pre-built files in lib/module that use ESM syntax
 * but internally still reference CommonJS `exports` for some compatibility layers.
 * This loader provides those globals only when needed.
 */
module.exports = function(source) {
  const resourcePath = this.resourcePath;
  
  // ONLY process @react-navigation packages in lib/module directories
  // These are the pre-built ES module files that may reference exports
  if (!resourcePath.includes('@react-navigation') || !resourcePath.includes('/lib/module/')) {
    return source;
  }
  
  // Check if the source actually uses 'exports' or 'module'
  // This handles both direct usage and transformed code
  const usesExports = /\bexports\b/.test(source);
  const usesModule = /\bmodule\.exports\b/.test(source);
  
  if (!usesExports && !usesModule) {
    return source;
  }
  
  // Inject a self-contained IIFE that provides exports/module only if needed
  // This approach is safer than global var declarations
  const wrapper = `(function() {
  var exports = {};
  var module = { exports: exports };
  ${source}
  return module.exports;
})();`;
  
  return wrapper;
};
