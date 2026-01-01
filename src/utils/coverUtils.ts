import { Platform } from 'react-native';
import { defaultCover } from '@plugins/helpers/constants';

/**
 * Get a web-safe cover URI.
 * On web, file:// URLs can't be loaded due to browser security restrictions.
 * This utility converts file:// URLs to the default cover for web platform.
 */
export const getWebSafeCoverUri = (coverUri: string | undefined | null): string => {
  if (!coverUri) {
    return defaultCover;
  }

  // On web, file:// URLs are not accessible
  if (Platform.OS === 'web' && coverUri.startsWith('file://')) {
    return defaultCover;
  }

  return coverUri;
};

/**
 * Check if we're running on web platform
 */
export const isWeb = Platform.OS === 'web';
