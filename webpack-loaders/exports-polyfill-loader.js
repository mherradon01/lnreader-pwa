/**
 * Webpack loader to inject exports/module.exports definitions
 * for packages that use CommonJS patterns in ES module files
 */
module.exports = function(source) {
  // Check if the code uses 'exports' or 'module.exports' without defining them
  const usesExports = (source.includes('exports.') || source.includes('exports[') || source.includes('Object.defineProperty(exports'));
  const hasExportsDefined = source.includes('var exports') || source.includes('let exports') || source.includes('const exports') || source.includes('function exports');
  
  if (usesExports && !hasExportsDefined) {
    // Inject exports definition at the top
    // Don't export default if the file already has ES module exports
    const hasESExports = source.includes('export ') || source.includes('export{') || source.includes('export*');
    
    if (hasESExports) {
      // Just inject the definitions, keep existing exports
      return `var exports = {}; var module = { exports: exports };\n${source}`;
    } else {
      // Add default export
      return `var exports = {}; var module = { exports: exports };\n${source}\nexport default module.exports;`;
    }
  }
  
  return source;
};
