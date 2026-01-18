// Shim for @cd-z/react-native-epub-creator on web
// EPUB creation is not available on web platform

export default class EpubBuilder {
  constructor(_options) {}
  addChapter() {
    return this;
  }
  addTOC() {
    return this;
  }
  addCSS() {
    return this;
  }
  export() {
    return Promise.resolve('');
  }
}

export {};
