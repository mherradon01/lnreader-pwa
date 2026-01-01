import { Platform } from 'react-native';
import { defaultCover } from '@plugins/helpers/constants';
import NativeFile from '@specs/NativeFile';

// Cache for blob URLs to avoid recreating them
const blobUrlCache = new Map<string, string>();

/**
 * Get a web-safe cover URI.
 * On web, file:// URLs can't be loaded due to browser security restrictions.
 * This utility converts file:// URLs to blob URLs for web platform.
 */
export const getWebSafeCoverUri = async (coverUri: string | undefined | null): Promise<string> => {
  if (!coverUri) {
    console.log('[getWebSafeCoverUri] No cover URI provided, using default');
    return defaultCover;
  }

  // On web, file:// URLs need to be converted to blob URLs
  if (Platform.OS === 'web' && coverUri.startsWith('file://')) {
    console.log('[getWebSafeCoverUri] Web platform detected, converting file:// URL:', coverUri);
    
    // Check cache first
    if (blobUrlCache.has(coverUri)) {
      const cachedUrl = blobUrlCache.get(coverUri)!;
      console.log('[getWebSafeCoverUri] Using cached blob URL:', cachedUrl);
      return cachedUrl;
    }
    
    try {
      // Remove file:// prefix and query params for reading
      const filePath = coverUri.replace(/^file:\/\//, '').split('?')[0];
      console.log('[getWebSafeCoverUri] Reading file from:', filePath);
      
      // Read file as base64
      const base64Data = await NativeFile.readFile(filePath);
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Determine MIME type from extension
      const ext = filePath.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : 
                       ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                       ext === 'webp' ? 'image/webp' :
                       ext === 'gif' ? 'image/gif' : 'image/png';
      
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      
      // Cache the blob URL
      blobUrlCache.set(coverUri, blobUrl);
      
      console.log('[getWebSafeCoverUri] Created blob URL:', blobUrl);
      return blobUrl;
    } catch (error) {
      console.error('[getWebSafeCoverUri] Failed to load local file:', error);
      console.log('[getWebSafeCoverUri] Returning default cover');
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
