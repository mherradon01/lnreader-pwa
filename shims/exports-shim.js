// Shim to provide exports and module for packages that use CommonJS patterns
const exportsObj = {};
const moduleObj = { exports: exportsObj };

export { exportsObj as exports, moduleObj as module };
