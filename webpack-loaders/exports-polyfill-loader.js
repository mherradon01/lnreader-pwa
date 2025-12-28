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
  
  // Only inject if file uses Object.defineProperty(exports, "__esModule") pattern
  // This is the specific pattern that causes the error
  const needsExportsPolyfill = source.includes('Object.defineProperty(exports,') && source.includes('"__esModule"');
  const hasExportsDefined = source.includes('var exports') || source.includes('let exports') || source.includes('const exports');
  
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
