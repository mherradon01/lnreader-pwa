import { Platform } from 'react-native';
import { defaultCover } from '@plugins/helpers/constants';
import NativeFile from '@specs/NativeFile';
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
    console.log('[getWebSafeCoverUri] No cover URI provided, using default');
    return defaultCover;
  }

  // On web, proxy cross-origin HTTP(S) URLs to bypass CORS
  if (Platform.OS === 'web' && (coverUri.startsWith('http://') || coverUri.startsWith('https://'))) {
    return proxyUrl(coverUri);
  }

  // On web, file:// URLs need to be converted to blob URLs
  if (Platform.OS === 'web' && coverUri.startsWith('file://')) {
    console.log('[getWebSafeCoverUri] Web platform detected, converting file:// URL:', coverUri);
    
    // Check cache first
    if (blobUrlCache.has(coverUri)) {
      const cached = blobUrlCache.get(coverUri)!;
      console.log('[getWebSafeCoverUri] Using cached blob URL:', cached.url);
      return cached.url;
    }
    
    try {
      // Remove file:// prefix and query params for reading
      const filePath = coverUri.replace(/^file:\/\//, '').split('?')[0];
      console.log('[getWebSafeCoverUri] Reading file from:', filePath);
      
      // Read the file from IndexedDB with metadata
      const database = await (async () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('LNReaderFileSystem', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
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

      console.log('[getWebSafeCoverUri] File entry loaded, isBase64:', fileEntry.isBase64, 'contentLength:', fileEntry.content?.length);

      let byteArray: Uint8Array;

      if (fileEntry.isBase64) {
        // Decode from base64
        console.log('[getWebSafeCoverUri] Decoding base64 content');
        const binaryString = atob(fileEntry.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        byteArray = bytes;
      } else {
        // It's already binary, encode as UTF-8
        console.log('[getWebSafeCoverUri] Using content as UTF-8');
        const encoder = new TextEncoder();
        byteArray = encoder.encode(fileEntry.content);
      }

      // Determine MIME type from extension
      const ext = filePath.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 
                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'webp' ? 'image/webp' :
                       ext === 'gif' ? 'image/gif' : 'image/png';
      
      console.log('[getWebSafeCoverUri] Creating blob with MIME type:', mimeType, 'size:', byteArray.byteLength);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache both the blob and URL to keep blob in memory
      blobUrlCache.set(coverUri, { url: blobUrl, blob });
      
      console.log('[getWebSafeCoverUri] Created blob URL:', blobUrl);
      return blobUrl;
    } catch (error) {
      console.warn('[getWebSafeCoverUri] Failed to load local file:', error);
      console.warn('[getWebSafeCoverUri] Local file does not exist, using default cover. Cover was likely not downloaded successfully.');
      // File doesn't exist locally - just use the default
      // In a real app, you might want to retry downloading from the remote URL
      return defaultCover;
    }
  }

  console.log('[getWebSafeCoverUri] Returning cover URI:', coverUri);
  return coverUri;
};

/**
 * Check if we're running on web platform
 */
export const isWeb = Platform.OS === 'web';
