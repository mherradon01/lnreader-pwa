import { Platform } from 'react-native';

/**
 * Rewrites URLs to use the local proxy on web to bypass CORS.
 * On native platforms, returns the URL unchanged.
 */
export const proxyUrl = (url: string): string => {
  if (Platform.OS !== 'web') {
    return url;
  }

  // Don't proxy URLs that are already proxied or are relative/same-origin
  if (url.startsWith('/cors-proxy') || url.startsWith('/github-proxy') || url.startsWith('/')) {
    return url;
  }

  // Proxy raw.githubusercontent.com URLs through local dev server
  if (url.includes('raw.githubusercontent.com')) {
    return url.replace('https://raw.githubusercontent.com', '/github-proxy');
  }

  // For other cross-origin URLs on web, use a generic CORS proxy
  // This handles any external API calls that would be CORS blocked
  try {
    const urlObj = new URL(url);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // If it's a different origin, proxy it through /cors-proxy
    if (currentOrigin && !url.startsWith(currentOrigin)) {
      return `/cors-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // Invalid URL, return as-is
  }

  return url;
};

/**
 * Fetch wrapper that automatically proxies URLs on web to bypass CORS.
 * On web, all external URLs are routed through the /cors-proxy endpoint
 * to avoid CORS issues. On native, uses direct fetch.
 */
export const proxyFetch = (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  // Don't add custom headers that might trigger preflight requests
  // The proxy server will handle CORS headers properly
  return fetch(proxyUrl(url), options);
};
