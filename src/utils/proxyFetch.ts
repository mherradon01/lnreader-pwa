import { Platform } from 'react-native';

/**
 * Rewrites URLs to use the appropriate proxy based on environment.
 * On web in development: uses webpack dev server proxies (/cors-proxy, /github-proxy)
 * On web in production: uses Vercel API routes (/api/cors-proxy, /api/github-proxy)
 * On native platforms: returns the URL unchanged.
 */
export const proxyUrl = (url: string): string => {
  if (Platform.OS !== 'web') {
    return url;
  }

  // Don't proxy URLs that are already proxied or are relative/same-origin
  if (url.startsWith('/api/cors-proxy') || url.startsWith('/api/github-proxy') || 
      url.startsWith('/cors-proxy') || url.startsWith('/github-proxy') || url.startsWith('/')) {
    return url;
  }

  // Determine if we're in a development or production environment
  const isDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  );

  // Proxy raw.githubusercontent.com URLs
  if (url.includes('raw.githubusercontent.com')) {
    // Extract the path after the domain
    const path = url.replace('https://raw.githubusercontent.com/', '');
    // Dev: use path-based proxy, Prod: use query param based proxy
    return isDev ? `/github-proxy/${path}` : `/api/github-proxy?path=${encodeURIComponent(path)}`;
  }

  // For other cross-origin URLs on web, use a generic CORS proxy
  // This handles any external API calls that would be CORS blocked
  try {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    
    // If it's a different origin, proxy it through the appropriate CORS proxy
    if (currentOrigin && !url.startsWith(currentOrigin)) {
      const proxyPath = isDev ? '/cors-proxy' : '/api/cors-proxy';
      return `${proxyPath}?url=${encodeURIComponent(url)}`;
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
  const proxiedUrl = proxyUrl(url);
  
  // Don't add custom headers that might trigger preflight requests
  // The proxy server will handle CORS headers properly
  return fetch(proxiedUrl, options);
};
