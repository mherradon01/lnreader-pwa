/**
 * Webpack loader to inject exports/module.exports definitions
 * ONLY for @react-navigation packages that have the specific CommonJS bug
 */
module.exports = function(source) {
  const resourcePath = this.resourcePath;
  
  // ONLY process @react-navigation packages (very restrictive now!)
  if (!resourcePath.includes('@react-navigation')) {
    return source;
  }
  
  // Detect if file uses exports but doesn't define it
  // Check for any usage of exports.X, exports[X], or Object.defineProperty(exports
  const usesExports = /exports\.|exports\[|Object\.defineProperty\s*\(\s*exports/.test(source);
  const hasExportsDefined = /(?:var|let|const)\s+exports/.test(source);
  const needsExportsPolyfill = usesExports && !hasExportsDefined;
  
  console.log('[exports-polyfill-loader] Processing:', resourcePath);
  console.log('[exports-polyfill-loader]   needsExportsPolyfill:', needsExportsPolyfill);
  console.log('[exports-polyfill-loader]   hasExportsDefined:', hasExportsDefined);
  
  if (needsExportsPolyfill && !hasExportsDefined) {
    console.log('[exports-polyfill-loader] ✅ INJECTING exports for:', resourcePath);
    
    // Just inject the definitions at the top - don't add export default
    // Let the existing exports in the file handle the exporting
    return `var exports = {}; var module = { exports: exports };\n${source}`;
  }
  
  return source;
};
