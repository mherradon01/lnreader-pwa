import React, { useMemo } from 'react';
import { Image, ImageProps, Platform } from 'react-native';
import { proxyUrl } from '@utils/proxyFetch';

/**
 * Image component that automatically proxies cross-origin URLs on web platform
 * to bypass CORS restrictions.
 */
export const ProxiedImage: React.FC<ImageProps> = props => {
  const source = useMemo(() => {
    if (!props.source) {
      return props.source;
    }

    // Handle URI source
    if (
      typeof props.source === 'object' &&
      'uri' in props.source &&
      props.source.uri
    ) {
      const uri = props.source.uri;

      // Only proxy on web platform for http(s) URLs
      if (
        Platform.OS === 'web' &&
        (uri.startsWith('http://') || uri.startsWith('https://'))
      ) {
        return {
          ...props.source,
          uri: proxyUrl(uri),
        };
      }
    }

    return props.source;
  }, [props.source]);

  return <Image {...props} source={source} />;
};

export default ProxiedImage;
