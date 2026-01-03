/**
 * Reader Assets - Inline assets for the WebView reader
 * 
 * This component provides all necessary CSS and JS for the reader
 * by inlining them directly into the HTML, eliminating the need
 * for external server access on localhost:8001
 */

// These are the file paths that webpack will serve via CopyWebpackPlugin
// For web: assets are copied to /assets/
// For native: assets are in android_asset folder
// For production: assets are bundled into web-build

export const readerAssets = {
  /**
   * Gets script tags that load from /assets URL path
   * Works in both dev and production because webpack's CopyWebpackPlugin
   * copies the android assets to the assets folder
   */
  getScriptTags(baseUrl: string = '/assets'): string {
    return `<script src="${baseUrl}/js/polyfill-onscrollend.js"></script>
<script src="${baseUrl}/js/icons.js"></script>
<script src="${baseUrl}/js/van.js"></script>
<script src="${baseUrl}/js/text-vibe.js"></script>
<script src="${baseUrl}/js/core.js"></script>
<script src="${baseUrl}/js/index.js"></script>`;
  },

  /**
   * Gets style tags that load from /assets URL path
   */
  getStyleTags(baseUrl: string = '/assets'): string {
    return `<link rel="stylesheet" href="${baseUrl}/css/index.css">`;
  },
};

export default readerAssets;
