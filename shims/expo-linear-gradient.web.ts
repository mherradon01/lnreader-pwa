// Shim for expo-linear-gradient on web
import React from 'react';
import { View } from 'react-native';

const LinearGradient = React.forwardRef((props, ref) => {
  const { colors, style, ...rest } = props;

  // Simple fallback: use the first color
  const backgroundColor = colors?.[0] || '#fff';

  return React.createElement(View, {
    ref,
    style: [{ backgroundColor }, style],
    ...rest,
  });
});

LinearGradient.displayName = 'LinearGradient';

export default LinearGradient;
export { LinearGradient };
