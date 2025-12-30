import { Platform } from 'react-native';

/**
 * Rewrites URLs to use the local proxy on web to bypass CORS.
 * On native platforms, returns the URL unchanged.
 */
export const proxyUrl = (url: string): string => {
  if (Platform.OS !== 'web') {
    return url;
  }

  // Proxy raw.githubusercontent.com URLs through local dev server
  if (url.includes('raw.githubusercontent.com')) {
    return url.replace('https://raw.githubusercontent.com', '/github-proxy');
  }

  return url;
};

/**
 * Fetch wrapper that automatically proxies URLs on web to bypass CORS.
 */
export const proxyFetch = (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  return fetch(proxyUrl(url), options);
};
