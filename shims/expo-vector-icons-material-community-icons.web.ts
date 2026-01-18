// Shim for @expo/vector-icons/MaterialCommunityIcons on web
import React from 'react';
import { Text } from 'react-native';

export default React.forwardRef((props, ref) => {
  const { size = 12, color = 'black', ...rest } = props;

  return React.createElement(
    Text,
    {
      ref,
      style: {
        fontSize: size,
        color,
      },
      ...rest,
    },
    '●',
  );
});
