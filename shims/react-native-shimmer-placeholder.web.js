// Shim for react-native-shimmer-placeholder on web
// This provides a minimal placeholder implementation for web since shimmer effects
// are primarily a React Native feature

import React from 'react';
import { View } from 'react-native';

const ShimmerPlaceholder = React.forwardRef((props, ref) => {
  const { children, style, ...rest } = props;

  return React.createElement(
    View,
    {
      ref,
      style: [{ backgroundColor: '#e0e0e0' }, style],
      ...rest,
    },
    children,
  );
});

ShimmerPlaceholder.displayName = 'ShimmerPlaceholder';

// Create shimmer placeholder factory function
const createShimmerPlaceholder = config => ShimmerPlaceholder;

// Export as default and named exports
export default ShimmerPlaceholder;
export { ShimmerPlaceholder, createShimmerPlaceholder };
