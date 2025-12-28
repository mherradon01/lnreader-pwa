/**
 * Webpack loader to inject exports/module.exports definitions
 * for packages that use CommonJS patterns in ES module files
 */
module.exports = function(source) {
  // Check if the code uses 'exports' or 'module.exports' without defining them
  if ((source.includes('exports.') || source.includes('exports[')) && 
      !source.includes('var exports') && 
      !source.includes('let exports') &&
      !source.includes('const exports')) {
    // Inject exports definition at the top
    return `var exports = {}; var module = { exports: exports };\n${source}\nexport default module.exports;`;
  }
  
  return source;
};
