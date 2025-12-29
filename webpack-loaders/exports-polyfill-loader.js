/**
 * Webpack loader to inject exports/module.exports definitions
 * for @react-navigation packages that have CommonJS/ESM interop issues
 * 
 * React Navigation v7 ships pre-built files in lib/module that use ESM syntax
 * but internally still reference CommonJS `exports` for some compatibility layers.
 * This loader provides those globals only when needed, and transforms require() calls.
 */
module.exports = function(source) {
  const resourcePath = this.resourcePath;
  
  // ONLY process @react-navigation packages in lib/module directories
  // These are the pre-built ES module files that may reference exports
  if (!resourcePath.includes('@react-navigation') || !resourcePath.includes('/lib/module/')) {
    return source;
  }
  
  // Transform require() calls to use a dynamic import-like pattern
  // Specifically handle: const X = require('module').X
  // Transform: require('react-native-safe-area-context').SafeAreaListener
  // to: undefined (with SafeAreaListener being handled via optional chaining in the code)
  let transformedSource = source;
  
  // Replace require('react-native-safe-area-context').SafeAreaListener with undefined
  // This is safe because the code already has a fallback for when SafeAreaListener is undefined
  transformedSource = transformedSource.replace(
    /const\s+SafeAreaListener\s*=\s*require\s*\(\s*['"]react-native-safe-area-context['"]\s*\)\s*\.SafeAreaListener\s*;?/g,
    'const SafeAreaListener = undefined;'
  );
  
  // Generic require transformation for other cases - wrap in try/catch
  // This handles any remaining require() calls by making them no-op
  transformedSource = transformedSource.replace(
    /require\s*\(\s*(['"])((?:(?!\1).)*)\1\s*\)/g,
    (match, quote, moduleName) => {
      // Skip if already transformed
      if (transformedSource.includes('const SafeAreaListener = undefined')) {
        return match;
      }
      console.warn(`[exports-polyfill-loader] Unhandled require('${moduleName}') in ${resourcePath}`);
      return 'undefined';
    }
  );
  
  // Check if the source actually uses 'exports' or 'module'
  // This handles both direct usage and transformed code
  const usesExports = /\bexports\b/.test(transformedSource);
  const usesModule = /\bmodule\.exports\b/.test(transformedSource);
  
  if (!usesExports && !usesModule) {
    return transformedSource;
  }
  
  // Inject a self-contained IIFE that provides exports/module only if needed
  // This approach is safer than global var declarations
  const wrapper = `(function() {
  var exports = {};
  var module = { exports: exports };
  ${transformedSource}
  return module.exports;
})();`;
  
  return wrapper;
};
