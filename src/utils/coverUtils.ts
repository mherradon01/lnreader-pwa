import { Platform } from 'react-native';
import { defaultCover } from '@plugins/helpers/constants';
import { proxyUrl } from './proxyFetch';

// Cache for blob URLs and their corresponding blob objects to prevent garbage collection
const blobUrlCache = new Map<string, { url: string; blob: Blob }>();

/**
 * Get a web-safe cover URI.
 * On web, file:// URLs can't be loaded due to browser security restrictions.
 * This utility converts file:// URLs to blob URLs for web platform.
 * Also proxies cross-origin HTTP(S) URLs to bypass CORS.
 */
export const getWebSafeCoverUri = async (coverUri: string | undefined | null): Promise<string> => {
  if (!coverUri) {
    return defaultCover;
  }

  // On web, proxy cross-origin HTTP(S) URLs to bypass CORS
  if (Platform.OS === 'web' && (coverUri.startsWith('http://') || coverUri.startsWith('https://'))) {
    return proxyUrl(coverUri);
  }

  // On web, file:// URLs need to be converted to blob URLs
  if (Platform.OS === 'web' && coverUri.startsWith('file://')) {
    
    // Check cache first
    if (blobUrlCache.has(coverUri)) {
      const cached = blobUrlCache.get(coverUri)!;
      return cached.url;
    }
    
    try {
      // Remove file:// prefix and query params for reading
      const filePath = coverUri.replace(/^file:\/\//, '').split('?')[0];
      
      // Read the file from IndexedDB with metadata - open without version to use current
      const database = await (async () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('LNReaderFileSystem');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('files')) {
              db.createObjectStore('files', { keyPath: 'path' });
            }
          };
        });
      })();

      const fileEntry = await new Promise<any>((resolve, reject) => {
        const transaction = database.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const request = store.get(filePath);
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error(`File not found: ${filePath}`));
          }
        };
        request.onerror = () => reject(request.error);
      });

      let byteArray: Uint8Array;

      if (fileEntry.isBase64) {
        // Decode from base64
        const binaryString = atob(fileEntry.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        byteArray = bytes;
      } else {
        // It's already binary, encode as UTF-8
        const encoder = new TextEncoder();
        byteArray = encoder.encode(fileEntry.content);
      }

      // Determine MIME type from extension
      const ext = filePath.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 
                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'webp' ? 'image/webp' :
                       ext === 'gif' ? 'image/gif' : 'image/png';
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache both the blob and URL to keep blob in memory
      blobUrlCache.set(coverUri, { url: blobUrl, blob });
      
      return blobUrl;
    } catch (error) {
      // File doesn't exist locally - just use the default
      // In a real app, you might want to retry downloading from the remote URL
      return defaultCover;
    }
  }

  return coverUri;
};

/**
 * Check if we're running on web platform
 */
export const isWeb = Platform.OS === 'web';
