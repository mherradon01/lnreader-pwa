// Web implementation of NativeEpub using epubjs
import ePub, { Book } from 'epubjs';
import NativeFile from './NativeFile.web';

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

// Helper function to normalize paths and resolve ".." sequences
function normalizePath(path: string): string {
  const parts = path.split('/');
  const result: string[] = [];
  
  for (const part of parts) {
    if (part === '..') {
      // Go up one directory
      if (result.length > 0) {
        result.pop();
      }
    } else if (part && part !== '.') {
      // Add non-empty parts (skip "." and empty strings from double slashes)
      result.push(part);
    }
  }
  
  // Reconstruct path, preserving leading slash if present
  const normalized = result.join('/');
  return path.startsWith('/') ? '/' + normalized : normalized;
}

const NativeEpub = {
  parseNovelAndChapters: async (epubDirPath: string): Promise<EpubNovel> => {
    try {
      console.log('[NativeEpub] Starting EPUB parsing from:', epubDirPath);

      // Read the EPUB manifest file
      const containerPath = epubDirPath + '/META-INF/container.xml';
      console.log('[NativeEpub] Reading container from:', containerPath);
      const containerXml = await NativeFile.readFile(containerPath);
      
      // Parse container to find rootfile
      const rootfileMatch = containerXml.match(/rootfile[^>]*full-path="([^"]+)"/);
      if (!rootfileMatch) {
        throw new Error('Could not find rootfile in container.xml');
      }
      const opfPath = rootfileMatch[1];
      const opfFullPath = epubDirPath + '/' + opfPath;
      console.log('[NativeEpub] Found OPF file:', opfPath);

      // Read the OPF (content.opf) file
      console.log('[NativeEpub] Reading OPF from:', opfFullPath);
      const opfXml = await NativeFile.readFile(opfFullPath);
      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfXml, 'text/xml');

      // Extract metadata
      console.log('[NativeEpub] Extracting metadata');
      const titleEl = opfDoc.querySelector('title');
      const creatorEl = opfDoc.querySelector('creator');
      const descriptionEl = opfDoc.querySelector('description');
      const coverImageIdEl = opfDoc.querySelector('meta[name="cover"]');

      const name = titleEl?.textContent || 'Untitled';
      const author = creatorEl?.textContent || null;
      const summary = descriptionEl?.textContent || null;
      let cover: string | null = null;

      // Try to extract cover image
      if (coverImageIdEl) {
        const coverId = coverImageIdEl.getAttribute('content');
        if (coverId) {
          const coverManifestEl = opfDoc.querySelector(`item[id="${coverId}"]`);
          if (coverManifestEl) {
            const coverHref = coverManifestEl.getAttribute('href');
            if (coverHref) {
              const opfDir = opfFullPath.substring(0, opfFullPath.lastIndexOf('/'));
              const coverRelativePath = opfDir + '/' + coverHref;
              // Resolve relative paths (e.g., "../" goes up one directory)
              const normalizedPath = normalizePath(coverRelativePath);
              
              cover = normalizedPath;
              console.log('[NativeEpub] Found cover image:', cover);
            }
          }
        }
      }

      // Extract chapters from spine
      console.log('[NativeEpub] Extracting chapters from spine');
      const chapters: EpubChapter[] = [];
      const spineItemRefs = opfDoc.querySelectorAll('spine itemref');
      const manifest = new Map<string, { href: string; type: string }>();
      const imagePaths: string[] = [];

      // Build manifest map and collect image paths
      opfDoc.querySelectorAll('manifest item').forEach((item) => {
        const id = item.getAttribute('id');
        const href = item.getAttribute('href');
        const type = item.getAttribute('media-type');
        if (id && href) {
          manifest.set(id, { href, type: type || '' });
          
          // Collect image files - check MIME type case-insensitively
          const mimeTypeLower = (type || '').toLowerCase();
          if (mimeTypeLower.startsWith('image/') || mimeTypeLower.includes('svg')) {
            const opfDir = opfFullPath.substring(0, opfFullPath.lastIndexOf('/'));
            const imageRelativePath = opfDir + '/' + href;
            const normalizedPath = normalizePath(imageRelativePath);
            imagePaths.push(normalizedPath);
            console.log('[NativeEpub] Found image:', normalizedPath, 'type:', type);
          } else if (id && href) {
            // Log non-image items for debugging
            console.log('[NativeEpub] Manifest item:', id, 'href:', href, 'type:', type);
          }
        }
      });

      // Process spine items (chapters)
      spineItemRefs.forEach((itemRef) => {
        const idref = itemRef.getAttribute('idref');
        if (idref) {
          const manifestEntry = manifest.get(idref);
          if (manifestEntry) {
            const opfDir = opfFullPath.substring(0, opfFullPath.lastIndexOf('/'));
            const chapterRelativePath = opfDir + '/' + manifestEntry.href;
            // Resolve relative paths (e.g., "../" goes up one directory)
            const normalizedPath = normalizePath(chapterRelativePath);
            
            chapters.push({
              name: `Chapter ${chapters.length + 1}`,
              path: normalizedPath,
            });
          }
        }
      });

      console.log('[NativeEpub] Found', chapters.length, 'chapters');
      console.log('[NativeEpub] Found', imagePaths.length, 'images');
      console.log('[NativeEpub] Image paths:', imagePaths);

      const result: EpubNovel = {
        name,
        cover,
        summary,
        author,
        artist: null,
        chapters: chapters.length > 0 ? chapters : [],
        cssPaths: [],
        imagePaths,
      };

      console.log('[NativeEpub] Parsing complete:', {
        name: result.name,
        chapters: result.chapters.length,
        hasCover: !!result.cover,
      });

      return result;
    } catch (error) {
      console.error('[NativeEpub] Error parsing EPUB:', error);
      console.error('[NativeEpub] Error details:', error instanceof Error ? error.message : 'unknown');
      
      // Return a minimal structure so import doesn't crash
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
    }
  },
};

export default NativeEpub;
