// Shim for @expo/vector-icons on web
// Provides a minimal icon implementation for web

import React from 'react';
import { Text } from 'react-native';

const createIconSet = (_glyphMap, _fontFamily) => {
  return React.forwardRef((props, ref) => {
    const { size = 12, color = 'black', ...rest } = props;

    return React.createElement(
      Text,
      {
        ref,
        style: {
          fontSize: size,
          color,
          fontFamily,
        },
        ...rest,
      },
      '●',
    );
  });
};

export default createIconSet;
export { createIconSet };
