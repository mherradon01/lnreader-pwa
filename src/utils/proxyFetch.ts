import { Platform } from 'react-native';

/**
 * Gets the configured proxy URL from settings.
 * Returns null if no proxy is configured or proxy is disabled.
 */
export const getProxyUrl = (): string | null => {
  try {
    // Import dynamically to avoid circular dependencies
    const {
      getEffectiveProxyUrl,
    } = require('@hooks/persisted/useProxySettings');
    return getEffectiveProxyUrl();
  } catch {
    return null;
  }
};

/**
 * Gets whether Cloudflare bypass is enabled.
 */
export const getCloudflareBypassEnabled = (): boolean => {
  try {
    const {
      isCloudflareBypassEnabled,
    } = require('@hooks/persisted/useProxySettings');
    return isCloudflareBypassEnabled();
  } catch {
    return false;
  }
};

/**
 * Gets cookies for a specific URL from WebView storage.
 * On web, this returns cookies from the browser's document.cookie and plugin storage.
 */
export const getCookiesForUrl = (_url: string): string => {
  if (Platform.OS !== 'web') {
    return '';
  }

  try {
    // Get cookies from browser
    const browserCookies = document.cookie;

    // Try to get cookies from plugin storage (saved from WebView)
    const {
      store,
      WEBVIEW_LOCAL_STORAGE,
    } = require('@plugins/helpers/storage');

    // Look for stored cookies in plugin storage
    const allKeys = store.getAllKeys();
    const cookieKeys = allKeys.filter(
      (key: string) =>
        key.includes(WEBVIEW_LOCAL_STORAGE) || key.includes('cookie'),
    );

    let storedCookies = '';
    for (const key of cookieKeys) {
      try {
        const value = store.getString(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object') {
            // If it's stored cookie data, extract it
            for (const [cookieName, cookieValue] of Object.entries(parsed)) {
              if (cookieValue && typeof cookieValue === 'string') {
                storedCookies += `${cookieName}=${cookieValue}; `;
              }
            }
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }

    // Combine browser cookies and stored cookies
    return [browserCookies, storedCookies].filter(Boolean).join('; ');
  } catch {
    return '';
  }
};

/**
 * Rewrites URLs to use the configured proxy if one is set.
 * If no proxy is configured, returns the URL unchanged.
 * On native platforms, always returns URL unchanged (native handles CORS differently).
 */
export const proxyUrl = (url: string): string => {
  // On native platforms, don't proxy - native doesn't have CORS issues
  if (Platform.OS !== 'web') {
    return url;
  }

  const configuredProxy = getProxyUrl();

  // If no proxy configured, return URL as-is
  if (!configuredProxy) {
    return url;
  }

  // Don't proxy URLs that are already relative/same-origin
  if (url.startsWith('/')) {
    return url;
  }

  // Don't proxy data: URLs
  if (url.startsWith('data:')) {
    return url;
  }

  // Don't proxy blob: URLs
  if (url.startsWith('blob:')) {
    return url;
  }

  // Don't proxy URLs that are already going through the configured proxy
  if (url.startsWith(configuredProxy)) {
    return url;
  }

  // Route through the configured proxy
  // The proxy should accept a 'url' query parameter
  const separator = configuredProxy.includes('?') ? '&' : '?';
  return `${configuredProxy}${separator}url=${encodeURIComponent(url)}`;
};

/**
 * Fetch wrapper that automatically proxies URLs if a proxy is configured.
 * If no proxy is configured, uses direct fetch.
 * Adds headers to make requests appear as if they're coming from the legitimate site.
 * When Cloudflare bypass is enabled, includes cookies from WebView sessions.
 */
export const proxyFetch = (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  const proxiedUrl = proxyUrl(url);
  const cloudflareBypass = getCloudflareBypassEnabled();

  // Extract the origin from the original URL for proper headers
  let origin = '';
  let referer = '';
  try {
    const urlObj = new URL(url);
    origin = urlObj.origin;
    referer = url;
  } catch {
    // If URL parsing fails, continue without origin/referer
  }

  // Merge custom headers with existing options
  const headers = new Headers(options?.headers);

  // Add User-Agent to mimic a real browser (if not already set)
  if (!headers.has('User-Agent')) {
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
  }

  // Add Referer header to appear as if request is from the site itself
  if (origin && !headers.has('Referer')) {
    headers.set('Referer', referer);
  }

  // Add Origin header for the legitimate site
  if (origin && !headers.has('Origin')) {
    headers.set('Origin', origin);
  }

  // Add Accept header to mimic browser behavior
  if (!headers.has('Accept')) {
    headers.set(
      'Accept',
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    );
  }

  // Add Accept-Language
  if (!headers.has('Accept-Language')) {
    headers.set('Accept-Language', 'en-US,en;q=0.9');
  }

  // Add Accept-Encoding
  if (!headers.has('Accept-Encoding')) {
    headers.set('Accept-Encoding', 'gzip, deflate, br');
  }

  // When Cloudflare bypass is enabled, add cookies from WebView sessions
  if (cloudflareBypass && Platform.OS === 'web' && !headers.has('Cookie')) {
    const cookies = getCookiesForUrl(url);
    if (cookies) {
      headers.set('Cookie', cookies);
    }
  }

  // Merge with original options
  const enhancedOptions: RequestInit = {
    ...options,
    headers,
    // Include credentials for same-origin requests when Cloudflare bypass is enabled
    credentials: cloudflareBypass ? 'include' : options?.credentials,
  };

  return fetch(proxiedUrl, enhancedOptions);
};
