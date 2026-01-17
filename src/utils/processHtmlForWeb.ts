import NativeFile from '@specs/NativeFile';
import { Platform } from 'react-native';

/**
 * Converts file:// URLs in HTML content to blob URLs that can be loaded in a WebView
 * This is necessary on web because browsers block file:// URL access for security reasons
 *
 * Note: Files must exist in the virtual filesystem (IndexedDB) to be converted.
 * Missing files will be left as-is (browser will show broken image/resource indicators).
 */
export async function processHtmlForWeb(htmlContent: string): Promise<string> {
  if (Platform.OS !== 'web') {
    return htmlContent;
  }

  let processedHtml = htmlContent;

  // Find all file:// URLs in the HTML (in href, src, and other attributes)
  // Match everything after file:// until we hit a quote, space, or end of tag
  const fileUrlRegex = /file:\/\/([^\s"')\]>]+)/g;
  const fileUrls = new Map<string, string>(); // Map of original URL to blob URL
  let match;

  // First pass: extract all unique file URLs
  while ((match = fileUrlRegex.exec(htmlContent)) !== null) {
    const filePath = match[1];
    const fullUrl = `file://${filePath}`;

    if (!fileUrls.has(fullUrl) && !filePath.includes('undefined')) {
      fileUrls.set(fullUrl, ''); // Placeholder, will be filled in next pass
    }
  }

  // Second pass: convert each file URL to a blob URL
  for (const [fullUrl, _] of fileUrls) {
    const filePath = fullUrl.replace('file://', '');

    try {
      // Determine the MIME type based on file extension
      const ext = filePath.toLowerCase().split('.').pop();
      let mimeType = 'application/octet-stream';
      let isImage = false;

      if (ext === 'css') {
        mimeType = 'text/css';
      } else if (['jpg', 'jpeg'].includes(ext || '')) {
        mimeType = 'image/jpeg';
        isImage = true;
      } else if (ext === 'png') {
        mimeType = 'image/png';
        isImage = true;
      } else if (ext === 'gif') {
        mimeType = 'image/gif';
        isImage = true;
      } else if (ext === 'svg') {
        mimeType = 'image/svg+xml';
        isImage = true;
      } else if (ext === 'webp') {
        mimeType = 'image/webp';
        isImage = true;
      }

      let content: string | undefined;
      try {
        // console.log('[processHtmlForWeb] Attempting to read file:', filePath);
        content = await NativeFile.readFile(filePath);
        // console.log('[processHtmlForWeb] Successfully read file:', filePath, 'size:', content.length);
      } catch (error) {
        // File doesn't exist in virtual filesystem - skip it silently
        // console.warn('[processHtmlForWeb] File not found, skipping:', filePath, 'error:', error);
        continue;
      }

      if (!content) {
        // Empty content - skip silently
        // console.warn('[processHtmlForWeb] File is empty, skipping:', filePath);
        continue;
      }

      let blobUrl = '';

      try {
        if (isImage || mimeType.startsWith('image/')) {
          // For image files, content should be base64 encoded
          // Use data URL instead of blob URL for better compatibility
          blobUrl = `data:${mimeType};base64,${content}`;
        } else {
          // For CSS and other text files, decode the base64
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mimeType });
          blobUrl = URL.createObjectURL(blob);
        }

        // Update the map with the blob/data URL
        fileUrls.set(fullUrl, blobUrl);
        // console.log('[processHtmlForWeb] Converted file URL:', fullUrl);
      } catch (conversionError) {
        // console.warn('[processHtmlForWeb] Failed to convert file URL:', fullUrl, conversionError);
        continue;
      }
    } catch (error) {
      // Silently skip files that can't be processed
      // console.warn('[processHtmlForWeb] Unexpected error processing:', fullUrl, error);
    }
  }

  // Third pass: replace all file URLs with blob URLs
  for (const [fullUrl, blobUrl] of fileUrls) {
    if (blobUrl) {
      // Escape special regex characters in the URL
      const escapedUrl = fullUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedUrl, 'g');
      processedHtml = processedHtml.replace(regex, blobUrl);
    }
  }

  return processedHtml;
}
