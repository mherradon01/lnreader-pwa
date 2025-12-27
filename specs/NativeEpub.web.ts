// Web stub implementation of NativeEpub using epubjs
import ePub from 'epubjs';

interface EpubChapter {
  name: string;
  path: string;
}

interface EpubNovel {
  name: string;
  cover: string | null;
  summary: string | null;
  author: string | null;
  artist: string | null;
  chapters: EpubChapter[];
  cssPaths: string[];
  imagePaths: string[];
}

const NativeEpub = {
  parseNovelAndChapters: async (epubDirPath: string): Promise<EpubNovel> => {
    console.warn('NativeEpub.parseNovelAndChapters: Web implementation limited');
    
    // This is a stub implementation
    // In a full implementation, you would:
    // 1. Load the epub file from the virtual filesystem
    // 2. Use epubjs to parse it
    // 3. Extract metadata and chapters
    
    return {
      name: 'Untitled',
      cover: null,
      summary: null,
      author: null,
      artist: null,
      chapters: [],
      cssPaths: [],
      imagePaths: [],
    };
  },
};

export default NativeEpub;
